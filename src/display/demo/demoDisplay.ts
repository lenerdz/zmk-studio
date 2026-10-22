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

/**
 * The settings of one widget of the OLED layout: the switch (on), the x and the
 * y, which the build gives, and then the ones the widget adds. They go from -160
 * to 320, the range display_settings.c gives.
 */
function oledWidget(
  first: number,
  x: number,
  y: number,
  extra: DisplaySettingData[] = [],
): DisplaySettingData[] {
  return [
    { id: first, value: 1, min: 0, max: 1, defaultValue: 1 },
    { id: first + 1, value: x, min: -160, max: 320, defaultValue: x },
    { id: first + 2, value: y, min: -160, max: 320, defaultValue: y },
    ...extra,
  ];
}

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

  // The OLED layout (CONFIG_KEYPAW_OLED_LAYOUT), from 16 on, in blocks of eight:
  // +0 whether the widget is drawn, +1 its x, +2 its y; the picture adds +3 the
  // kind (0 gem, 1 cat, 2 head, 3 spaceman, 4 pokemon, 5 vim, 6 vip marcos, then
  // the 19 pictures of the lenerdz/zmk-nice-oled fork, 7 to 25) and +4 the time of
  // a cycle in ms (0 is the one of the animation), and then, in a block of its
  // own (112 to 115, listed right after the time of a cycle, as the firmware
  // does), the quarter turns clockwise (0 to 3), how it mixes with the widgets
  // (0 add, 1 invert), and the piece that shows: x + 256 y and width + 256
  // height, two bytes each (a width or a height of 0 is the whole picture). The
  // positions
  // are the ones of this repository's build (the nice!oled widget options).
  // Right screen: the picture (the cat), the battery, the link, the toast.
  ...oledWidget(16, 18, -18, [
    { id: 19, value: 1, min: 0, max: 25, defaultValue: 1 },
    { id: 20, value: 0, min: 0, max: 60000, defaultValue: 0 },
    { id: 112, value: 0, min: 0, max: 3, defaultValue: 0 },
    { id: 113, value: 1, min: 0, max: 1, defaultValue: 1 },
    { id: 114, value: 0, min: 0, max: 65535, defaultValue: 0 },
    { id: 115, value: 0, min: 0, max: 65535, defaultValue: 0 },
  ]),
  ...oledWidget(24, 0, 50),
  ...oledWidget(32, 4, 32),
  // The toast has no switch: the position only (5 turns it on and off)
  ...oledWidget(40, 0, 143).slice(1),
  // Left screen: the output, the battery (the text with both halves, which the
  // build puts at y = 19, above what the screen shows), the profile marks, the
  // profile number, the layer, the speedometer, the speed number, the graph.
  ...oledWidget(48, 0, 34),
  ...oledWidget(56, 0, 19),
  ...oledWidget(64, 0, 137),
  ...oledWidget(72, 25, 32),
  ...oledWidget(80, 0, 146),
  ...oledWidget(88, 0, 70),
  ...oledWidget(96, 0, 75),
  ...oledWidget(104, -1, 95),
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
