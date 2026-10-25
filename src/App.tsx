// Modified by the lenerdz/zmk-studio fork: the Lights, Display, OLED, Files and
// Diagnostics tabs (and the switch between them and the keymap editor), Save and Discard
// that also act on the light maps, Undo and Redo that also act on the Display and OLED
// tabs (with the usual keyboard shortcuts), and a demo keyboard to try the app without
// hardware.
import { AppHeader } from "./AppHeader";

import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "./rpc/logging";

import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import { Dispatch, useCallback, useEffect, useState } from "react";
import { ConnectModal, TransportFactory } from "./ConnectModal";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { connect as gatt_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { connect as serial_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import {
  connect as tauri_ble_connect,
  list_devices as ble_list_devices,
} from "./tauri/ble";
import {
  connect as tauri_serial_connect,
  list_devices as serial_list_devices,
} from "./tauri/serial";
import Keyboard from "./keyboard/Keyboard";
import { UndoRedoContext, useUndoRedo } from "./undoRedo";
import { usePub, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { UnlockModal } from "./UnlockModal";
import { valueAfter } from "./misc/async";
import { AppFooter } from "./AppFooter";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";
import { LedMapsContext } from "./lights/LedMapsContext";
import { LightsTab } from "./lights/LightsTab";
import { useLedMaps } from "./lights/useLedMaps";
import { ViewSwitch } from "./lights/ViewSwitch";
import { AppView, ViewOffers, viewToShow } from "./lights/appViews";
import { createDemoTransport } from "./lights/demo/demoTransport";
import { DisplayContext } from "./display/DisplayContext";
import { DisplayTab } from "./display/DisplayTab";
import { OledTab } from "./oled/OledTab";
import { hasOledLayout } from "./oled/oledLayout";
import { useDisplaySettings } from "./display/useDisplaySettings";
import { FilesTab } from "./backup/FilesTab";
import { DiagnosticsTab } from "./diagnostics/DiagnosticsTab";
import { useFirmwareInfo } from "./diagnostics/useFirmwareInfo";
import { undoShortcut } from "./undoShortcuts";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: object;
  }
}

// Keyboards that live in the browser, to try the app without hardware. They are
// always there in development and in the published app with "?demo" in the
// address. The second one answers like a firmware without the light maps, the
// third like one without the display settings and the fourth like one without the
// live status, to see that the Lights, the Display and the Diagnostics tabs (and
// the live values of the OLED tab) are not offered then.
const DEMO_ENABLED =
  import.meta.env.DEV || new URLSearchParams(window.location.search).has("demo");

const TRANSPORTS: TransportFactory[] = [
  navigator.serial && { label: "USB", connect: serial_connect },
  ...(DEMO_ENABLED
    ? [
        { label: "Demo keyboard", connect: async () => createDemoTransport() },
        {
          label: "Demo keyboard (no light maps)",
          connect: async () => createDemoTransport({ lights: false }),
        },
        {
          label: "Demo keyboard (no display settings)",
          connect: async () => createDemoTransport({ display: false }),
        },
        {
          label: "Demo keyboard (no live status)",
          connect: async () => createDemoTransport({ status: false }),
        },
      ]
    : []),
  ...(navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0
    ? [{ label: "BLE", connect: gatt_connect }]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
        {
          label: "BLE",
          isWireless: true,
          pick_and_connect: {
            connect: tauri_ble_connect,
            list: ble_list_devices,
          },
        },
      ]
    : []),
  ...(window.__TAURI_INTERNALS__
    ? [
        {
          label: "USB",
          pick_and_connect: {
            connect: tauri_serial_connect,
            list: serial_list_devices,
          },
        },
      ]
    : []),
].filter((t) => t !== undefined);

async function listen_for_notifications(
  notification_stream: ReadableStream<Notification>,
  signal: AbortSignal
): Promise<void> {
  let reader = notification_stream.getReader();
  const onAbort = () => {
    reader.cancel();
    reader.releaseLock();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  do {
    let pub = usePub();

    try {
      let { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      console.log("Notification", value);
      pub("rpc_notification", value);

      const subsystem = Object.entries(value).find(
        ([_k, v]) => v !== undefined
      );
      if (!subsystem) {
        continue;
      }

      const [subId, subData] = subsystem;
      const event = Object.entries(subData).find(([_k, v]) => v !== undefined);

      if (!event) {
        continue;
      }

      const [eventName, eventData] = event;
      const topic = ["rpc_notification", subId, eventName].join(".");

      pub(topic, eventData);
    } catch (e) {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
      throw e;
    }
  } while (true);

  signal.removeEventListener("abort", onAbort);
  reader.releaseLock();
  notification_stream.cancel();
}

async function connect(
  transport: RpcTransport,
  setConn: Dispatch<ConnectionState>,
  setConnectedDeviceName: Dispatch<string | undefined>,
  signal: AbortSignal
) {
  let conn = await create_rpc_connection(transport, { signal });

  let details = await Promise.race([
    call_rpc(conn, { core: { getDeviceInfo: true } })
      .then((r) => r?.core?.getDeviceInfo)
      .catch((e) => {
        console.error("Failed first RPC call", e);
        return undefined;
      }),
    valueAfter(undefined, 1000),
  ]);

  if (!details) {
    // TODO: Show a proper toast/alert not using `window.alert`
    window.alert("Failed to connect to the chosen device");
    return;
  }

  listen_for_notifications(conn.notification_readable, signal)
    .then(() => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    })
    .catch((_e) => {
      setConnectedDeviceName(undefined);
      setConn({ conn: null });
    });

  setConnectedDeviceName(details.name);
  setConn({ conn });
}

function App() {
  const [conn, setConn] = useState<ConnectionState>({ conn: null });
  const [connectedDeviceName, setConnectedDeviceName] = useState<
    string | undefined
  >(undefined);
  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [connectionAbort, setConnectionAbort] = useState(new AbortController());

  const [lockState, setLockState] = useState<LockState>(
    LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
  );

  useSub("rpc_notification.core.lockStateChanged", (ls) => {
    setLockState(ls);
  });

  useEffect(() => {
    if (!conn) {
      reset();
      setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    }

    async function updateLockState() {
      if (!conn.conn) {
        return;
      }

      let locked_resp = await call_rpc(conn.conn, {
        core: { getLockState: true },
      });

      setLockState(
        locked_resp.core?.getLockState ||
          LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED
      );
    }

    updateLockState();
  }, [conn, setLockState]);

  const [view, setView] = useState<AppView>("keys");
  const ledMaps = useLedMaps(conn, lockState, doIt);

  // The Lights tab exists only for a keyboard whose firmware has the light maps.
  const lightsAvailable =
    ledMaps.status === "ready" || ledMaps.status === "error";

  // Likewise the Display tab exists only for a keyboard that has the display
  // settings. They need no Save and no Undo: the keyboard keeps every change.
  const display = useDisplaySettings(conn, lockState);
  const displayAvailable =
    display.status === "ready" || display.status === "error";

  // The OLED tab (what the screens show and where) is part of the same
  // settings: it exists when the firmware lists the ids of the OLED layout.
  const oledAvailable =
    display.status === "ready" && hasOledLayout(display.settings);

  // The Diagnostics tab exists only for a keyboard whose firmware tells what it
  // is (get_firmware_info); the Files tab for any keyboard that is connected and
  // unlocked, because the keys of every ZMK Studio keyboard can be saved.
  const firmware = useFirmwareInfo(conn, lockState);
  const unlocked =
    Boolean(conn.conn) &&
    lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
  const offers: ViewOffers = {
    lights: lightsAvailable,
    display: displayAvailable,
    oled: oledAvailable,
    files: unlocked,
    diagnostics: firmware.status === "ready" || firmware.status === "error",
  };

  useEffect(() => {
    const shown = viewToShow(view, offers);
    if (shown !== view) {
      setView(shown);
    }
  }, [
    lightsAvailable,
    displayAvailable,
    oledAvailable,
    unlocked,
    firmware.status,
    view,
  ]);

  // The Display and OLED tabs have a history of their own, because the keyboard
  // keeps what they change without Save: while one of them is open, Undo and Redo
  // (the header and the shortcuts) go to it. The other tabs use the one of the app.
  const onScreens = view === "display" || view === "oled";
  const headerUndo = useCallback(
    async () => (onScreens ? display.undo() : undo()),
    [onScreens, display, undo],
  );
  const headerRedo = useCallback(
    async () => (onScreens ? display.redo() : redo()),
    [onScreens, display, redo],
  );
  const headerCanUndo = onScreens ? display.canUndo : canUndo;
  const headerCanRedo = onScreens ? display.canRedo : canRedo;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = undoShortcut(e, e.target as HTMLElement | null);
      if (!action || !unlocked) {
        return;
      }

      if (action === "undo" ? !headerCanUndo : !headerCanRedo) {
        return;
      }

      e.preventDefault();
      (action === "undo" ? headerUndo() : headerRedo()).catch((error) =>
        console.error(`Failed to ${action}`, error),
      );
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlocked, headerCanUndo, headerCanRedo, headerUndo, headerRedo]);

  // Whether the keymap has changes that are not saved. Unknown (the question
  // failed) counts as yes, so that nothing is left behind.
  const keymapMayHaveChanges = useCallback(async () => {
    if (!conn.conn) {
      return false;
    }

    const resp = await call_rpc(conn.conn, {
      keymap: { checkUnsavedChanges: true },
    });
    return resp.keymap?.checkUnsavedChanges !== false;
  }, [conn]);

  const save = useCallback(() => {
    async function doSave() {
      if (!conn.conn) {
        return;
      }

      // The keymap is written only when it changed: a light edit must not
      // rewrite it.
      if (await keymapMayHaveChanges()) {
        let resp = await call_rpc(conn.conn, { keymap: { saveChanges: true } });
        if (!resp.keymap?.saveChanges || resp.keymap?.saveChanges.err) {
          console.error("Failed to save changes", resp.keymap?.saveChanges);
        }
      }

      try {
        await ledMaps.save();
      } catch (e) {
        console.error("Failed to save the light changes", e);
        window.alert(
          `Failed to save the light changes: ${e instanceof Error ? e.message : e}`
        );
      }
    }

    doSave();
  }, [conn, ledMaps, keymapMayHaveChanges]);

  const discard = useCallback(() => {
    async function doDiscard() {
      if (!conn.conn) {
        return;
      }

      if (await keymapMayHaveChanges()) {
        let resp = await call_rpc(conn.conn, {
          keymap: { discardChanges: true },
        });
        if (!resp.keymap?.discardChanges) {
          console.error("Failed to discard changes", resp);
        }
      }

      try {
        await ledMaps.discard();
      } catch (e) {
        console.error("Failed to discard the light changes", e);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doDiscard();
  }, [conn, ledMaps, keymapMayHaveChanges]);

  const resetSettings = useCallback(() => {
    async function doReset() {
      if (!conn.conn) {
        return;
      }

      let resp = await call_rpc(conn.conn, {
        core: { resetSettings: true },
      });
      if (!resp.core?.resetSettings) {
        console.error("Failed to settings reset", resp);
      }

      reset();
      setConn({ conn: conn.conn });
    }

    doReset();
  }, [conn]);

  const disconnect = useCallback(() => {
    async function doDisconnect() {
      if (!conn.conn) {
        return;
      }

      await conn.conn.request_writable.close();
      connectionAbort.abort("User disconnected");
      setConnectionAbort(new AbortController());
    }

    doDisconnect();
  }, [conn]);

  const onConnect = useCallback(
    (t: RpcTransport) => {
      const ac = new AbortController();
      setConnectionAbort(ac);
      connect(t, setConn, setConnectedDeviceName, ac.signal);
    },
    [setConn, setConnectedDeviceName, setConnectedDeviceName]
  );

  return (
    <ConnectionContext.Provider value={conn}>
      <LockStateContext.Provider value={lockState}>
        <UndoRedoContext.Provider value={doIt}>
          <LedMapsContext.Provider value={ledMaps}>
            <UnlockModal />
            <ConnectModal
              open={!conn.conn}
              transports={TRANSPORTS}
              onTransportCreated={onConnect}
            />
            <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
            <LicenseNoticeModal
              open={showLicenseNotice}
              onClose={() => setShowLicenseNotice(false)}
            />
            <div className="bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] grid-rows-[auto_1fr_auto] overflow-hidden">
              <AppHeader
                connectedDeviceLabel={connectedDeviceName}
                restoresDisplay={display.status === "ready"}
                viewSwitch={
                  <ViewSwitch view={view} onChange={setView} offers={offers} />
                }
                canUndo={headerCanUndo}
                canRedo={headerCanRedo}
                onUndo={headerUndo}
                onRedo={headerRedo}
                onSave={save}
                onDiscard={discard}
                onDisconnect={disconnect}
                onResetSettings={resetSettings}
              />
              {/* The keymap editor stays mounted while the Lights or the Display
                  tab is open, so it keeps its selection and does not ask the
                  keyboard again. */}
              <div className={view === "keys" ? "contents" : "hidden"}>
                <Keyboard />
              </div>
              {view === "lights" && <LightsTab />}
              {view === "display" && (
                <DisplayContext.Provider value={display}>
                  <DisplayTab />
                </DisplayContext.Provider>
              )}
              {view === "oled" && (
                <DisplayContext.Provider value={display}>
                  <OledTab />
                </DisplayContext.Provider>
              )}
              {view === "files" && (
                <DisplayContext.Provider value={display}>
                  <FilesTab keyboardName={connectedDeviceName} onSave={save} />
                </DisplayContext.Provider>
              )}
              {view === "diagnostics" && (
                <DiagnosticsTab
                  firmware={firmware}
                  keyboardName={connectedDeviceName}
                />
              )}
              <AppFooter
                onShowAbout={() => setShowAbout(true)}
                onShowLicenseNotice={() => setShowLicenseNotice(true)}
              />
            </div>
          </LedMapsContext.Provider>
        </UndoRedoContext.Provider>
      </LockStateContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default App;
