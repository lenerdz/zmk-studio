/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the OLED screens of zmk-nice-oled can show, as the OLED tab knows it:
 * the widgets that have a place of their own (the ones the firmware lets the app
 * move and switch), the pictures of the right screen, and the things that only a
 * new build can add. The firmware decides which of the widgets a keyboard has
 * (it lists the ones its build has); this file only describes them.
 *
 * Every widget is described by a few parts (a sprite, some text, a rectangle, a
 * line) placed the way the firmware draws them, relative to the position the
 * setting gives. The drawing is a sample reading, not the live state of the
 * keyboard: the app has no way to ask the screen what it shows.
 */
import {
  FONTS,
  SPRITES,
  type FontName,
  type SpriteName,
} from "./assets/sprites";
import { union, type Rect } from "./oledGeometry";
import { OLED_ID } from "./oledIds";

export type ScreenId = "left" | "right";

export type Part =
  | { type: "sprite"; sprite: SpriteName; x: number; y: number }
  | { type: "text"; font: FontName; text: string; x: number; y: number }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | {
      type: "line";
      points: ReadonlyArray<readonly [number, number]>;
      width: number;
    };

/** The pixels a part covers, relative to the position of its widget. */
export function partBox(part: Part): Rect {
  switch (part.type) {
    case "sprite": {
      const { width, height } = SPRITES[part.sprite];
      return { x: part.x, y: part.y, w: width, h: height };
    }
    case "text": {
      const { advance, lineHeight } = FONTS[part.font];
      return {
        x: part.x,
        y: part.y,
        w: advance * part.text.length,
        h: lineHeight,
      };
    }
    case "rect":
      return { x: part.x, y: part.y, w: part.w, h: part.h };
    case "line": {
      // A line of width 1 covers the pixels it passes; a wider one reaches
      // half its width to each side (one pixel less to the right and below
      // when the width is even).
      const before = Math.floor(part.width / 2);
      const after = Math.ceil(part.width / 2) - 1;
      const xs = part.points.map(([x]) => x);
      const ys = part.points.map(([, y]) => y);
      const x = Math.min(...xs) - before;
      const y = Math.min(...ys) - before;

      return {
        x,
        y,
        w: Math.max(...xs) + after + 1 - x,
        h: Math.max(...ys) + after + 1 - y,
      };
    }
  }
}

/** The pixels all the parts cover; an empty box for no part. */
export function partsBox(parts: Part[]): Rect {
  return union(parts.map(partBox)) ?? { x: 0, y: 0, w: 0, h: 0 };
}

/** What a widget can be drawn from: the position and the picture of the build. */
export interface ArtContext {
  /** The position the firmware was built with (the build tells the variant). */
  defaultX: number;
  defaultY: number;
  /** The kind of the picture of the right screen. */
  kind: number;
}

export interface WidgetIds {
  /** The switch: the widget is drawn when it is not 0. The toast has none. */
  show?: number;
  x: number;
  y: number;
  /** The picture of the right screen only: which one (see ANIMATION_KINDS). */
  kind?: number;
  /** The picture of the right screen only: the time of one cycle, in ms. */
  ms?: number;
}

export interface WidgetDef {
  key: string;
  screen: ScreenId;
  label: string;
  /** What the widget shows, in a sentence or two. */
  hint: string;
  /**
   * origin: the position is the corner of the first thing drawn.
   * picture: the picture of the right screen, whose position is on the landscape
   * canvas of the panel (see pictureRect in oledGeometry.ts).
   */
  placement: "origin" | "picture";
  ids: WidgetIds;
  /** The widget as a sample reading. */
  art: (context: ArtContext) => Part[];
  /** What the build has to enable for the keyboard to have the widget. */
  needs: string;
}

const text = (font: FontName, value: string, x = 0, y = 0): Part => ({
  type: "text",
  font,
  text: value,
  x,
  y,
});

const sprite = (name: SpriteName, x = 0, y = 0): Part => ({
  type: "sprite",
  sprite: name,
  x,
  y,
});

/** The kinds of the picture of the right screen, by the value of the setting. */
export interface AnimationKind {
  value: number;
  sprite: SpriteName;
  label: string;
  /** What the picture is, in a few words. */
  hint: string;
  /** The time of one cycle with the speed of the animation itself; null for a still image. */
  cycleMs: number | null;
  /** The option of the build that picks this one when the app does not. */
  option: string;
}

export const ANIMATION_KINDS: readonly AnimationKind[] = [
  {
    value: 0,
    sprite: "crystal",
    label: "Gem",
    hint: "A gem (a crystal) that turns.",
    cycleMs: 960,
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_GEM",
  },
  {
    value: 1,
    sprite: "cat",
    label: "Cat",
    hint: "A flying cat with a rainbow trail, like the Nyan Cat.",
    cycleMs: 960,
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_CAT",
  },
  {
    value: 2,
    sprite: "head",
    label: "Head",
    hint: "A pixel head whose hair and face change from frame to frame.",
    cycleMs: 4800,
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_HEAD",
  },
  {
    value: 3,
    sprite: "spaceman",
    label: "Spaceman",
    hint: "An astronaut floating in space.",
    cycleMs: 4800,
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_SPACEMAN",
  },
  {
    value: 4,
    sprite: "pokemon",
    label: "Pokemon",
    hint: "Winged emblems that turn into one another. It has 48 frames, the longest of the animations.",
    cycleMs: 10000,
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_POKEMON",
  },
  {
    value: 5,
    sprite: "vim",
    label: "Vim",
    hint: "The Vim logo, a still image as tall as the whole canvas (160 pixels).",
    cycleMs: null,
    option: "CONFIG_NICE_OLED_WIDGET_STATIC_IMAGE_PERIPHERAL_VIM",
  },
  {
    value: 6,
    sprite: "vip_marcos",
    label: "VIPs Marcos",
    hint: "A still image with the words VIPs and Marcos (140 pixels tall).",
    cycleMs: null,
    option: "CONFIG_NICE_OLED_WIDGET_STATIC_IMAGE_PERIPHERAL_VIP_MARCOS",
  },
];

/** The kind with this value; the first one for a value this app does not know. */
export function animationKind(value: number): AnimationKind {
  return (
    ANIMATION_KINDS.find((kind) => kind.value === value) ?? ANIMATION_KINDS[0]
  );
}

/** The time of one cycle the screen plays: the setting, or the animation's own. */
export function cycleMsOf(kind: AnimationKind, ms: number): number | null {
  if (kind.cycleMs === null) {
    return null;
  }
  if (ms <= 0) {
    return kind.cycleMs;
  }
  // The firmware counts anything from 1 to 99 as 100.
  return Math.max(ms, 100);
}

/**
 * The frame of a sprite that has `frames` of them, for the frame of the clock of
 * the right screen. A sprite that is not an animation has one frame, and every
 * clock tick shows that one.
 */
export function spriteFrame(frames: number, frame: number): number {
  return frames > 1 ? ((frame % frames) + frames) % frames : 0;
}

/** The output of the left screen is drawn as the USB icon, which is the anchor of its position. */
const OUTPUT_ART = (): Part[] => [sprite("usb")];

/**
 * The battery of the left screen has two looks. The text with the level of both
 * halves (the build's central battery mode, which puts it at y = 19) and the
 * big percentage of the other builds.
 */
const L_BATTERY_ART = ({ defaultY }: ArtContext): Part[] =>
  defaultY === 19 ? [text("unscii8", "85  90")] : [text("pixel16", "85%")];

/**
 * The profile marks have two looks, told by the position the build has: small
 * dots (31 x 3, a mark of 3 x 3 on the selected one) or five boxes of 12 x 12
 * (the build's "big" variant, which puts it at y = 129).
 */
const L_PROFILE_ART = ({ defaultY }: ArtContext): Part[] =>
  defaultY === 129
    ? [
        sprite("profile_active", 0, 0),
        sprite("profile", 14, 0),
        sprite("profile", 28, 0),
        sprite("profile", 42, 0),
        sprite("profile", 56, 0),
      ]
    : [sprite("profiles"), { type: "rect", x: 0, y: 0, w: 3, h: 3 }];

/**
 * The gauge and the needle of a reading in the middle of the range. The needle
 * turns around a point 12 pixels from the left edge of the gauge and 20 pixels
 * under its top, from 5 to 25 pixels away from it.
 */
const GAUGE_ART = (): Part[] => [
  sprite("gauge"),
  {
    type: "line",
    points: [
      [12, 15],
      [12, -5],
    ],
    width: 1,
  },
];

/**
 * The grid of the graph and the end of the line of the readings. The firmware
 * starts the line 35 pixels left of the grid, so only the last readings are on
 * the grid, and the part of the grid the screen shows is its left half.
 */
const GRAPH_ART = (): Part[] => [
  sprite("grid"),
  {
    type: "line",
    points: [
      [2, 26],
      [9, 14],
      [16, 21],
      [24, 6],
      [31, 12],
    ],
    width: 2,
  },
];

/**
 * The widgets that have a place of their own, in the order the editor lists
 * them: the right screen first (the one with the picture), then the left one.
 */
export const WIDGETS: readonly WidgetDef[] = [
  {
    key: "r_anim",
    screen: "right",
    label: "Animation or image",
    hint: "The picture of the right screen: an animation that plays all the time, or a still image. It is larger than the screen, so only a part of it shows. Drag it to choose which part, and pick the picture in the gallery.",
    placement: "picture",
    ids: {
      show: OLED_ID.R_ANIM_SHOW,
      x: OLED_ID.R_ANIM_X,
      y: OLED_ID.R_ANIM_Y,
      kind: OLED_ID.R_ANIM_KIND,
      ms: OLED_ID.R_ANIM_MS,
    },
    art: ({ kind }) => [sprite(animationKind(kind).sprite)],
    needs:
      "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL=y or CONFIG_NICE_OLED_WIDGET_STATIC_IMAGE_PERIPHERAL=y in the conf of both halves (corne.conf), and CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_SMART_BATTERY=n",
  },
  {
    key: "r_battery",
    screen: "right",
    label: "Battery",
    hint: "The battery level of the right half, as a percentage.",
    placement: "origin",
    ids: {
      show: OLED_ID.R_BATTERY_SHOW,
      x: OLED_ID.R_BATTERY_X,
      y: OLED_ID.R_BATTERY_Y,
    },
    art: () => [text("pixel16", "85%")],
    needs: "always present",
  },
  {
    key: "r_link",
    screen: "right",
    label: "Link with the left half",
    hint: "The Bluetooth icon of the right half: filled while it is connected to the left half, crossed out when there is no signal.",
    placement: "origin",
    ids: {
      show: OLED_ID.R_LINK_SHOW,
      x: OLED_ID.R_LINK_X,
      y: OLED_ID.R_LINK_Y,
    },
    art: () => [sprite("bt")],
    needs: "always present",
  },
  {
    key: "r_toast",
    screen: "right",
    label: "Light toast",
    hint: "The notice that appears for a moment when the lights change (effect, brightness, on and off). It is drawn over the other widgets and is not on the screen the rest of the time. Turn it on and off, and choose how long it stays, in the Display tab.",
    placement: "origin",
    ids: { x: OLED_ID.R_TOAST_X, y: OLED_ID.R_TOAST_Y },
    art: () => [text("pixel8", "EFFECT 4"), text("pixel8", "RAINBOW", 0, 8)],
    needs: "CONFIG_NICE_OLED_WIDGET_LED_TOAST=y in corne_right.conf",
  },
  {
    key: "l_output",
    screen: "left",
    label: "Output (USB or Bluetooth)",
    hint: "Where the keys go: the USB icon, or the Bluetooth icon of the selected profile (connected, no signal or not paired). The USB icon is the anchor of the position, and the Bluetooth icons keep their distance from it.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_OUTPUT_SHOW,
      x: OLED_ID.L_OUTPUT_X,
      y: OLED_ID.L_OUTPUT_Y,
    },
    art: OUTPUT_ART,
    needs: "always present",
  },
  {
    key: "l_battery",
    screen: "left",
    label: "Battery",
    hint: "The battery of the keyboard. With the central battery mode of the build it is a line with the level of the left and of the right half, otherwise it is the percentage of the left half.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_BATTERY_SHOW,
      x: OLED_ID.L_BATTERY_X,
      y: OLED_ID.L_BATTERY_Y,
    },
    art: L_BATTERY_ART,
    needs: "always present",
  },
  {
    key: "l_profile",
    screen: "left",
    label: "Bluetooth profiles",
    hint: "The Bluetooth profiles as marks, with a filled mark on the selected one.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_PROFILE_SHOW,
      x: OLED_ID.L_PROFILE_X,
      y: OLED_ID.L_PROFILE_Y,
    },
    art: L_PROFILE_ART,
    needs: "always present",
  },
  {
    key: "l_profile_num",
    screen: "left",
    label: "Profile number",
    hint: "The number of the selected Bluetooth profile.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_PROFILE_NUM_SHOW,
      x: OLED_ID.L_PROFILE_NUM_X,
      y: OLED_ID.L_PROFILE_NUM_Y,
    },
    art: () => [text("pixel8", "1")],
    needs: "always present",
  },
  {
    key: "l_layer",
    screen: "left",
    label: "Layer",
    hint: "The name of the active layer, in capitals and cut at nine letters (Layer 0, Layer 1 and so on for a layer without a name). A long name runs off the screen, so keep it short or move it left.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_LAYER_SHOW,
      x: OLED_ID.L_LAYER_X,
      y: OLED_ID.L_LAYER_Y,
    },
    art: () => [text("pixel16", "QWERTY")],
    needs: "CONFIG_NICE_OLED_WIDGET_LAYER=y in corne_left.conf",
  },
  {
    key: "l_wpm_gauge",
    screen: "left",
    label: "Speedometer",
    hint: "An arc with a needle that follows the typing speed. The needle turns around a point of the arc, so it moves with it.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_WPM_GAUGE_SHOW,
      x: OLED_ID.L_WPM_GAUGE_X,
      y: OLED_ID.L_WPM_GAUGE_Y,
    },
    art: GAUGE_ART,
    needs: "CONFIG_NICE_OLED_WIDGET_WPM_SPEEDOMETER=y in corne_left.conf",
  },
  {
    key: "l_wpm_number",
    screen: "left",
    label: "Typing speed (number)",
    hint: "The typing speed as a number, in words per minute.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_WPM_NUMBER_SHOW,
      x: OLED_ID.L_WPM_NUMBER_X,
      y: OLED_ID.L_WPM_NUMBER_Y,
    },
    art: () => [text("pixel12", "42", 2, 0)],
    needs: "CONFIG_NICE_OLED_WIDGET_WPM_NUMBER=y in corne_left.conf",
  },
  {
    key: "l_wpm_graph",
    screen: "left",
    label: "Typing speed (graph)",
    hint: "A graph of the typing speed over the last readings, drawn on a grid. The grid is wider than the screen: the screen shows its left half.",
    placement: "origin",
    ids: {
      show: OLED_ID.L_WPM_GRAPH_SHOW,
      x: OLED_ID.L_WPM_GRAPH_X,
      y: OLED_ID.L_WPM_GRAPH_Y,
    },
    art: GRAPH_ART,
    needs:
      "CONFIG_NICE_OLED_WIDGET_WPM_GRAPH=y in corne_left.conf, without the Luna dog, the Bongo cat or the fixed modifier indicators",
  },
];

/** The widgets of one screen, in the order of the editor. */
export function widgetsOf(screen: ScreenId): WidgetDef[] {
  return WIDGETS.filter((widget) => widget.screen === screen);
}

export const SCREEN_TITLES: Record<ScreenId, string> = {
  left: "Left screen",
  right: "Right screen",
};

export const SCREEN_ROLES: Record<ScreenId, string> = {
  left: "The central half: the one on USB",
  right: "The peripheral half: it connects to the left one",
};

/**
 * What zmk-nice-oled can show that the app cannot move or switch. Each one is a
 * choice made when the firmware is built, in the conf files of this repository.
 */
export interface BuildOnlyFeature {
  key: string;
  screen: ScreenId | "both";
  label: string;
  hint: string;
  option: string;
}

export const BUILD_ONLY_FEATURES: readonly BuildOnlyFeature[] = [
  {
    key: "luna",
    screen: "left",
    label: "Luna, the dog",
    hint: "A dog animation that follows the typing speed (one of the speed widgets). It takes the place of the speed graph.",
    option: "CONFIG_NICE_OLED_WIDGET_WPM_LUNA",
  },
  {
    key: "bongo_cat",
    screen: "left",
    label: "Bongo cat",
    hint: "A cat animation that follows the typing speed (one of the speed widgets). It takes the place of the speed graph.",
    option: "CONFIG_NICE_OLED_WIDGET_WPM_BONGO_CAT",
  },
  {
    key: "responsive_bongo_cat",
    screen: "left",
    label: "Responsive bongo cat",
    hint: "A bongo cat that taps with each key that is pressed and goes back to rest after half a second without keys.",
    option: "CONFIG_NICE_OLED_WIDGET_RESPONSIVE_BONGO_CAT",
  },
  {
    key: "hid_indicators",
    screen: "left",
    label: "HID indicators",
    hint: "The state of Caps Lock as the computer reports it, with a Luna or a Bongo cat animation if the build asks for it.",
    option: "CONFIG_NICE_OLED_WIDGET_HID_INDICATORS",
  },
  {
    key: "modifiers",
    screen: "left",
    label: "Modifier indicators",
    hint: "Ctrl, Shift, Alt and Gui, shown in real time (icons or letters, in a box, a row or a column).",
    option: "CONFIG_NICE_OLED_WIDGET_MODIFIERS_INDICATORS",
  },
  {
    key: "raw_hid",
    screen: "left",
    label: "Data from the computer",
    hint: "Time, volume, keyboard layout, weather and the media player, sent by an application of the computer over Raw HID.",
    option: "CONFIG_NICE_OLED_WIDGET_RAW_HID",
  },
  {
    key: "sleep_art",
    screen: "both",
    label: "Sleep art",
    hint: "A picture shown when the keyboard goes idle or to sleep (CONFIG_NICE_OLED_SHOW_SLEEP_ART_ON_IDLE or CONFIG_NICE_OLED_SHOW_SLEEP_ART_ON_SLEEP).",
    option: "CONFIG_NICE_OLED_SHOW_SLEEP_ART_ON_IDLE",
  },
  {
    key: "smart_battery",
    screen: "right",
    label: "Smart battery animation",
    hint: "An experimental animation that depends on the battery. The upstream README does not recommend it for a build that wants to be stable. It replaces the picture of the gallery.",
    option: "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_SMART_BATTERY",
  },
];
