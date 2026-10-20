/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The display settings of the demo keyboard (src/lights/demo/demoDevice.ts): the
 * ids, ranges and defaults of display_settings.c in the lenerdz/zmk-rgb-matrix
 * module, written here on purpose (and not taken from the app) so that a test
 * that passes against the demo notices when the app and the firmware disagree.
 */
import { SetDisplaySettingResponse } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { DisplaySettingData } from "../displayProtocol";

/** The settings of a Corne built from lenerdz/corne-zmk. */
export const DEMO_DISPLAY_SETTINGS: ReadonlyArray<DisplaySettingData> = [
  // 1 and 2: the contrast of the left and of the right screen
  { id: 1, value: 128, min: 0, max: 255, defaultValue: 128 },
  { id: 2, value: 128, min: 0, max: 255, defaultValue: 128 },
  // 3: when the screens turn off (0 never, 1 only on battery, 2 always)
  { id: 3, value: 0, min: 0, max: 2, defaultValue: 0 },
  // 4: seconds without activity before they turn off; the minimum is the idle
  // time of ZMK (CONFIG_ZMK_IDLE_TIMEOUT, 30 s)
  { id: 4, value: 60, min: 30, max: 3600, defaultValue: 60 },
  // 5 and 6: the toast of the lights on the right screen, and its duration
  { id: 5, value: 1, min: 0, max: 1, defaultValue: 1 },
  { id: 6, value: 1500, min: 500, max: 5000, defaultValue: 1500 },
];

export class DemoDisplay {
  private settings: DisplaySettingData[] = DemoDisplay.fresh();

  private static fresh(): DisplaySettingData[] {
    return DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s }));
  }

  /** The settings, as a copy. */
  list(): DisplaySettingData[] {
    return this.settings.map((s) => ({ ...s }));
  }

  /** The value of a setting (undefined when there is no such setting). */
  get(id: number): number | undefined {
    return this.settings.find((s) => s.id === id)?.value;
  }

  set(id: number, value: number): SetDisplaySettingResponse {
    const setting = this.settings.find((s) => s.id === id);
    if (!setting) {
      return SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_INVALID_ID;
    }

    if (value < setting.min || value > setting.max) {
      return SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_INVALID_VALUE;
    }

    setting.value = value;
    return SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_OK;
  }

  /** Every setting back to what the firmware was built with. */
  restore(): DisplaySettingData[] {
    this.settings = DemoDisplay.fresh();
    return this.list();
  }
}
