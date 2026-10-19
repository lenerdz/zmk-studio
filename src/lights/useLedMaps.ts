/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Keeps the light maps of the connected keyboard: loads them when the keyboard
 * is unlocked, applies edits (each one can be undone with the app's undo),
 * saves and discards, and follows the "unsaved light changes" notification.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { produce } from "immer";
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type { ConnectionState } from "../rpc/ConnectionContext";
import type { DoCallback } from "../undoRedo";
import { useSub } from "../usePubSub";
import {
  discardLedChanges,
  fetchLedInfo,
  fetchLedMap,
  restoreLedDefaults,
  saveLedChanges,
  sendLedColors,
  type LedEntry,
} from "./ledProtocol";
import {
  INACTIVE_LED_MAPS,
  type LedMapsApi,
  type LedMapsStatus,
} from "./LedMapsContext";

interface LedMapsState {
  status: LedMapsStatus;
  error?: string;
  slotCount: number;
  layerIds: number[];
  maps: Record<number, number[]>;
  unsaved: boolean;
}

const INITIAL: LedMapsState = {
  status: "idle",
  slotCount: 0,
  layerIds: [],
  maps: {},
  unsaved: false,
};

/** The entries that make `current` become `target`. */
export function changedEntries(
  current: number[],
  target: number[],
  slotCount: number,
): LedEntry[] {
  const entries: LedEntry[] = [];
  for (let slot = 0; slot < slotCount; slot++) {
    if (current[slot] !== target[slot]) {
      entries.push({ slot, rgb: target[slot] });
    }
  }
  return entries;
}

async function loadAll(conn: RpcConnection): Promise<LedMapsState> {
  const info = await fetchLedInfo(conn);
  if (!info) {
    return { ...INITIAL, status: "unsupported" };
  }

  const maps: Record<number, number[]> = {};
  for (const layerId of info.layerIds) {
    maps[layerId] = await fetchLedMap(conn, layerId);
  }

  return {
    status: "ready",
    slotCount: info.slotCount,
    layerIds: info.layerIds,
    maps,
    unsaved: info.unsavedChanges,
  };
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * @param connection the connection state of the app. A new object (even with the
 *   same connection) makes the maps load again, like the rest of the app does
 *   after a discard or a settings reset.
 * @param doIt the app's undo/redo runner
 */
export function useLedMaps(
  connection: ConnectionState,
  lockState: LockState,
  doIt: ((callback: DoCallback) => Promise<void>) | null,
): LedMapsApi {
  const [state, setState] = useState<LedMapsState>(INITIAL);

  // The state lives in a ref too: the operations below run one after the other
  // and each one must see what the previous one did, before React renders.
  const stateRef = useRef<LedMapsState>(INITIAL);
  const connRef = useRef<RpcConnection | null>(connection.conn);
  const doItRef = useRef(doIt);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  connRef.current = connection.conn;
  doItRef.current = doIt;

  const update = useCallback((change: (s: LedMapsState) => LedMapsState) => {
    stateRef.current = change(stateRef.current);
    setState(stateRef.current);
  }, []);

  // Edits, saves and discards run in the order they were asked for.
  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const result = queueRef.current.then(task, task);
    queueRef.current = result.catch(() => undefined);
    return result;
  }, []);

  useEffect(() => {
    const conn = connection.conn;

    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      update(() => INITIAL);
      return;
    }

    let ignore = false;

    async function start(conn: RpcConnection) {
      // The first load shows "loading". A reload (after a discard or a settings
      // reset) keeps showing the maps it has until the new ones arrive, so the
      // Lights tab does not blink away.
      update((s) => (s.status === "ready" ? s : { ...INITIAL, status: "loading" }));

      try {
        const loaded = await loadAll(conn);
        if (!ignore) {
          update(() => loaded);
        }
      } catch (e) {
        console.error("Failed to load the light maps", e);
        if (!ignore) {
          update(() => ({ ...INITIAL, status: "error", error: errorText(e) }));
        }
      }
    }

    start(conn);

    return () => {
      ignore = true;
    };
  }, [connection, lockState, update]);

  useSub("rpc_notification.keymap.unsavedLedChangesStatusChanged", (unsaved) =>
    update((s) => ({ ...s, unsaved: Boolean(unsaved) })),
  );

  const applyEntries = useCallback(
    async (layerId: number, entries: LedEntry[]) => {
      const conn = connRef.current;
      if (!conn) {
        throw new Error("Not connected");
      }

      await sendLedColors(conn, layerId, entries);

      update(
        produce((draft: LedMapsState) => {
          const colors = draft.maps[layerId];
          if (colors) {
            for (const { slot, rgb } of entries) {
              colors[slot] = rgb;
            }
          }
        }),
      );
    },
    [update],
  );

  const paint = useCallback(
    (layerId: number, entries: LedEntry[]) =>
      enqueue(async () => {
        const current = stateRef.current.maps[layerId];
        if (!current) {
          return;
        }

        // Only the LEDs that really change.
        const wanted = entries.filter((e) => current[e.slot] !== e.rgb);
        if (wanted.length === 0) {
          return;
        }
        const previous = wanted.map((e) => ({
          slot: e.slot,
          rgb: current[e.slot],
        }));

        const run = doItRef.current;
        if (!run) {
          await applyEntries(layerId, wanted);
          return;
        }

        await run(async () => {
          await applyEntries(layerId, wanted);
          return async () => {
            await applyEntries(layerId, previous);
          };
        });
      }),
    [applyEntries, enqueue],
  );

  const restoreDefaults = useCallback(
    (layerId: number) =>
      enqueue(async () => {
        const before = stateRef.current.maps[layerId];
        if (!before) {
          return;
        }
        const previous = [...before];

        const restore = async () => {
          const conn = connRef.current;
          if (!conn) {
            throw new Error("Not connected");
          }

          const colors = await restoreLedDefaults(conn, layerId);
          update(
            produce((draft: LedMapsState) => {
              draft.maps[layerId] = colors;
            }),
          );
          return colors;
        };

        const run = doItRef.current;
        if (!run) {
          await restore();
          return;
        }

        await run(async () => {
          const colors = await restore();
          return async () => {
            await applyEntries(
              layerId,
              changedEntries(colors, previous, stateRef.current.slotCount),
            );
          };
        });
      }),
    [applyEntries, enqueue, update],
  );

  const save = useCallback(
    () =>
      enqueue(async () => {
        const conn = connRef.current;
        if (!conn || !stateRef.current.unsaved) {
          return;
        }

        await saveLedChanges(conn);
        update((s) => ({ ...s, unsaved: false }));
      }),
    [enqueue, update],
  );

  const discard = useCallback(
    () =>
      enqueue(async () => {
        const conn = connRef.current;
        if (!conn || !stateRef.current.unsaved) {
          return;
        }

        await discardLedChanges(conn);
        const loaded = await loadAll(conn);
        update(() => loaded);
      }),
    [enqueue, update],
  );

  return useMemo<LedMapsApi>(
    () => ({
      ...INACTIVE_LED_MAPS,
      status: state.status,
      error: state.error,
      slotCount: state.slotCount,
      layerIds: state.layerIds,
      maps: state.maps,
      unsaved: state.unsaved,
      paint,
      restoreDefaults,
      save,
      discard,
    }),
    [state, paint, restoreDefaults, save, discard],
  );
}
