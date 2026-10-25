/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { DEMO_DISPLAY_SETTINGS } from "../display/demo/demoDisplay";
import type { DisplaySettingData } from "../display/displayProtocol";
import { withValue } from "../display/displaySettings";
import type { LiveReading } from "../live/liveStatusPoller";
import { ANIMATION_KINDS, WIDGETS } from "./oledCatalog";
import {
  describeStatus,
  describeVisibility,
  hasOledLayout,
  idsOfWidget,
  missingWidgets,
  pictureKind,
  pictureOf,
  rectOf,
  resetChanges,
  selectableKinds,
  valuesAfterMove,
  valuesForCenter,
  valuesForCorner,
  valuesForKindChange,
  valuesForPicture,
  valuesForShowing,
  valuesForTurn,
  valuesForWindowCenter,
  widgetStates,
  widgetsAreDefault,
  widgetsOfScreen,
  type WidgetState,
} from "./oledLayout";
import { OLED_ID } from "./oledIds";
import { WINDOW_RECT } from "./oledGeometry";
import {
  MIX_ADD,
  MIX_INVERT,
  packPair,
  rotateCrop,
  type Crop,
} from "./pictureView";

const demo = (): DisplaySettingData[] =>
  DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s }));

const stateOf = (settings: DisplaySettingData[], key: string): WidgetState =>
  widgetStates(settings).find((s) => s.def.key === key)!;

const set = (
  settings: DisplaySettingData[],
  id: number,
  value: number,
): DisplaySettingData[] => withValue(settings, id, value);

describe("hasOledLayout", () => {
  it("is true for a keyboard that lists the ids from 16 on", () => {
    expect(hasOledLayout(demo())).toBe(true);
  });

  it("is false for a keyboard with the six display settings only", () => {
    expect(hasOledLayout(demo().filter((s) => s.id < 16))).toBe(false);
    expect(hasOledLayout([])).toBe(false);
  });
});

describe("widgetStates", () => {
  it("has the twelve widgets of the catalog, in order, all present on the demo keyboard", () => {
    const states = widgetStates(demo());

    expect(states.map((s) => s.def.key)).toEqual(WIDGETS.map((w) => w.key));
    expect(states.every((s) => s.present)).toBe(true);
  });

  it("takes the position, the switch and the range from the keyboard", () => {
    const layer = stateOf(demo(), "l_layer");

    expect(layer).toMatchObject({
      shown: true,
      x: 0,
      y: 146,
      min: -160,
      max: 320,
      defaultShown: true,
      defaultX: 0,
      defaultY: 146,
    });
  });

  it("counts a widget with the switch off as hidden, and the toast as shown", () => {
    const settings = set(demo(), OLED_ID.R_BATTERY_SHOW, 0);

    expect(stateOf(settings, "r_battery").shown).toBe(false);
    expect(stateOf(settings, "r_toast").shown).toBe(true);
  });

  it("says the toast is muted while the Display tab has it turned off", () => {
    expect(stateOf(demo(), "r_toast").muted).toBe(false);
    expect(stateOf(set(demo(), 5, 0), "r_toast").muted).toBe(true);
    // No other widget is muted
    expect(stateOf(set(demo(), 5, 0), "r_battery").muted).toBe(false);
  });

  it("marks a widget the keyboard has no settings for as not present", () => {
    // A build without the layer widget: no ids 80 to 82
    const settings = demo().filter((s) => s.id < 80 || s.id > 82);

    expect(stateOf(settings, "l_layer").present).toBe(false);
    expect(stateOf(settings, "l_battery").present).toBe(true);
    expect(
      widgetsOfScreen(widgetStates(settings), "left").map((s) => s.def.key),
    ).not.toContain("l_layer");
    expect(
      missingWidgets(widgetStates(settings), "left").map((s) => s.def.key),
    ).toEqual(["l_layer"]);
  });

  it("splits the widgets between the screens", () => {
    const states = widgetStates(demo());

    expect(widgetsOfScreen(states, "right")).toHaveLength(4);
    expect(widgetsOfScreen(states, "left")).toHaveLength(8);
  });

  it("works for a keyboard with no layout at all (nothing present)", () => {
    const states = widgetStates([]);

    expect(states.every((s) => !s.present)).toBe(true);
  });

  describe("with the live reading of the keyboard", () => {
    const live: LiveReading = {
      batteryCentral: 61,
      batteryPeripheral: 47,
      peripheralConnected: false,
      layerIndex: 2,
      layerName: "Nav",
      wpm: 7,
      output: "usb",
      bleProfile: 3,
      bleState: "connected",
      usbState: "hid",
      uptimeS: 1,
      wpmHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    };

    it("draws the widgets from it, and from the sample without it", () => {
      const withLive = (key: string) =>
        widgetStates(demo(), live).find((s) => s.def.key === key)!;

      expect(withLive("l_layer").parts[0]).toMatchObject({ text: "NAV" });
      expect(stateOf(demo(), "l_layer").parts[0]).toMatchObject({
        text: "QWERTY",
      });
      expect(withLive("r_battery").parts[0]).toMatchObject({ text: "47%" });
      expect(withLive("r_link").parts[0]).toMatchObject({
        sprite: "bt_no_signal",
      });
    });

    it("sizes the widget by what is drawn: the battery of three digits is wider", () => {
      const narrow = widgetStates(demo(), live).find(
        (s) => s.def.key === "r_battery",
      )!;
      const wide = widgetStates(demo(), {
        ...live,
        batteryPeripheral: 100,
      }).find((s) => s.def.key === "r_battery")!;

      expect(narrow.box.w).toBe(24);
      expect(wide.box.w).toBe(32);
    });

    it("keeps the position, the switch and the range the keyboard has", () => {
      const settings = set(demo(), OLED_ID.L_LAYER_X, 12);
      const layer = widgetStates(settings, live).find(
        (s) => s.def.key === "l_layer",
      )!;

      expect(layer).toMatchObject({ x: 12, y: 146, shown: true, present: true });
    });
  });
});

describe("where the widgets of the build are on the screens", () => {
  it("has the animation 18 and -18 on the landscape canvas, cut by the window", () => {
    const anim = stateOf(demo(), "r_anim");

    expect(anim.rect).toEqual({ x: -18, y: 73, w: 68, h: 69 });
    expect(anim.visibility).toBe("partial");
  });

  it("has the layer text cut at the right edge, 48 pixels wide on 32", () => {
    const layer = stateOf(demo(), "l_layer");

    expect(layer.rect).toEqual({ x: 0, y: 146, w: 48, h: 13 });
    expect(layer.visibility).toBe("partial");
  });

  it("has the battery text of the left screen above what the panel shows", () => {
    const battery = stateOf(demo(), "l_battery");

    expect(battery.rect).toEqual({ x: 0, y: 19, w: 48, h: 9 });
    expect(battery.visibility).toBe("none");
    expect(describeVisibility(battery)).toBe(
      "It is outside what the screen shows.",
    );
  });

  it("has every other widget of the build on the screen", () => {
    const states = widgetStates(demo());

    for (const key of [
      "r_battery",
      "r_link",
      "l_output",
      "l_profile",
      "l_profile_num",
      "l_wpm_gauge",
      "l_wpm_number",
    ]) {
      expect(states.find((s) => s.def.key === key)!.visibility).not.toBe(
        "none",
      );
    }
  });

  it("puts the gauge where the needle can swing above it", () => {
    const gauge = stateOf(demo(), "l_wpm_gauge");

    // y = 70, the needle reaches 5 pixels above: the box starts at 65
    expect(gauge.rect).toEqual({ x: 0, y: 65, w: 33, h: 22 });
  });

  it("describes how much of a widget the screen shows", () => {
    expect(describeVisibility(stateOf(demo(), "l_output"))).toBe(
      "All of it is on the screen.",
    );
    expect(describeVisibility(stateOf(demo(), "l_layer"))).toBe(
      "416 of its 624 pixels are on the screen; the rest is cut off.",
    );
  });
});

describe("describeStatus", () => {
  it("says a widget is on the screen, cut off, outside or hidden", () => {
    expect(describeStatus(stateOf(demo(), "l_output"))).toBe("On the screen");
    expect(describeStatus(stateOf(demo(), "l_layer"))).toBe(
      "Cut off by the edge: 416 of 624 pixels show",
    );
    expect(describeStatus(stateOf(demo(), "l_battery"))).toBe(
      "Outside what the screen shows",
    );
    expect(
      describeStatus(
        stateOf(set(demo(), OLED_ID.L_OUTPUT_SHOW, 0), "l_output"),
      ),
    ).toBe("Hidden");
  });

  it("tells the toast by the Display tab, not by a switch", () => {
    expect(describeStatus(stateOf(demo(), "r_toast"))).toBe(
      "Shows for a moment when the lights change",
    );
    expect(describeStatus(stateOf(set(demo(), 5, 0), "r_toast"))).toBe(
      "Off: turned off in the Display tab",
    );
  });
});

describe("rectOf", () => {
  const box = { x: 0, y: -5, w: 33, h: 21 };

  it("adds the position to the box of a widget", () => {
    expect(rectOf({ placement: "origin" }, box, 10, 70)).toEqual({
      x: 10,
      y: 65,
      w: 33,
      h: 21,
    });
  });

  it("converts the landscape position of a picture", () => {
    expect(
      rectOf({ placement: "picture" }, { x: 0, y: 0, w: 68, h: 69 }, 18, -18),
    ).toEqual({ x: -18, y: 73, w: 68, h: 69 });
  });
});

describe("moving a widget", () => {
  it("moves the position by the distance, for a widget placed by its corner", () => {
    const layer = stateOf(demo(), "l_layer");

    expect(valuesAfterMove(layer, 5, -10)).toEqual({ x: 5, y: 136 });
    expect(valuesAfterMove(layer, 0, 0)).toEqual({ x: 0, y: 146 });
  });

  it("moves a widget whose box does not start at its position (the needle above the gauge)", () => {
    const gauge = stateOf(demo(), "l_wpm_gauge");

    expect(valuesAfterMove(gauge, 0, 10)).toEqual({ x: 0, y: 80 });
    expect(valuesForCorner(gauge, { x: 4, y: 60 })).toEqual({ x: 4, y: 65 });
  });

  it("moves the picture on the landscape canvas: right is Y, down is a smaller X", () => {
    const anim = stateOf(demo(), "r_anim");

    expect(valuesAfterMove(anim, 10, 0)).toEqual({ x: 18, y: -8 });
    expect(valuesAfterMove(anim, 0, 10)).toEqual({ x: 8, y: -18 });
    expect(valuesAfterMove(anim, -3, -4)).toEqual({ x: 22, y: -21 });
  });

  it("holds the position inside the range the keyboard accepts", () => {
    const layer = stateOf(demo(), "l_layer");

    expect(valuesAfterMove(layer, 10000, 10000)).toEqual({ x: 320, y: 320 });
    expect(valuesAfterMove(layer, -10000, -10000)).toEqual({
      x: -160,
      y: -160,
    });
  });

  it("holds a picture inside the range too", () => {
    const anim = stateOf(demo(), "r_anim");

    expect(valuesAfterMove(anim, 0, -10000)).toEqual({ x: 320, y: -18 });
    expect(valuesAfterMove(anim, 10000, 0)).toEqual({ x: 18, y: 320 });
  });

  it("puts the center of a widget on a point", () => {
    const output = stateOf(demo(), "l_output");

    // 20 x 11: the center is 10 and 5.5 from the corner
    expect(valuesForCenter(output, { x: 16, y: 100 })).toEqual({
      x: 6,
      y: 95,
    });
  });
});

describe("showing a widget that was hidden", () => {
  it("brings it back where it was when the screen shows it there", () => {
    const hidden = set(demo(), OLED_ID.L_OUTPUT_SHOW, 0);

    expect(valuesForShowing(stateOf(hidden, "l_output"))).toEqual({
      x: 0,
      y: 34,
    });
  });

  it("puts it at the top of what the screen shows when it was outside", () => {
    // The battery text of the build is at y = 19, above the row 32
    expect(valuesForShowing(stateOf(demo(), "l_battery"))).toEqual({
      x: 0,
      y: 32,
    });
  });

  it("does that for a widget whose box starts above its position, too", () => {
    const away = stateOf(
      set(demo(), OLED_ID.L_WPM_GAUGE_Y, -100),
      "l_wpm_gauge",
    );

    expect(away.visibility).toBe("none");
    // The box (the needle) starts 5 pixels above the position
    expect(valuesForShowing(away)).toEqual({ x: 0, y: 37 });
  });
});

describe("the picture", () => {
  it("is the first one when the keyboard has no kind", () => {
    expect(
      pictureKind(demo().filter((s) => s.id !== OLED_ID.R_ANIM_KIND)),
    ).toBe(0);
  });

  it("is the one the setting says, and it changes the size of the widget", () => {
    expect(pictureKind(demo())).toBe(1);
    expect(stateOf(demo(), "r_anim").rect.h).toBe(69);

    const vim = stateOf(set(demo(), OLED_ID.R_ANIM_KIND, 5), "r_anim");

    // Landscape X = 18 and Y = -18 for a picture 160 tall: y = 160 - 18 - 160
    expect(vim.rect).toEqual({ x: -18, y: -18, w: 68, h: 160 });
  });

  it("plays at the time of the animation, or the one the setting gives", () => {
    expect(pictureOf(demo())).toMatchObject({ cycleMs: 960 });
    expect(pictureOf(demo()).kind.sprite).toBe("cat");
    expect(pictureOf(set(demo(), OLED_ID.R_ANIM_MS, 3000)).cycleMs).toBe(3000);
    expect(pictureOf(set(demo(), OLED_ID.R_ANIM_KIND, 4)).cycleMs).toBe(10000);
  });

  it("does not play a still image", () => {
    expect(pictureOf(set(demo(), OLED_ID.R_ANIM_KIND, 6)).cycleMs).toBeNull();
  });

  it("offers the kinds inside the range of the keyboard", () => {
    expect(selectableKinds(demo(), ANIMATION_KINDS)).toHaveLength(66);

    const small = demo().map((s) =>
      s.id === OLED_ID.R_ANIM_KIND ? { ...s, max: 2 } : s,
    );
    expect(selectableKinds(small, ANIMATION_KINDS).map((k) => k.value)).toEqual(
      [0, 1, 2],
    );
  });

  it("offers nothing to a keyboard with no picture", () => {
    expect(
      selectableKinds(
        demo().filter((s) => s.id !== OLED_ID.R_ANIM_KIND),
        ANIMATION_KINDS,
      ),
    ).toEqual([]);
  });
});

describe("dropping a picture of the gallery on the screen", () => {
  const centerOf = (settings: DisplaySettingData[]) => {
    const { rect } = stateOf(settings, "r_anim");
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  };

  it("gives the kind and the position that centers it on the point", () => {
    const values = valuesForPicture(demo(), 3, { x: 34, y: 80 })!;

    expect(values.kind).toBe(3);

    let settings = set(demo(), OLED_ID.R_ANIM_KIND, values.kind);
    settings = set(settings, OLED_ID.R_ANIM_X, values.x);
    settings = set(settings, OLED_ID.R_ANIM_Y, values.y);

    // 68 x 69: the center is half a pixel off, as the integers say
    const center = centerOf(settings);
    expect(Math.abs(center.x - 34)).toBeLessThanOrEqual(1);
    expect(Math.abs(center.y - 80)).toBeLessThanOrEqual(1);
  });

  it("uses the size of the picture that is dropped, not the one that is playing", () => {
    // The cat is 69 tall; the Vim logo is 160 tall: they need different positions
    const cat = valuesForPicture(demo(), 1, { x: 34, y: 80 })!;
    const vim = valuesForPicture(demo(), 5, { x: 34, y: 80 })!;

    expect(vim.kind).toBe(5);
    expect(vim.x).not.toBe(cat.x);

    let settings = set(demo(), OLED_ID.R_ANIM_KIND, vim.kind);
    settings = set(settings, OLED_ID.R_ANIM_X, vim.x);
    settings = set(settings, OLED_ID.R_ANIM_Y, vim.y);

    const { rect } = stateOf(settings, "r_anim");
    expect(rect.h).toBe(160);
    expect(rect.y + rect.h / 2).toBeCloseTo(80, 0);
  });

  it("holds the position inside what the keyboard accepts", () => {
    const far = valuesForPicture(demo(), 1, { x: 100000, y: -100000 })!;

    expect(far.x).toBeGreaterThanOrEqual(-160);
    expect(far.x).toBeLessThanOrEqual(320);
    expect(far.y).toBeGreaterThanOrEqual(-160);
    expect(far.y).toBeLessThanOrEqual(320);
  });

  it("does not change the settings it is given", () => {
    const settings = demo();
    valuesForPicture(settings, 4, { x: 10, y: 10 });

    expect(settings).toEqual(demo());
  });

  it("is nothing for a keyboard with no picture", () => {
    const none = demo().filter(
      (s) => s.id < OLED_ID.R_ANIM_SHOW || s.id > OLED_ID.R_ANIM_MS,
    );

    expect(valuesForPicture(none, 1, { x: 34, y: 80 })).toBeNull();
  });
});

describe("putting a widget back as the build had it", () => {
  const picture = WIDGETS.find((w) => w.key === "r_anim")!;
  const layer = WIDGETS.find((w) => w.key === "l_layer")!;

  it("lists every setting of a widget, the picture having nine", () => {
    expect(idsOfWidget(picture)).toEqual([
      16, 17, 18, 19, 20, 112, 113, 114, 115,
    ]);
    expect(idsOfWidget(layer)).toEqual([80, 81, 82]);
    expect(idsOfWidget(WIDGETS.find((w) => w.key === "r_toast")!)).toEqual([
      41, 42,
    ]);
  });

  it("sends nothing while the widgets are as the build had them", () => {
    expect(resetChanges(demo(), [picture, layer])).toEqual([]);
    expect(widgetsAreDefault(demo(), [picture, layer])).toBe(true);
  });

  it("sends the settings that changed, with the value of the build", () => {
    let settings = set(demo(), OLED_ID.R_ANIM_X, 30);
    settings = set(settings, OLED_ID.R_ANIM_KIND, 3);
    settings = set(settings, OLED_ID.L_LAYER_SHOW, 0);

    expect(resetChanges(settings, [picture])).toEqual([
      { id: 17, value: 18 },
      { id: 19, value: 1 },
    ]);
    expect(resetChanges(settings, [layer])).toEqual([{ id: 80, value: 1 }]);
    expect(widgetsAreDefault(settings, [picture])).toBe(false);
  });

  it("leaves the other widgets alone", () => {
    const settings = set(demo(), OLED_ID.L_LAYER_X, 7);

    expect(resetChanges(settings, [picture])).toEqual([]);
  });
});

const PICTURE_IDS = {
  kind: OLED_ID.R_ANIM_KIND,
  x: OLED_ID.R_ANIM_X,
  y: OLED_ID.R_ANIM_Y,
  rot: OLED_ID.R_ANIM_ROT,
  mix: OLED_ID.R_ANIM_MIX,
  cropXY: OLED_ID.R_ANIM_CROP_XY,
  cropWH: OLED_ID.R_ANIM_CROP_WH,
} as const;

/** The settings with the values of a picture applied, the way the keyboard takes them. */
const apply = (
  settings: DisplaySettingData[],
  values: Partial<Record<keyof typeof PICTURE_IDS, number>>,
): DisplaySettingData[] =>
  (Object.keys(values) as Array<keyof typeof PICTURE_IDS>).reduce(
    (next, key) => set(next, PICTURE_IDS[key], values[key]!),
    settings,
  );

/** The settings with the picture cut to a piece. */
const cutTo = (settings: DisplaySettingData[], crop: Crop) =>
  apply(settings, {
    cropXY: packPair(crop.x, crop.y),
    cropWH: packPair(crop.w, crop.h),
  });

const pictureOn = (settings: DisplaySettingData[]) => stateOf(settings, "r_anim");

const centerOfRect = (rect: { x: number; y: number; w: number; h: number }) => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

describe("the picture, turned and mixed", () => {
  it("is upright, whole and inverted under the widgets as the build has it", () => {
    const state = pictureOn(demo());

    expect(state.picture).toMatchObject({
      turn: 0,
      crop: null,
      mix: MIX_INVERT,
      canTurn: true,
      canMix: true,
      canCrop: true,
    });
    expect(state.picture!.shape).toEqual({ w: 68, h: 69 });
    expect(state.picture!.piece).toEqual({ x: 0, y: 0, w: 68, h: 69 });
    expect(state.picture!.whole).toEqual(state.rect);
  });

  it("is only for the picture: the other widgets have none of it", () => {
    for (const state of widgetStates(demo()).filter(
      (s) => s.def.key !== "r_anim",
    )) {
      expect(state.picture).toBeNull();
    }
  });

  it("is turned a quarter of a turn clockwise by the setting, and the sides swap", () => {
    const state = pictureOn(set(demo(), OLED_ID.R_ANIM_ROT, 1));

    expect(state.picture!.turn).toBe(1);
    expect(state.picture!.shape).toEqual({ w: 69, h: 68 });
    // X = 18 and Y = -18 for a picture that is 69 wide and 68 tall as it is looked at
    expect(state.rect).toEqual({ x: -18, y: 74, w: 69, h: 68 });
  });

  it("is turned as many times as the setting says, held in 0 to 3", () => {
    const turns = [0, 1, 2, 3].map(
      (rot) => pictureOn(set(demo(), OLED_ID.R_ANIM_ROT, rot)).picture!.turn,
    );

    expect(turns).toEqual([0, 1, 2, 3]);
    expect(pictureOn(set(demo(), OLED_ID.R_ANIM_ROT, 3)).rect).toEqual({
      x: -18,
      y: 74,
      w: 69,
      h: 68,
    });
    expect(pictureOn(set(demo(), OLED_ID.R_ANIM_ROT, 2)).rect).toEqual(
      pictureOn(demo()).rect,
    );
  });

  it("mixes as the setting says", () => {
    expect(
      pictureOn(set(demo(), OLED_ID.R_ANIM_MIX, 0)).picture!.mix,
    ).toBe(MIX_ADD);
    expect(
      pictureOn(set(demo(), OLED_ID.R_ANIM_MIX, 1)).picture!.mix,
    ).toBe(MIX_INVERT);
  });

  it("has nothing of this on a firmware without the four settings (older than this one)", () => {
    const older = demo().filter((s) => s.id < 112);
    const state = pictureOn(older);

    expect(state.present).toBe(true);
    expect(state.picture).toMatchObject({
      turn: 0,
      crop: null,
      mix: MIX_ADD,
      canTurn: false,
      canMix: false,
      canCrop: false,
    });
    expect(idsOfWidget(state.def).filter((id) => older.some((s) => s.id === id)))
      .toEqual([16, 17, 18, 19, 20]);
  });
});

describe("the picture, cut", () => {
  const piece: Crop = { x: 10, y: 20, w: 30, h: 40 };

  it("shows the piece the two settings give, in the place the pixels have in the whole", () => {
    const state = pictureOn(cutTo(demo(), piece));

    expect(state.picture!.crop).toEqual(piece);
    expect(state.picture!.piece).toEqual(piece);
    // The whole picture is where it was: the cat at x = -18, y = 73
    expect(state.picture!.whole).toEqual({ x: -18, y: 73, w: 68, h: 69 });
    expect(state.rect).toEqual({ x: -8, y: 93, w: 30, h: 40 });
    expect(state.box).toEqual({ x: 0, y: 0, w: 68, h: 69 });
  });

  it("is the whole picture while the width or the height is 0", () => {
    const state = pictureOn(
      apply(demo(), { cropXY: packPair(10, 20), cropWH: packPair(0, 40) }),
    );

    expect(state.picture!.crop).toBeNull();
    expect(state.rect).toEqual(pictureOn(demo()).rect);
  });

  it("is cut off at the edge of the picture, the way the firmware does", () => {
    const state = pictureOn(cutTo(demo(), { x: 60, y: 60, w: 30, h: 40 }));

    expect(state.picture!.crop).toEqual({ x: 60, y: 60, w: 8, h: 9 });
    expect(state.rect).toMatchObject({ w: 8, h: 9 });
  });

  it("is cut in the picture as it is turned", () => {
    const state = pictureOn(
      cutTo(set(demo(), OLED_ID.R_ANIM_ROT, 1), { x: 60, y: 60, w: 30, h: 40 }),
    );

    // 69 wide and 68 tall once turned
    expect(state.picture!.crop).toEqual({ x: 60, y: 60, w: 9, h: 8 });
  });

  it("counts only the piece for what the panel shows", () => {
    // The cut piece of the cat is inside the strip the panel shows: all of it shows
    const inside = pictureOn(cutTo(demo(), { x: 20, y: 20, w: 12, h: 30 }));

    expect(inside.visibility).toBe("full");
    // The whole cat is wider than the strip: it is a partial view
    expect(pictureOn(demo()).visibility).toBe("partial");
  });

  it("is moved by its piece: the position stays the one of the whole picture", () => {
    const state = pictureOn(cutTo(demo(), piece));

    // Put the corner of the piece at x = 0, y = 40: the whole picture starts 10 and 20 before it
    const values = valuesForCorner(state, { x: 0, y: 40 });
    const moved = pictureOn(apply(cutTo(demo(), piece), values));

    expect(moved.rect).toEqual({ x: 0, y: 40, w: 30, h: 40 });
    expect(moved.picture!.whole).toEqual({ x: -10, y: 20, w: 68, h: 69 });
  });

  it("moves by a distance like the picture that is not cut", () => {
    const whole = pictureOn(demo());
    const state = pictureOn(cutTo(demo(), piece));

    expect(valuesAfterMove(state, 7, -3)).toEqual(valuesAfterMove(whole, 7, -3));
  });

  it("puts the center of the piece on a point", () => {
    const state = pictureOn(cutTo(demo(), piece));
    const values = valuesForCenter(state, { x: 16, y: 96 });
    const moved = pictureOn(apply(cutTo(demo(), piece), values));

    expect(centerOfRect(moved.rect)).toEqual({ x: 16, y: 96 });
  });

  it("is put in the middle of the strip the panel shows", () => {
    const state = pictureOn(cutTo(demo(), piece));
    const values = valuesForWindowCenter(state);
    const moved = pictureOn(apply(cutTo(demo(), piece), values));
    const center = centerOfRect(moved.rect);

    expect(Math.abs(center.x - 16)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(center.y - 96)).toBeLessThanOrEqual(0.5);
    expect(moved.visibility).toBe("full");
  });
});

describe("turning the picture", () => {
  const piece: Crop = { x: 10, y: 20, w: 30, h: 40 };
  const settingsWith = (cut: boolean, rot = 0) =>
    apply(cut ? cutTo(demo(), piece) : demo(), { rot });

  it("sets the turn asked for, whichever way it goes", () => {
    for (const target of [0, 1, 2, 3]) {
      const values = valuesForTurn(pictureOn(demo()), target)!;

      expect(values.rot).toBe(target);
      expect(pictureOn(apply(demo(), values)).picture!.turn).toBe(target);
    }
  });

  it("holds a turn that is out of 0 to 3", () => {
    expect(valuesForTurn(pictureOn(demo()), 5)!.rot).toBe(1);
    expect(valuesForTurn(pictureOn(demo()), -1)!.rot).toBe(3);
  });

  it("changes nothing for the turn it already has", () => {
    for (const cut of [false, true]) {
      const settings = settingsWith(cut, 2);
      const values = valuesForTurn(pictureOn(settings), 2)!;

      expect(apply(settings, values)).toEqual(settings);
    }
  });

  it("turns on the spot: the center of what shows moves by half a pixel at most", () => {
    for (const cut of [false, true]) {
      for (const target of [1, 2, 3]) {
        const before = pictureOn(settingsWith(cut));
        const after = pictureOn(
          apply(settingsWith(cut), valuesForTurn(before, target)!),
        );
        const a = centerOfRect(before.rect);
        const b = centerOfRect(after.rect);

        expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("swaps the sides of the piece that shows, and only that", () => {
    const before = pictureOn(settingsWith(true));
    const after = pictureOn(apply(settingsWith(true), valuesForTurn(before, 1)!));

    expect(after.rect).toMatchObject({ w: before.rect.h, h: before.rect.w });
    expect(after.picture!.shape).toEqual({ w: 69, h: 68 });
  });

  it("turns the crop with the picture, so the same pixels show", () => {
    const before = pictureOn(settingsWith(true));
    const clockwise = pictureOn(
      apply(settingsWith(true), valuesForTurn(before, 1)!),
    );
    const counter = pictureOn(
      apply(settingsWith(true), valuesForTurn(before, 3)!),
    );

    expect(clockwise.picture!.crop).toEqual(
      rotateCrop(piece, { w: 68, h: 69 }, 1),
    );
    expect(counter.picture!.crop).toEqual(
      rotateCrop(piece, { w: 68, h: 69 }, -1),
    );
  });

  it("leaves a picture that is whole whole", () => {
    const values = valuesForTurn(pictureOn(demo()), 1)!;

    expect(values.cropXY).toBe(0);
    expect(values.cropWH).toBe(0);
  });

  it("comes back to the very same settings after four quarters, whole or cut", () => {
    for (const cut of [false, true]) {
      const start = settingsWith(cut);
      let settings = start;

      for (let i = 0; i < 4; i++) {
        const values = valuesForTurn(
          pictureOn(settings),
          pictureOn(settings).picture!.turn + 1,
        )!;
        settings = apply(settings, values);
      }

      expect(settings).toEqual(start);
    }
  });

  it("is undone by turning the other way", () => {
    for (const cut of [false, true]) {
      const start = settingsWith(cut);
      const turned = apply(start, valuesForTurn(pictureOn(start), 1)!);
      const back = apply(turned, valuesForTurn(pictureOn(turned), 0)!);

      expect(back).toEqual(start);
    }
  });

  it("goes half a turn through the same piece of the picture, in the same place", () => {
    const start = settingsWith(true);
    const half = pictureOn(apply(start, valuesForTurn(pictureOn(start), 2)!));

    expect(half.rect).toEqual(pictureOn(start).rect);
    expect(half.picture!.crop).toEqual({ x: 68 - 10 - 30, y: 69 - 20 - 40, w: 30, h: 40 });
  });

  it("is nothing for a widget that is not the picture", () => {
    expect(valuesForTurn(stateOf(demo(), "l_layer"), 1)).toBeNull();
  });
});

describe("changing the picture", () => {
  it("keeps the center of what showed, with the new picture upright and whole", () => {
    const before = pictureOn(demo());
    const values = valuesForKindChange(demo(), 7)!;
    const after = pictureOn(apply(demo(), values));

    expect(values).toMatchObject({ kind: 7, rot: 0, cropXY: 0, cropWH: 0 });
    expect(after.rect).toEqual({ x: 0, y: 76, w: 32, h: 64 });
    // The center is the one of the cat, to the pixel
    const a = centerOfRect(before.rect);
    const b = centerOfRect(after.rect);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
  });

  it("fits a picture as tall as the screen exactly on it", () => {
    for (const kind of [10, 13, 18, 19, 20, 24]) {
      const after = pictureOn(apply(demo(), valuesForKindChange(demo(), kind)!));

      expect(after.rect).toEqual({ ...WINDOW_RECT });
      expect(after.visibility).toBe("full");
    }
  });

  it("brings a picture that was off to a side onto the screen", () => {
    // Y = 100 puts the cat 100 pixels to the right: the panel shows none of it
    const aside = set(demo(), OLED_ID.R_ANIM_Y, 100);
    expect(pictureOn(aside).visibility).toBe("none");

    const after = pictureOn(apply(aside, valuesForKindChange(aside, 8)!));

    expect(after.visibility).toBe("full");
  });

  it("keeps the center of a picture that is bigger than the screen, and does not fit it", () => {
    // Vim is 68 x 160: it cannot fit in 32 x 128, so it stays centered on the old center
    const before = pictureOn(demo());
    const after = pictureOn(apply(demo(), valuesForKindChange(demo(), 5)!));
    const a = centerOfRect(before.rect);
    const b = centerOfRect(after.rect);

    expect(after.rect).toMatchObject({ w: 68, h: 160 });
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
  });

  it("goes back to the cat where the build puts it", () => {
    const equalizer = apply(demo(), valuesForKindChange(demo(), 7)!);
    const cat = pictureOn(apply(equalizer, valuesForKindChange(equalizer, 1)!));

    expect(cat.rect.x).toBe(-18);
    expect(Math.abs(cat.rect.y - 73)).toBeLessThanOrEqual(2);
  });

  it("drops the turn and the crop of the picture that was playing", () => {
    const worked = cutTo(set(demo(), OLED_ID.R_ANIM_ROT, 3), {
      x: 4,
      y: 5,
      w: 20,
      h: 30,
    });
    const values = valuesForKindChange(worked, 12)!;
    const after = pictureOn(apply(worked, values));

    expect(after.picture!.turn).toBe(0);
    expect(after.picture!.crop).toBeNull();
    expect(after.rect).toMatchObject({ w: 32, h: 32 });
  });

  it("keeps how the picture mixes", () => {
    const added = set(demo(), OLED_ID.R_ANIM_MIX, MIX_ADD);
    const values = valuesForKindChange(added, 9)!;

    expect(Object.keys(values)).not.toContain("mix");
    expect(pictureOn(apply(added, values)).picture!.mix).toBe(MIX_ADD);
  });

  it("is nothing for a keyboard with no picture", () => {
    const none = demo().filter(
      (s) => s.id < OLED_ID.R_ANIM_SHOW || s.id > OLED_ID.R_ANIM_MS,
    );

    expect(valuesForKindChange(none, 7)).toBeNull();
  });

  it("starts a picture of the gallery upright and whole where it is dropped", () => {
    const worked = cutTo(set(demo(), OLED_ID.R_ANIM_ROT, 1), {
      x: 4,
      y: 5,
      w: 20,
      h: 30,
    });
    const values = valuesForPicture(worked, 3, { x: 34, y: 80 })!;
    const after = pictureOn(apply(worked, values));

    expect(values).toMatchObject({ kind: 3, rot: 0, cropXY: 0, cropWH: 0 });
    expect(after.picture!.turn).toBe(0);
    expect(after.picture!.crop).toBeNull();
    // 68 x 69, upright: its center is on the drop, to the pixel
    const center = centerOfRect(after.rect);
    expect(Math.abs(center.x - 34)).toBeLessThanOrEqual(1);
    expect(Math.abs(center.y - 80)).toBeLessThanOrEqual(1);
  });
});

describe("putting the picture back as the build had it", () => {
  const picture = WIDGETS.find((w) => w.key === "r_anim")!;

  it("sends the turn, the mix and the crop that changed, with the value of the build", () => {
    let settings = set(demo(), OLED_ID.R_ANIM_ROT, 2);
    settings = set(settings, OLED_ID.R_ANIM_MIX, 0);
    settings = cutTo(settings, { x: 1, y: 2, w: 3, h: 4 });

    expect(resetChanges(settings, [picture])).toEqual([
      { id: 112, value: 0 },
      { id: 113, value: 1 },
      { id: 114, value: 0 },
      { id: 115, value: 0 },
    ]);
    expect(widgetsAreDefault(settings, [picture])).toBe(false);
  });

  it("sends nothing while they are as the build had them", () => {
    expect(resetChanges(demo(), [picture])).toEqual([]);
  });
});
