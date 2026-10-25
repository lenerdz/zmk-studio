/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  count,
  describeKeys,
  describeLights,
  describeScreens,
  DETAIL_LINES,
  keysDetails,
  lightsDetails,
  SAME,
  screensDetails,
} from "./backupText";
import type { KeysPlan, LightsPlan, ScreensPlan } from "./backupPlan";

const binding = { behaviorId: 1, param1: 0, param2: 0 };

const keysPlan = (change: Partial<KeysPlan> = {}): KeysPlan => ({
  layers: [],
  renames: [],
  changedKeys: 0,
  layersCompared: 8,
  problems: [],
  ...change,
});

const lightsPlan = (change: Partial<LightsPlan> = {}): LightsPlan => ({
  layers: [],
  changedColors: 0,
  layersCompared: 8,
  problems: [],
  ...change,
});

const screensPlan = (change: Partial<ScreensPlan> = {}): ScreensPlan => ({
  changes: [],
  compared: 20,
  problems: [],
  ...change,
});

describe("count", () => {
  it("writes the singular for one and the plural for the rest", () => {
    expect(count(1, "key")).toBe("1 key");
    expect(count(0, "key")).toBe("0 keys");
    expect(count(2, "color")).toBe("2 colors");
    expect(count(3, "color map")).toBe("3 color maps");
    expect(count(2, "entry", "entries")).toBe("2 entries");
  });
});

describe("describeKeys", () => {
  it("says the keys are the same, or that there is nothing to apply", () => {
    expect(describeKeys(keysPlan())).toBe(SAME);
    expect(describeKeys(keysPlan({ layersCompared: 0 }))).toBe("Nothing to apply.");
  });

  it("counts the keys and the layers they are in", () => {
    const plan = keysPlan({
      changedKeys: 3,
      layers: [
        { layerId: 0, layerName: "A", edits: [] },
        { layerId: 1, layerName: "B", edits: [] },
      ],
    });

    expect(describeKeys(plan)).toBe("3 keys change in 2 layers.");
    expect(
      describeKeys(
        keysPlan({ changedKeys: 1, layers: [{ layerId: 0, layerName: "A", edits: [] }] }),
      ),
    ).toBe("1 key change in 1 layer.");
  });

  it("counts the names of the layers", () => {
    const rename = { layerId: 0, from: "A", to: "B" };

    expect(describeKeys(keysPlan({ renames: [rename] }))).toBe("1 layer name change.");
    expect(
      describeKeys(
        keysPlan({
          renames: [rename, rename],
          changedKeys: 2,
          layers: [{ layerId: 0, layerName: "A", edits: [] }],
        }),
      ),
    ).toBe("2 keys change in 1 layer and 2 layer names change.");
  });
});

describe("describeLights", () => {
  it("says the colors are the same, or that there is nothing to apply", () => {
    expect(describeLights(lightsPlan())).toBe(SAME);
    expect(describeLights(lightsPlan({ layersCompared: 0 }))).toBe("Nothing to apply.");
  });

  it("counts the colors and the layers they are in", () => {
    const plan = lightsPlan({
      changedColors: 5,
      layers: [{ layerId: 0, layerName: "A", entries: [], previous: [] }],
    });

    expect(describeLights(plan)).toBe("5 colors change in 1 layer.");
  });
});

describe("describeScreens", () => {
  it("says the settings are the same, or that there is nothing to apply", () => {
    expect(describeScreens(screensPlan())).toBe(SAME);
    expect(describeScreens(screensPlan({ compared: 0 }))).toBe("Nothing to apply.");
  });

  it("counts the settings", () => {
    const change = { id: 1, label: "L", from: 1, to: 2, adjusted: false };

    expect(describeScreens(screensPlan({ changes: [change] }))).toBe("1 setting change.");
    expect(describeScreens(screensPlan({ changes: [change, change] }))).toBe(
      "2 settings change.",
    );
  });
});

describe("the lines of detail", () => {
  it("name each layer that changes, and the names", () => {
    const plan = keysPlan({
      renames: [
        { layerId: 0, from: "QWERTY", to: "BASE" },
        { layerId: 5, from: "", to: "" },
      ],
      layers: [
        { layerId: 1, layerName: "FN1", edits: [{ keyPosition: 0, binding, previous: binding }, { keyPosition: 1, binding, previous: binding }] },
        { layerId: 2, layerName: "", edits: [{ keyPosition: 0, binding, previous: binding }] },
      ],
    });

    expect(keysDetails(plan)).toEqual([
      "Layer QWERTY is named BASE",
      "Layer 5 is named (no name)",
      "FN1: 2 keys",
      "Layer 2: 1 key",
    ]);
  });

  it("count the colors of each layer", () => {
    const plan = lightsPlan({
      layers: [
        { layerId: 0, layerName: "QWERTY", entries: [{ slot: 0, rgb: 1 }], previous: [{ slot: 0, rgb: 0 }] },
        { layerId: 3, layerName: "", entries: [{ slot: 0, rgb: 1 }, { slot: 1, rgb: 1 }], previous: [] },
      ],
    });

    expect(lightsDetails(plan)).toEqual(["QWERTY: 1 color", "Layer 3: 2 colors"]);
  });

  it("show each setting with the value it has and the one it gets", () => {
    const plan = screensPlan({
      changes: [
        { id: 5, label: "Light toast on the right screen", from: 1, to: 0, adjusted: false },
        { id: 1, label: "Left screen contrast", from: 128, to: 255, adjusted: true },
      ],
    });

    expect(screensDetails(plan)).toEqual([
      "Light toast on the right screen: On to Off",
      "Left screen contrast: 128 to 255 (the nearest value the keyboard takes)",
    ]);
  });

  it("stop at the limit and say how many more there are", () => {
    const plan = lightsPlan({
      layers: Array.from({ length: DETAIL_LINES + 5 }, (_, i) => ({
        layerId: i,
        layerName: `L${i}`,
        entries: [{ slot: 0, rgb: 1 }],
        previous: [],
      })),
    });

    const lines = lightsDetails(plan);

    expect(lines).toHaveLength(DETAIL_LINES + 1);
    expect(lines[0]).toBe("L0: 1 color");
    expect(lines.at(-1)).toBe("and 5 more");
  });

  it("do not cut a list that fits", () => {
    const plan = lightsPlan({
      layers: Array.from({ length: DETAIL_LINES }, (_, i) => ({
        layerId: i,
        layerName: `L${i}`,
        entries: [{ slot: 0, rgb: 1 }],
        previous: [],
      })),
    });

    expect(lightsDetails(plan)).toHaveLength(DETAIL_LINES);
  });
});
