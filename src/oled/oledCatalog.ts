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
 * setting gives. The drawing is a sample reading, unless the context carries
 * the live status of the keyboard (the preview of the OLED tab): then the
 * widgets that show the battery, the link, the output, the profile, the layer
 * and the typing speed are drawn from it, the way the firmware draws them from
 * the same readings. The app cannot ask the screen what it shows; it asks the
 * keyboard what the screen draws from.
 */
import type { LiveReading } from "../live/liveStatusPoller";
import {
  FONTS,
  SPRITES,
  type FontName,
  type SpriteName,
} from "./assets/sprites";
import { union, type Rect } from "./oledGeometry";
import { OLED_ID } from "./oledIds";
import { turnedSize } from "./pictureView";

export type ScreenId = "left" | "right";

export type Part =
  | {
      type: "sprite";
      sprite: SpriteName;
      x: number;
      y: number;
      /** Quarter turns clockwise (the picture of the right screen can be turned). */
      turn?: number;
    }
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
      const { w, h } = turnedSize({ w: width, h: height }, part.turn ?? 0);
      return { x: part.x, y: part.y, w, h };
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
  /** The quarter turns clockwise of the picture of the right screen (0 when missing). */
  turn?: number;
  /** What the keyboard says right now; without it the widgets are drawn from a sample reading. */
  live?: LiveReading;
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
  /** The picture of the right screen only: the quarter turns clockwise, 0 to 3. */
  rot?: number;
  /** The picture of the right screen only: how it mixes with the widgets (see MIX_ADD and MIX_INVERT). */
  mix?: number;
  /** The picture of the right screen only: x and y of the piece that shows, a byte each. */
  cropXY?: number;
  /** The picture of the right screen only: width and height of the piece that shows, a byte each. */
  cropWH?: number;
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

const sprite = (name: SpriteName, x = 0, y = 0, turn = 0): Part => ({
  type: "sprite",
  sprite: name,
  x,
  y,
  ...(turn === 0 ? {} : { turn }),
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
  /**
   * The option of the build that picks this one when the app does not; null for
   * the pictures that only the OLED layout has (they are picked at run time).
   */
  option: string | null;
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
    value: 7,
    sprite: "equalizer",
    label: "Equalizer",
    hint: "Eight bars of a sound equalizer that rise and fall, each with a mark that drops slowly behind it.",
    cycleMs: 1200,
    option: null,
  },
  {
    value: 8,
    sprite: "radar",
    label: "Radar",
    hint: "A radar sweep with a trail that fades, and three blips that light up as it goes by.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 9,
    sprite: "heartbeat",
    label: "Heartbeat",
    hint: "The trace of a heart monitor, scrolling down and fading as it gets old.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 10,
    sprite: "rain",
    label: "Digital rain",
    hint: "Streaks that fall down the whole screen, bright at the head and flickering behind it. It is as tall as the screen.",
    cycleMs: 3200,
    option: null,
  },
  {
    value: 11,
    sprite: "cube",
    label: "Wire cube",
    hint: "A wire cube that turns, with the edges at the back dotted.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 12,
    sprite: "atom",
    label: "Atom",
    hint: "A nucleus with three orbits and an electron on each.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 13,
    sprite: "helix",
    label: "Helix",
    hint: "The two strands of a DNA helix turning around their axis, with the rungs between them. It is as tall as the screen.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 14,
    sprite: "warp",
    label: "Warp",
    hint: "Stars that fly out from the middle, faster and longer as they get near.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 15,
    sprite: "sonar",
    label: "Sonar",
    hint: "Rings that spread from the middle and fade.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 16,
    sprite: "bounce",
    label: "Bouncing ball",
    hint: "A ball that bounces, squashes at the floor and has a shadow.",
    cycleMs: 1200,
    option: null,
  },
  {
    value: 17,
    sprite: "flame",
    label: "Flame",
    hint: "A fire that flickers.",
    cycleMs: 1200,
    option: null,
  },
  {
    value: 18,
    sprite: "mountains",
    label: "Mountains",
    hint: "A night sky with a moon, and three ridges of mountains. A still image as tall as the screen.",
    cycleMs: null,
    option: null,
  },
  {
    value: 19,
    sprite: "skyline",
    label: "Skyline",
    hint: "A city at night, with the windows that are lit and a few stars. A still image as tall as the screen.",
    cycleMs: null,
    option: null,
  },
  {
    value: 20,
    sprite: "circuit",
    label: "Circuit",
    hint: "The tracks of a circuit board, with a chip. A still image as tall as the screen.",
    cycleMs: null,
    option: null,
  },
  {
    value: 23,
    sprite: "keyboard",
    label: "Keyboard",
    hint: "The two halves of a Corne, as seen from above. A still image.",
    cycleMs: null,
    option: null,
  },
  {
    value: 26,
    sprite: "waterfall",
    label: "Waterfall",
    hint: "Water that falls over a ledge between two cliffs, with mist and a pool that ripples. It is as tall as the screen.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 27,
    sprite: "lava",
    label: "Lava lamp",
    hint: "A lava lamp: blobs of wax that rise, stretch and sink again in a glass with a base. It is as tall as the screen.",
    cycleMs: 3200,
    option: null,
  },
  {
    value: 28,
    sprite: "lightning",
    label: "Storm",
    hint: "A storm: a cloud, slanting rain, and two bolts that flash one after the other.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 29,
    sprite: "snow",
    label: "Snowfall",
    hint: "Snow that falls past a pine tree on a hill, under a moon.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 30,
    sprite: "jellyfish",
    label: "Jellyfish",
    hint: "A jellyfish that pulses, with tentacles that wave and a few specks that float up.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 31,
    sprite: "tetris",
    label: "Falling blocks",
    hint: "Pieces that fall down a board of eight columns, turning on the way, like the screen saver of a falling blocks game (they pass each other and leave at the bottom).",
    cycleMs: 2000,
    option: null,
  },
  {
    value: 32,
    sprite: "pong",
    label: "Pong",
    hint: "A game of pong played from top to bottom: two paddles that follow the ball, the net and the score.",
    cycleMs: 1500,
    option: null,
  },
  {
    value: 33,
    sprite: "invaders",
    label: "Invaders",
    hint: "A formation of aliens that marches from side to side, a cannon that shoots one down and a saucer that crosses the top.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 34,
    sprite: "pacman",
    label: "Chomper",
    hint: "A disc with a mouth eats a row of dots chasing a scared ghost, and a ghost chases it on the next row.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 35,
    sprite: "life",
    label: "Game of Life",
    hint: "Conway's Game of Life on a small field: a pulsar, a pentadecathlon, a toad, a beacon, blinkers and some still lifes; everything is back where it started after 30 generations, which is the loop.",
    cycleMs: 3000,
    option: null,
  },
  {
    value: 36,
    sprite: "plasma",
    label: "Plasma",
    hint: "The plasma of the old demos: waves that add up, drawn with an ordered dither.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 37,
    sprite: "spiral",
    label: "Spiral",
    hint: "A spiral with three arms that turns, inside a ring.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 38,
    sprite: "newton",
    label: "Newton's cradle",
    hint: "Newton's cradle: the ball on one side swings in, the one on the other side swings out and back, and the first answers.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 39,
    sprite: "gears",
    label: "Gears",
    hint: "Two gears that mesh and turn.",
    cycleMs: 1000,
    option: null,
  },
  {
    value: 40,
    sprite: "hourglass",
    label: "Hourglass",
    hint: "An hourglass: the sand runs down through the neck and, at the end of every cycle, the glass turns over end to end.",
    cycleMs: 2000,
    option: null,
  },
  {
    value: 41,
    sprite: "windmill",
    label: "Windmill",
    hint: "A windmill whose sails turn under clouds that drift across and come back around.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 42,
    sprite: "fireworks",
    label: "Fireworks",
    hint: "Rockets that rise and burst into sparks that fall; three bursts take turns, so there is always something going off.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 43,
    sprite: "ufo",
    label: "Flying saucer",
    hint: "A flying saucer that hovers over a field and lifts a cow in its beam, then puts it back.",
    cycleMs: 1600,
    option: null,
  },
  {
    value: 44,
    sprite: "eye",
    label: "Eye",
    hint: "An eye that looks around in a figure of eight and blinks once per cycle.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 45,
    sprite: "keywave",
    label: "Key wave",
    hint: "A wave of key presses that sweeps across a field of keycaps.",
    cycleMs: 2400,
    option: null,
  },
  {
    value: 49,
    sprite: "moon_cat",
    label: "Moon cat",
    hint: "A cat sitting on a wall in front of the full moon, seen from behind. A still image.",
    cycleMs: null,
    option: null,
  },
  {
    value: 51,
    sprite: "planet",
    label: "Planet",
    hint: "A ringed planet with a small moon, among the stars. A still image.",
    cycleMs: null,
    option: null,
  },
];

/**
 * The kinds that were taken out of the firmware: still images that nobody used
 * (the Vim logo, the VIPs Marcos words and 22 of the new ones). A retired kind
 * keeps its number, so the kinds after it do not move, but it has no picture in
 * the keyboard, which refuses it as the value of the picture, and the app does
 * not offer it. The same list as kp_oled_anim_kind_retired() in the
 * lenerdz/zmk-rgb-matrix module (include/zmk/display_settings.h).
 */
export const RETIRED_ANIMATION_KINDS: ReadonlySet<number> = new Set([
  5, 6, 21, 22, 24, 25, 46, 47, 48, 50, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
  62, 63, 64, 65,
]);

/** Whether the value is a kind that was retired (see RETIRED_ANIMATION_KINDS). */
export function isRetiredKind(value: number): boolean {
  return RETIRED_ANIMATION_KINDS.has(value);
}

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

/**
 * Where the Bluetooth icons of the left screen are, from the USB icon, which is
 * the anchor of the position: the options of the build give the USB icon x 0 and
 * y 34, the Bluetooth icon x 4 and y 32 and the icon of a profile that is not
 * paired x -1 and y 32 (CONFIG_NICE_OLED_WIDGET_OUTPUT_*_CUSTOM_X and _Y).
 */
const BT_FROM_USB = { x: 4, y: -2 };
const UNBONDED_FROM_USB = { x: -1, y: -2 };

/**
 * The output of the left screen. The USB icon is the anchor of its position, and
 * the icon of a Bluetooth profile keeps its distance from it. Like the firmware,
 * it draws the USB icon while the keys go to USB and, otherwise, the state of the
 * selected profile: connected, paired but without signal, or not paired.
 */
export const OUTPUT_ART = ({ live }: ArtContext): Part[] => {
  if (!live || live.output === "usb") {
    return [sprite("usb")];
  }

  if (live.bleState === "open") {
    return [sprite("bt_unbonded", UNBONDED_FROM_USB.x, UNBONDED_FROM_USB.y)];
  }

  return [
    sprite(
      live.bleState === "connected" ? "bt" : "bt_no_signal",
      BT_FROM_USB.x,
      BT_FROM_USB.y,
    ),
  ];
};

/**
 * What the screen writes for a battery: a level it has not received yet is 0,
 * because the screen starts with 0 in every battery.
 */
const shownLevel = (level: number | null): number => level ?? 0;

/**
 * The battery of the right screen. It is the level of that half, which the
 * left half only knows when the right one has reported it: without it the
 * preview cannot say, and writes dashes.
 */
export const R_BATTERY_ART = ({ live }: ArtContext): Part[] => [
  text(
    "pixel16",
    live
      ? live.batteryPeripheral === null
        ? "--%"
        : `${live.batteryPeripheral}%`
      : "85%",
  ),
];

/** The link of the right screen: filled while the left half is connected, crossed out when it is not. */
export const R_LINK_ART = ({ live }: ArtContext): Part[] => [
  sprite(live && !live.peripheralConnected ? "bt_no_signal" : "bt"),
];

/**
 * The battery of the left screen has two looks. The text with the level of both
 * halves (the build's central battery mode, which puts it at y = 19) and the
 * big percentage of the other builds.
 */
export const L_BATTERY_ART = ({ defaultY, live }: ArtContext): Part[] => {
  const central = live ? shownLevel(live.batteryCentral) : 85;
  const peripheral = live ? shownLevel(live.batteryPeripheral) : 90;

  return defaultY === 19
    ? [text("unscii8", `${central}  ${peripheral}`)]
    : [text("pixel16", `${central}%`)];
};

/** How many Bluetooth profiles the marks draw (CONFIG_BT_MAX_PAIRED of ZMK). */
const PROFILE_COUNT = 5;

/** The selected profile, held inside the marks (the first one without a reading). */
const selectedProfile = (live?: LiveReading): number =>
  Math.min(Math.max(live?.bleProfile ?? 0, 0), PROFILE_COUNT - 1);

/**
 * The profile marks have two looks, told by the position the build has: small
 * dots (31 x 3, a mark of 3 x 3 on the selected one, 7 pixels from the one
 * before) or five boxes of 12 x 12, 14 pixels apart (the build's "big" variant,
 * which puts it at y = 129).
 */
export const L_PROFILE_ART = ({ defaultY, live }: ArtContext): Part[] => {
  const selected = selectedProfile(live);

  return defaultY === 129
    ? Array.from({ length: PROFILE_COUNT }, (_, i) =>
        sprite(i === selected ? "profile_active" : "profile", i * 14, 0),
      )
    : [
        sprite("profiles"),
        { type: "rect", x: selected * 7, y: 0, w: 3, h: 3 },
      ];
};

/** The number of the selected profile, from 1. */
export const L_PROFILE_NUM_ART = ({ live }: ArtContext): Part[] => [
  text("pixel8", String(selectedProfile(live) + 1)),
];

/** The name of a layer the way the screen writes it: in capitals, cut at nine letters. */
export function layerLabel(index: number, name: string): string {
  return name === "" ? `Layer ${index}` : name.slice(0, 9).toUpperCase();
}

/** The name of the layer of the left screen. */
export const L_LAYER_ART = ({ live }: ArtContext): Part[] => [
  text("pixel16", live ? layerLabel(live.layerIndex, live.layerName) : "QWERTY"),
];

/**
 * The line of the needle for a speed, relative to the gauge: the firmware turns
 * it around a point 12 pixels from the left edge of the gauge and 20 under its
 * top, from 5 to 25 pixels away from it, from 225 degrees (the speed 0) to 315
 * (the maximum, 100 words per minute unless the build changes it). It does the
 * sums the way wpm.c does them, in single precision for the angles and with
 * the pixels cut the way a C cast cuts them: at the middle of the range the
 * needle starts at y 16, because the sine of that angle is a hair short of -1
 * and 5 times it is cut to -4. Without a reading the needle is in the middle.
 */
export function needlePoints(
  wpm: number,
): [[number, number], [number, number]] {
  const f = Math.fround;
  const max = 100;
  const value = Math.min(Math.max(Math.trunc(wpm), 0), max);
  const degrees = f(225 + f(f(value / max) * 90));
  const radians = f(degrees * (3.14159 / 180));
  const radius = f(25.45585);
  const at = (length: number): [number, number] => [
    12 + Math.trunc(length * Math.cos(radians)),
    20 + Math.trunc(length * Math.sin(radians)),
  ];

  return [at(5), at(radius)];
}

/** The gauge and the needle, in the middle of the range unless the context has a reading. */
export const GAUGE_ART = ({ live }: ArtContext): Part[] => [
  sprite("gauge"),
  { type: "line", points: needlePoints(live ? live.wpm : 50), width: 1 },
];

/**
 * The line of the graph for the last readings of the speed, relative to the
 * grid. The firmware starts the line 35 pixels left of the grid, so only the
 * last five readings are on the grid (the part of the grid the screen shows is
 * its left half), and those are the ones drawn here; the position is the one
 * the build gives the grid (x -1), where the pixels are cut. Each reading is
 * held to the range 0 to 100 and scaled to 32 pixels. The sample is the one of
 * a keyboard that has been used a little.
 */
const SAMPLE_WPM = [0, 0, 0, 0, 0, 20, 58, 36, 83, 64];

export function graphPoints(
  history: readonly number[],
  gridX = -1,
): Array<[number, number]> {
  return history.slice(-5).map((reading, j): [number, number] => {
    const i = history.length - 5 + j;
    const x = Math.trunc(gridX - 35 + i * 7.4) - gridX;
    const value = Math.min(Math.max(reading, 0), 100);

    return [x, 32 - Math.floor((value * 32) / 100)];
  });
}

/** The grid of the graph and the end of the line of the readings. */
export const GRAPH_ART = ({ defaultX, live }: ArtContext): Part[] => [
  sprite("grid"),
  {
    type: "line",
    points: graphPoints(live ? live.wpmHistory : SAMPLE_WPM, defaultX),
    width: 2,
  },
];

/** The typing speed as a number, which the screen moves right by the digits it lacks. */
export const L_WPM_NUMBER_ART = ({ live }: ArtContext): Part[] => {
  if (!live) {
    return [text("pixel12", "42", 2, 0)];
  }

  const dx = live.wpm < 10 ? 5 : live.wpm < 100 ? 2 : 0;
  return [text("pixel12", String(live.wpm), dx, 0)];
};

/**
 * The widgets that have a place of their own, in the order the editor lists
 * them: the right screen first (the one with the picture), then the left one.
 */
export const WIDGETS: readonly WidgetDef[] = [
  {
    key: "r_anim",
    screen: "right",
    label: "Animation or image",
    hint: "The picture of the right screen: an animation that plays all the time, or a still image. The big ones are larger than the screen, so only a part of them shows: drag the picture to choose which part. It can be turned by quarter turns and cut to a piece, and a widget over it can be shown in reverse so that it stays readable. Pick the picture in the gallery.",
    placement: "picture",
    ids: {
      show: OLED_ID.R_ANIM_SHOW,
      x: OLED_ID.R_ANIM_X,
      y: OLED_ID.R_ANIM_Y,
      kind: OLED_ID.R_ANIM_KIND,
      ms: OLED_ID.R_ANIM_MS,
      rot: OLED_ID.R_ANIM_ROT,
      mix: OLED_ID.R_ANIM_MIX,
      cropXY: OLED_ID.R_ANIM_CROP_XY,
      cropWH: OLED_ID.R_ANIM_CROP_WH,
    },
    art: ({ kind, turn }) => [
      sprite(animationKind(kind).sprite, 0, 0, turn ?? 0),
    ],
    needs:
      "CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_SMART_BATTERY=n (the default), with the same CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_* choice in both halves (corne.conf)",
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
    art: R_BATTERY_ART,
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
    art: R_LINK_ART,
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
    art: L_PROFILE_NUM_ART,
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
    art: L_LAYER_ART,
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
    art: L_WPM_NUMBER_ART,
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
