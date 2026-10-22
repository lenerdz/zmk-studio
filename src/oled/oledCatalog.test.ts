/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { FONTS, SPRITES } from "./assets/sprites";
import {
  ANIMATION_KINDS,
  BUILD_ONLY_FEATURES,
  WIDGETS,
  animationKind,
  cycleMsOf,
  partBox,
  partsBox,
  spriteFrame,
  widgetsOf,
  type ArtContext,
} from "./oledCatalog";
import { FIRST_OLED_ID, OLED_ID } from "./oledIds";

const context = (over: Partial<ArtContext> = {}): ArtContext => ({
  defaultX: 0,
  defaultY: 0,
  kind: 0,
  ...over,
});

describe("the ids", () => {
  it("are all from 16 on, so they do not meet the ids of the Display tab", () => {
    for (const id of Object.values(OLED_ID)) {
      expect(id).toBeGreaterThanOrEqual(FIRST_OLED_ID);
    }
  });

  it("are all different", () => {
    const ids = Object.values(OLED_ID);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("come in blocks of eight: the switch, x and y of a widget together", () => {
    for (const { ids } of WIDGETS) {
      const first = ids.show ?? ids.x - 1;

      expect(first % 8).toBe(0);
      expect(ids.x).toBe(first + 1);
      expect(ids.y).toBe(first + 2);
      if (ids.kind !== undefined) {
        expect(ids.kind).toBe(first + 3);
      }
      if (ids.ms !== undefined) {
        expect(ids.ms).toBe(first + 4);
      }
    }
  });

  it("add four to the picture, in a block of their own: turn, mix and the two of the crop", () => {
    const picture = WIDGETS.find((w) => w.key === "r_anim")!;

    expect([
      picture.ids.rot,
      picture.ids.mix,
      picture.ids.cropXY,
      picture.ids.cropWH,
    ]).toEqual([112, 113, 114, 115]);
    expect(112 % 8).toBe(0);

    // No other widget has them
    for (const widget of WIDGETS.filter((w) => w.key !== "r_anim")) {
      expect(widget.ids.rot).toBeUndefined();
      expect(widget.ids.mix).toBeUndefined();
      expect(widget.ids.cropXY).toBeUndefined();
      expect(widget.ids.cropWH).toBeUndefined();
    }
  });
});

describe("the widgets", () => {
  it("are twelve: four on the right screen and eight on the left one", () => {
    expect(WIDGETS).toHaveLength(12);
    expect(widgetsOf("right").map((w) => w.key)).toEqual([
      "r_anim",
      "r_battery",
      "r_link",
      "r_toast",
    ]);
    expect(widgetsOf("left").map((w) => w.key)).toEqual([
      "l_output",
      "l_battery",
      "l_profile",
      "l_profile_num",
      "l_layer",
      "l_wpm_gauge",
      "l_wpm_number",
      "l_wpm_graph",
    ]);
  });

  it("have a key of their own and an id of the setting that is not shared", () => {
    expect(new Set(WIDGETS.map((w) => w.key)).size).toBe(WIDGETS.length);

    const ids = WIDGETS.flatMap((w) =>
      [
        w.ids.show,
        w.ids.x,
        w.ids.y,
        w.ids.kind,
        w.ids.ms,
        w.ids.rot,
        w.ids.mix,
        w.ids.cropXY,
        w.ids.cropWH,
      ].filter((id): id is number => id !== undefined),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("have no switch only for the toast (the Display tab turns it on and off)", () => {
    expect(
      WIDGETS.filter((w) => w.ids.show === undefined).map((w) => w.key),
    ).toEqual(["r_toast"]);
  });

  it("have a drawing with at least one part of a known size", () => {
    for (const widget of WIDGETS) {
      for (const kind of [0, 1, 5, 7, 25]) {
        const box = partsBox(widget.art(context({ kind })));

        expect(box.w).toBeGreaterThan(0);
        expect(box.h).toBeGreaterThan(0);
      }
    }
  });

  it("say what the build needs, and a hint of what the widget shows", () => {
    for (const widget of WIDGETS) {
      expect(widget.hint.length).toBeGreaterThan(20);
      expect(widget.needs.length).toBeGreaterThan(5);
    }
  });

  it("have no emoji in what they say (the app uses icons)", () => {
    const everything = JSON.stringify([
      WIDGETS,
      ANIMATION_KINDS,
      BUILD_ONLY_FEATURES,
    ]);

    expect(everything).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("the size of a part", () => {
  it("is the size of the sprite", () => {
    expect(partBox({ type: "sprite", sprite: "usb", x: 3, y: 4 })).toEqual({
      x: 3,
      y: 4,
      w: 20,
      h: 11,
    });
  });

  it("is the sprite turned: a quarter of a turn swaps the sides", () => {
    const usb = { type: "sprite", sprite: "usb", x: 3, y: 4 } as const;

    expect(partBox({ ...usb, turn: 0 })).toEqual({ x: 3, y: 4, w: 20, h: 11 });
    expect(partBox({ ...usb, turn: 1 })).toEqual({ x: 3, y: 4, w: 11, h: 20 });
    expect(partBox({ ...usb, turn: 2 })).toEqual({ x: 3, y: 4, w: 20, h: 11 });
    expect(partBox({ ...usb, turn: 3 })).toEqual({ x: 3, y: 4, w: 11, h: 20 });
  });

  it("is the advance of the font for each character, by the line of the font", () => {
    // "85%" in the 16 pixel font: 3 characters of 8 pixels, a line of 13
    expect(
      partBox({ type: "text", font: "pixel16", text: "85%", x: 0, y: 0 }),
    ).toEqual({ x: 0, y: 0, w: 24, h: 13 });
    expect(
      partBox({ type: "text", font: "pixel8", text: "EFFECT 4", x: 0, y: 0 }),
    ).toEqual({ x: 0, y: 0, w: 32, h: 7 });
  });

  it("covers the pixels a line passes, widened by its width", () => {
    expect(
      partBox({
        type: "line",
        points: [
          [12, 15],
          [12, -5],
        ],
        width: 1,
      }),
    ).toEqual({ x: 12, y: -5, w: 1, h: 21 });
    expect(
      partBox({
        type: "line",
        points: [
          [2, 26],
          [31, 6],
        ],
        width: 2,
      }),
    ).toEqual({ x: 1, y: 5, w: 31, h: 22 });
  });

  it("is a rectangle for a rectangle", () => {
    expect(partBox({ type: "rect", x: 1, y: 2, w: 3, h: 3 })).toEqual({
      x: 1,
      y: 2,
      w: 3,
      h: 3,
    });
  });

  it("is the union for several parts, and empty for none", () => {
    expect(
      partsBox([
        { type: "sprite", sprite: "gauge", x: 0, y: 0 },
        {
          type: "line",
          points: [
            [12, 15],
            [12, -5],
          ],
          width: 1,
        },
      ]),
    ).toEqual({ x: 0, y: -5, w: 33, h: 21 });
    expect(partsBox([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});

describe("how the widgets are drawn", () => {
  const art = (key: string, ctx: Partial<ArtContext> = {}) => {
    const widget = WIDGETS.find((w) => w.key === key)!;
    return partsBox(widget.art(context(ctx)));
  };

  it("draws the picture as big as the kind says (an animation is 68 x 69)", () => {
    expect(art("r_anim", { kind: 1 })).toEqual({ x: 0, y: 0, w: 68, h: 69 });
    expect(art("r_anim", { kind: 5 })).toEqual({ x: 0, y: 0, w: 68, h: 160 });
    expect(art("r_anim", { kind: 6 })).toEqual({ x: 0, y: 0, w: 68, h: 140 });
  });

  it("draws the pictures of the fork 32 pixels wide, from 32 to 128 tall", () => {
    expect(art("r_anim", { kind: 7 })).toEqual({ x: 0, y: 0, w: 32, h: 64 });
    expect(art("r_anim", { kind: 8 })).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(art("r_anim", { kind: 10 })).toEqual({ x: 0, y: 0, w: 32, h: 128 });
  });

  it("draws the picture turned, with the sides swapped by each quarter of a turn", () => {
    expect(art("r_anim", { kind: 1, turn: 1 })).toEqual({ x: 0, y: 0, w: 69, h: 68 });
    expect(art("r_anim", { kind: 1, turn: 2 })).toEqual({ x: 0, y: 0, w: 68, h: 69 });
    expect(art("r_anim", { kind: 10, turn: 3 })).toEqual({ x: 0, y: 0, w: 128, h: 32 });
  });

  it("does not turn the other widgets", () => {
    expect(art("r_battery", { turn: 1 })).toEqual(art("r_battery"));
    expect(art("l_wpm_gauge", { turn: 3 })).toEqual(art("l_wpm_gauge"));
  });

  it("draws the battery text of the left screen by the build's position", () => {
    // The central battery mode puts it at y = 19 and writes both halves
    expect(art("l_battery", { defaultY: 19 })).toEqual({
      x: 0,
      y: 0,
      w: 48,
      h: 9,
    });
    expect(art("l_battery", { defaultY: 50 })).toEqual({
      x: 0,
      y: 0,
      w: 24,
      h: 13,
    });
  });

  it("draws the profile marks small, or big when the build puts them at y = 129", () => {
    expect(art("l_profile", { defaultY: 137 })).toEqual({
      x: 0,
      y: 0,
      w: 31,
      h: 3,
    });
    // five boxes of 12, 14 apart
    expect(art("l_profile", { defaultY: 129 })).toEqual({
      x: 0,
      y: 0,
      w: 68,
      h: 12,
    });
  });

  it("draws the speedometer with the needle sticking out of the top and the bottom", () => {
    expect(art("l_wpm_gauge")).toEqual({ x: 0, y: -5, w: 33, h: 21 });
  });

  it("draws the graph on its grid, and the speed number 2 pixels in", () => {
    expect(art("l_wpm_graph")).toEqual({ x: 0, y: 0, w: 67, h: 33 });
    expect(art("l_wpm_number")).toEqual({ x: 2, y: 0, w: 12, h: 10 });
  });

  it("draws the toast in two lines, 8 pixels apart", () => {
    expect(art("r_toast")).toEqual({ x: 0, y: 0, w: 32, h: 15 });
  });
});

describe("the pictures of the right screen", () => {
  it("are 26, from 0, in the order of the firmware: the seven of nice!oled and the 19 of the fork", () => {
    expect(ANIMATION_KINDS.map((k) => [k.value, k.sprite])).toEqual([
      [0, "crystal"],
      [1, "cat"],
      [2, "head"],
      [3, "spaceman"],
      [4, "pokemon"],
      [5, "vim"],
      [6, "vip_marcos"],
      [7, "equalizer"],
      [8, "radar"],
      [9, "heartbeat"],
      [10, "rain"],
      [11, "cube"],
      [12, "atom"],
      [13, "helix"],
      [14, "warp"],
      [15, "sonar"],
      [16, "bounce"],
      [17, "flame"],
      [18, "mountains"],
      [19, "skyline"],
      [20, "circuit"],
      [21, "alien"],
      [22, "heart"],
      [23, "keyboard"],
      [24, "pulsar"],
      [25, "rocket"],
    ]);
  });

  it("have a label and a hint of their own", () => {
    expect(new Set(ANIMATION_KINDS.map((k) => k.label)).size).toBe(
      ANIMATION_KINDS.length,
    );
    expect(new Set(ANIMATION_KINDS.map((k) => k.sprite)).size).toBe(
      ANIMATION_KINDS.length,
    );
    for (const kind of ANIMATION_KINDS) {
      expect(kind.label.length).toBeGreaterThan(2);
      expect(kind.hint.length).toBeGreaterThan(15);
    }
  });

  it("are 32 pixels wide, from 7 on: the width of what the panel shows", () => {
    for (const kind of ANIMATION_KINDS.filter((k) => k.value >= 7)) {
      const info = SPRITES[kind.sprite];

      expect(info.width).toBe(32);
      expect([32, 64, 128]).toContain(info.height);
    }
  });

  it("play only when the sprite has more than one frame", () => {
    for (const kind of ANIMATION_KINDS) {
      const info = SPRITES[kind.sprite];

      expect(kind.cycleMs !== null).toBe(info.frames > 1);
      expect(info.kind).toBe(kind.cycleMs === null ? "still" : "animation");
    }
  });

  it("have a sprite with as many frames as the kind plays", () => {
    const frames = ANIMATION_KINDS.map((k) => SPRITES[k.sprite].frames);

    expect(frames).toEqual([
      16, 8, 16, 20, 48, 1, 1, 16, 24, 16, 32, 16, 24, 16, 24, 16, 24, 16,
      1, 1, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it("have a time of a cycle for the animations only, the ones of nice!oled", () => {
    expect(ANIMATION_KINDS.map((k) => k.cycleMs)).toEqual([
      960,
      960,
      4800,
      4800,
      10000,
      null,
      null,
      // The 19 of the fork: the 11 animations, then the 8 still images
      1200,
      2400,
      1600,
      3200,
      1600,
      2400,
      1600,
      2400,
      1600,
      1200,
      1200,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("name the option of the build that picks each of the first seven", () => {
    for (const kind of ANIMATION_KINDS.filter((k) => k.value < 7)) {
      expect(kind.option).toMatch(
        /^CONFIG_NICE_OLED_WIDGET_(ANIMATION|STATIC_IMAGE)_PERIPHERAL_/,
      );
    }
  });

  it("have no option for the ones of the fork: they are picked at run time only", () => {
    for (const kind of ANIMATION_KINDS.filter((k) => k.value >= 7)) {
      expect(kind.option).toBeNull();
    }
  });

  it("find a kind by its value, or give the first one for a value nobody knows", () => {
    expect(animationKind(3).sprite).toBe("spaceman");
    expect(animationKind(99).sprite).toBe("crystal");
  });
});

describe("the time of a cycle", () => {
  const cat = animationKind(1);

  it("is the one of the animation while the setting is 0", () => {
    expect(cycleMsOf(cat, 0)).toBe(960);
    expect(cycleMsOf(animationKind(4), 0)).toBe(10000);
  });

  it("is the setting otherwise, and a hundred for 1 to 99", () => {
    expect(cycleMsOf(cat, 2000)).toBe(2000);
    expect(cycleMsOf(cat, 100)).toBe(100);
    expect(cycleMsOf(cat, 1)).toBe(100);
    expect(cycleMsOf(cat, 99)).toBe(100);
  });

  it("is none for a still image", () => {
    expect(cycleMsOf(animationKind(5), 0)).toBeNull();
    expect(cycleMsOf(animationKind(6), 5000)).toBeNull();
  });
});

describe("the frame of a sprite", () => {
  it("goes round the frames of an animation", () => {
    expect(spriteFrame(8, 0)).toBe(0);
    expect(spriteFrame(8, 7)).toBe(7);
    expect(spriteFrame(8, 8)).toBe(0);
    expect(spriteFrame(8, 11)).toBe(3);
  });

  it("is the only one for a picture that is not an animation", () => {
    // The icons share the clock of the right screen and must not run past
    // their single frame (the icon then disappears).
    for (const frame of [0, 1, 3, 47]) {
      expect(spriteFrame(1, frame)).toBe(0);
    }
    for (const info of Object.values(SPRITES)) {
      if (info.kind !== "animation") {
        expect(spriteFrame(info.frames, 5)).toBe(0);
      }
    }
  });

  it("never gives a frame that does not exist", () => {
    for (const info of Object.values(SPRITES)) {
      for (const frame of [0, 1, 7, 15, 47, 100]) {
        const shown = spriteFrame(info.frames, frame);
        expect(shown).toBeGreaterThanOrEqual(0);
        expect(shown).toBeLessThan(info.frames);
      }
    }
  });
});

describe("the fonts", () => {
  it("keep the cell of the four fonts the widgets use", () => {
    expect(FONTS.pixel8).toMatchObject({ advance: 4, lineHeight: 7 });
    expect(FONTS.pixel12).toMatchObject({ advance: 6, lineHeight: 10 });
    expect(FONTS.pixel16).toMatchObject({ advance: 8, lineHeight: 13 });
    expect(FONTS.unscii8).toMatchObject({ advance: 8, lineHeight: 9 });
  });
});

describe("what only a new build adds", () => {
  it("lists each one with the option that turns it on", () => {
    expect(BUILD_ONLY_FEATURES.length).toBeGreaterThanOrEqual(6);
    for (const feature of BUILD_ONLY_FEATURES) {
      expect(feature.option).toMatch(/^CONFIG_NICE_OLED_/);
      expect(feature.hint.length).toBeGreaterThan(20);
    }
    expect(new Set(BUILD_ONLY_FEATURES.map((f) => f.key)).size).toBe(
      BUILD_ONLY_FEATURES.length,
    );
  });
});
