/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * A keyboard that lives in the browser, to try the app (and to test it) without
 * a keyboard. It answers the requests of ZMK Studio the way a Corne running
 * lenerdz/corne-zmk does: the keymap and the behaviors are the ones of
 * src/keyboard/corne.mock.ts, the light maps start with the colors of
 * config/led_colors.dtsi and follow the rules of studio_rpc.c in the
 * lenerdz/zmk-rgb-matrix module (live, saved and default copies of each map,
 * the unsaved flag and its notification). The display (OLED) settings follow
 * display_settings.c of the same module (src/display/demo/demoDisplay.ts).
 *
 * This is the logic only; demoTransport.ts connects it to the app.
 */
import type {
  Notification,
  Request,
  RequestResponse,
} from "@zmkfirmware/zmk-studio-ts-client";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import {
  SetDisplaySettingResponse,
  SetLayerBindingResponse,
  SetLayerPropsResponse,
  SetLedColorsResponse,
  type Keymap,
  type Request as KeymapRequest,
  type Response as KeymapResponse,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  corneBehaviors,
  corneKeymap,
  corneLayout,
} from "../../keyboard/corne.mock";
import { DemoDisplay } from "../../display/demo/demoDisplay";
import { DEMO_DEFAULT_COLORS } from "./demoColors";

export interface DemoDeviceOptions {
  /**
   * With false the keyboard behaves like a firmware without the light maps: the
   * requests for them get the "RPC not found" answer. Default true.
   */
  lights?: boolean;
  /**
   * With false the keyboard behaves like a firmware without the display
   * settings: the requests for them get the "RPC not found" answer. Default
   * true.
   */
  display?: boolean;
  /** For tests: answer BUSY to the first n requests that set colors. */
  busyResponses?: number;
  /** For tests: refuse the first n requests that change a display setting. */
  refuseDisplayWrites?: number;
}

export interface DemoDeviceReply {
  response: RequestResponse;
  /** Notifications the keyboard sends after the response. */
  notifications: Notification[];
}

// The limits of the firmware, written here on purpose (and not taken from the
// app): they come from the messages of lenerdz/zmk-studio-messages (the sizes of
// LedMap.colors and SetLedColorsRequest.entries) and from the Corne config.
const SLOT_COUNT = 54;
const MAX_ENTRIES_PER_REQUEST = 16;
const LAYER_IDS = Object.keys(DEMO_DEFAULT_COLORS)
  .map(Number)
  .sort((a, b) => a - b);

const copyMaps = (maps: Readonly<Record<number, readonly number[]>>) =>
  Object.fromEntries(
    Object.entries(maps).map(([id, colors]) => [id, [...colors]]),
  ) as Record<number, number[]>;

const copyKeymap = (keymap: Keymap): Keymap => structuredClone(keymap);

function error(condition: ErrorConditions): RequestResponse {
  return { requestId: 0, meta: { simpleError: condition } };
}

export class DemoDevice {
  private readonly lights: boolean;
  private readonly display: boolean;
  private busyLeft: number;
  private refuseDisplayLeft: number;

  private keymap = copyKeymap(corneKeymap);
  private savedKeymap = copyKeymap(corneKeymap);
  private live = copyMaps(DEMO_DEFAULT_COLORS);
  private saved = copyMaps(DEMO_DEFAULT_COLORS);

  // The display settings are kept by the keyboard as they change: there is no
  // saved copy and no unsaved flag.
  private displaySettings = new DemoDisplay();

  // What the app was told last, so a notification is sent only on a change.
  private notifiedLedUnsaved = false;
  private notifiedKeymapUnsaved = false;

  constructor(options: DemoDeviceOptions = {}) {
    this.lights = options.lights ?? true;
    this.display = options.display ?? true;
    this.busyLeft = options.busyResponses ?? 0;
    this.refuseDisplayLeft = options.refuseDisplayWrites ?? 0;
  }

  /** The value a display setting has now (for tests); undefined if unknown. */
  displayValue(id: number): number | undefined {
    return this.displaySettings.get(id);
  }

  private ledUnsaved(): boolean {
    return LAYER_IDS.some((id) =>
      this.live[id].some((color, slot) => color !== this.saved[id][slot]),
    );
  }

  private keymapUnsaved(): boolean {
    return JSON.stringify(this.keymap) !== JSON.stringify(this.savedKeymap);
  }

  handle(request: Request): DemoDeviceReply {
    const response = this.respond(request);
    response.requestId = request.requestId;

    const notifications: Notification[] = [];

    const keymapUnsaved = this.keymapUnsaved();
    if (keymapUnsaved !== this.notifiedKeymapUnsaved) {
      this.notifiedKeymapUnsaved = keymapUnsaved;
      notifications.push({
        keymap: { unsavedChangesStatusChanged: keymapUnsaved },
      });
    }

    const ledUnsaved = this.ledUnsaved();
    if (ledUnsaved !== this.notifiedLedUnsaved) {
      this.notifiedLedUnsaved = ledUnsaved;
      notifications.push({
        keymap: { unsavedLedChangesStatusChanged: ledUnsaved },
      });
    }

    return { response, notifications };
  }

  private respond(request: Request): RequestResponse {
    if (request.core) {
      return this.core(request.core);
    }
    if (request.behaviors) {
      return this.behaviors(request.behaviors);
    }
    if (request.keymap) {
      return this.keymapRequest(request.keymap);
    }

    return error(ErrorConditions.RPC_NOT_FOUND);
  }

  private core(request: NonNullable<Request["core"]>): RequestResponse {
    if (request.getDeviceInfo !== undefined) {
      return {
        requestId: 0,
        core: {
          getDeviceInfo: {
            name: "Corne (demo)",
            serialNumber: new Uint8Array([0xde, 0x0c, 0x0e]),
          },
        },
      };
    }

    if (request.getLockState !== undefined) {
      return {
        requestId: 0,
        core: { getLockState: LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED },
      };
    }

    if (request.resetSettings !== undefined) {
      this.keymap = copyKeymap(corneKeymap);
      this.savedKeymap = copyKeymap(corneKeymap);
      this.live = copyMaps(DEMO_DEFAULT_COLORS);
      this.saved = copyMaps(DEMO_DEFAULT_COLORS);
      this.displaySettings.restore();
      return { requestId: 0, core: { resetSettings: true } };
    }

    return error(ErrorConditions.RPC_NOT_FOUND);
  }

  private behaviors(
    request: NonNullable<Request["behaviors"]>,
  ): RequestResponse {
    if (request.listAllBehaviors !== undefined) {
      return {
        requestId: 0,
        behaviors: {
          listAllBehaviors: {
            behaviors: Object.keys(corneBehaviors).map(Number),
          },
        },
      };
    }

    if (request.getBehaviorDetails !== undefined) {
      const details = corneBehaviors[request.getBehaviorDetails.behaviorId];
      return details
        ? { requestId: 0, behaviors: { getBehaviorDetails: details } }
        : error(ErrorConditions.GENERIC);
    }

    return error(ErrorConditions.RPC_NOT_FOUND);
  }

  private keymapReply(response: KeymapResponse): RequestResponse {
    return { requestId: 0, keymap: response };
  }

  private keymapRequest(request: KeymapRequest): RequestResponse {
    if (request.getKeymap !== undefined) {
      return this.keymapReply({ getKeymap: copyKeymap(this.keymap) });
    }

    if (request.getPhysicalLayouts !== undefined) {
      return this.keymapReply({
        getPhysicalLayouts: { activeLayoutIndex: 0, layouts: [corneLayout] },
      });
    }

    if (request.checkUnsavedChanges !== undefined) {
      return this.keymapReply({ checkUnsavedChanges: this.keymapUnsaved() });
    }

    if (request.saveChanges !== undefined) {
      this.savedKeymap = copyKeymap(this.keymap);
      return this.keymapReply({ saveChanges: { ok: true } });
    }

    if (request.discardChanges !== undefined) {
      this.keymap = copyKeymap(this.savedKeymap);
      return this.keymapReply({ discardChanges: true });
    }

    if (request.setLayerBinding !== undefined) {
      const { layerId, keyPosition, binding } = request.setLayerBinding;
      const layer = this.keymap.layers.find((l) => l.id === layerId);

      let result = SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK;
      if (!layer || keyPosition >= layer.bindings.length) {
        result = SetLayerBindingResponse.SET_LAYER_BINDING_RESP_INVALID_LOCATION;
      } else if (!binding || !corneBehaviors[binding.behaviorId]) {
        result = SetLayerBindingResponse.SET_LAYER_BINDING_RESP_INVALID_BEHAVIOR;
      } else {
        layer.bindings[keyPosition] = binding;
      }
      return this.keymapReply({ setLayerBinding: result });
    }

    if (request.setLayerProps !== undefined) {
      const { layerId, name } = request.setLayerProps;
      const layer = this.keymap.layers.find((l) => l.id === layerId);
      if (!layer) {
        return this.keymapReply({
          setLayerProps: SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_INVALID_ID,
        });
      }
      layer.name = name;
      return this.keymapReply({
        setLayerProps: SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK,
      });
    }

    if (this.lights) {
      const lights = this.lightsRequest(request);
      if (lights) {
        return lights;
      }
    }

    if (this.display) {
      const display = this.displayRequest(request);
      if (display) {
        return display;
      }
    }

    // What the firmware answers for a request it does not have: the demo has no
    // layer moves, additions or removals (the layer count is fixed).
    return error(ErrorConditions.RPC_NOT_FOUND);
  }

  /** The requests of the display settings; undefined when `request` is not one. */
  private displayRequest(request: KeymapRequest): RequestResponse | undefined {
    if (request.getDisplayInfo !== undefined) {
      return this.keymapReply({
        getDisplayInfo: { settings: this.displaySettings.list() },
      });
    }

    if (request.setDisplaySetting !== undefined) {
      const { id, value } = request.setDisplaySetting;

      if (this.refuseDisplayLeft > 0) {
        this.refuseDisplayLeft--;
        return this.keymapReply({
          setDisplaySetting:
            SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_INVALID_VALUE,
        });
      }

      return this.keymapReply({
        setDisplaySetting: this.displaySettings.set(id, value),
      });
    }

    if (request.restoreDisplayDefaults !== undefined) {
      return this.keymapReply({
        restoreDisplayDefaults: { settings: this.displaySettings.restore() },
      });
    }

    return undefined;
  }

  /** The requests of the light maps; undefined when `request` is not one. */
  private lightsRequest(request: KeymapRequest): RequestResponse | undefined {
    if (request.getLedInfo !== undefined) {
      return this.keymapReply({
        getLedInfo: {
          slotCount: SLOT_COUNT,
          layerIds: LAYER_IDS,
          unsavedChanges: this.ledUnsaved(),
        },
      });
    }

    if (request.getLedMap !== undefined) {
      const colors = this.live[request.getLedMap];
      return colors
        ? this.keymapReply({
            getLedMap: { layerId: request.getLedMap, colors: [...colors] },
          })
        : error(ErrorConditions.GENERIC);
    }

    if (request.setLedColors !== undefined) {
      // The firmware cannot decode a request with more entries than the
      // protocol allows (the nanopb array has a fixed size).
      if (request.setLedColors.entries.length > MAX_ENTRIES_PER_REQUEST) {
        return error(ErrorConditions.MSG_DECODE_FAILED);
      }

      return this.keymapReply({
        setLedColors: this.setColors(request.setLedColors),
      });
    }

    if (request.saveLedChanges !== undefined) {
      this.saved = copyMaps(this.live);
      return this.keymapReply({ saveLedChanges: { ok: true } });
    }

    if (request.discardLedChanges !== undefined) {
      this.live = copyMaps(this.saved);
      return this.keymapReply({ discardLedChanges: true });
    }

    if (request.restoreLedDefaults !== undefined) {
      const layerId = request.restoreLedDefaults;
      if (!this.live[layerId]) {
        return error(ErrorConditions.GENERIC);
      }
      this.live[layerId] = [...DEMO_DEFAULT_COLORS[layerId]];
      return this.keymapReply({
        restoreLedDefaults: { layerId, colors: [...this.live[layerId]] },
      });
    }

    return undefined;
  }

  private setColors(
    request: NonNullable<KeymapRequest["setLedColors"]>,
  ): SetLedColorsResponse {
    const colors = this.live[request.layerId];
    if (!colors) {
      return SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_LAYER;
    }

    if (request.entries.some((entry) => entry.slot >= SLOT_COUNT)) {
      return SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_SLOT;
    }

    if (this.busyLeft > 0) {
      this.busyLeft--;
      return SetLedColorsResponse.SET_LED_COLORS_RESP_BUSY;
    }

    for (const { slot, rgb } of request.entries) {
      colors[slot] = rgb & 0xffffff;
    }

    return SetLedColorsResponse.SET_LED_COLORS_RESP_OK;
  }
}
