/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { DEMO_DISPLAY_SETTINGS } from "../display/demo/demoDisplay";
import type { DisplaySettingData } from "../display/displayProtocol";
import { withValue } from "../display/displaySettings";
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
  valuesForPicture,
  valuesForShowing,
  widgetStates,
  widgetsAreDefault,
  widgetsOfScreen,
  type WidgetState,
} from "./oledLayout";
import { OLED_ID } from "./oledIds";

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
    expect(gauge.rect).toEqual({ x: 0, y: 65, w: 33, h: 21 });
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
    expect(selectableKinds(demo(), ANIMATION_KINDS)).toHaveLength(7);

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

  it("lists every setting of a widget, the picture having five", () => {
    expect(idsOfWidget(picture)).toEqual([16, 17, 18, 19, 20]);
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
