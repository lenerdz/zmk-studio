/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { DEMO_DEFAULT_COLORS } from "./demo/demoColors";
import { DTSI_HEADER } from "./dtsiTemplate";
import {
  buildDtsi,
  canExportDtsi,
  DTSI_SLOT_COUNT,
  type DtsiLayer,
} from "./exportDtsi";
import { PALETTE } from "./ledColors";

const LAYER_IDS = [0, 1, 2, 3, 4, 5];
const LABELS = [
  "fx_static",
  "map_fn1",
  "map_raise",
  "map_nav",
  "map_sys",
  "map_media",
];

const layer = (
  id: number,
  colors: readonly number[] = DEMO_DEFAULT_COLORS[id],
  name = `L${id}`,
): DtsiLayer => ({
  id,
  name,
  colors: [...colors],
  keyNames: colors.map((_, slot) => `k${slot}`),
});

const allLayers = () => LAYER_IDS.map((id) => layer(id));

const hasNonAscii = (text: string) =>
  [...text].some((c) => c.charCodeAt(0) > 127);

/**
 * The slots of LED_SLOTS(left, right) in the order the macro takes them: for
 * each half, three rows of six keys, three thumb keys and six underglow LEDs.
 * Written here on its own, so a mistake in the exporter does not hide itself.
 */
const SLOT_ORDER: number[] = [
  // left
  0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 24, 25, 26, 27, 28, 29, 36, 37, 38,
  42, 43, 44, 45, 46, 47,
  // right
  6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35, 39, 40,
  41, 48, 49, 50, 51, 52, 53,
];

const NAME_TO_RGB = new Map<string, number>(PALETTE.map((c) => [c.id, c.rgb]));

/** Reads the exported text back: label of the map -> the color of each slot. */
function parse(text: string): Map<string, number[]> {
  const maps = new Map<string, number[]>();
  const noComments = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  const blocks = noComments.matchAll(
    /&(\w+)\s*\{\s*slot-colors\s*=\s*<LED_SLOTS\(([\s\S]*?)\)\s*>;\s*\};/g,
  );

  for (const [, label, args] of blocks) {
    const values = [...args.matchAll(/0x[0-9A-Fa-f]+|[A-Z]{3}/g)].map(([v]) => {
      const rgb = v.startsWith("0x") ? parseInt(v, 16) : NAME_TO_RGB.get(v);
      if (rgb === undefined) {
        throw new Error(`unknown color ${v}`);
      }
      return rgb;
    });

    expect(values).toHaveLength(DTSI_SLOT_COUNT);

    const colors = new Array<number>(DTSI_SLOT_COUNT).fill(-1);
    values.forEach((rgb, i) => {
      colors[SLOT_ORDER[i]] = rgb;
    });
    maps.set(label, colors);
  }

  return maps;
}

describe("canExportDtsi", () => {
  it("accepts the keyboard of the repository", () => {
    expect(canExportDtsi(54, LAYER_IDS)).toBe(true);
    expect(canExportDtsi(54, [...LAYER_IDS].reverse())).toBe(true);
  });

  it("refuses another number of LEDs", () => {
    expect(canExportDtsi(42, LAYER_IDS)).toBe(false);
  });

  it("refuses other layers", () => {
    expect(canExportDtsi(54, [0, 1, 2, 3, 4])).toBe(false);
    expect(canExportDtsi(54, [0, 1, 2, 3, 4, 5, 6])).toBe(false);
    expect(canExportDtsi(54, [0, 1, 2, 3, 4, 7])).toBe(false);
  });
});

describe("buildDtsi", () => {
  it("starts with the header of the repository file", () => {
    expect(buildDtsi(allLayers()).startsWith(DTSI_HEADER + "\n\n")).toBe(true);
  });

  it("has one block for each layer, in the order of the ids", () => {
    const text = buildDtsi([...allLayers()].reverse());

    expect([...parse(text).keys()]).toEqual(LABELS);
    for (const id of LAYER_IDS) {
      expect(text).toContain(`/* Camada ${id}: L${id} */`);
    }
  });

  it("writes the colors the keyboard has: reading it back gives them", () => {
    const parsed = parse(buildDtsi(allLayers()));

    LAYER_IDS.forEach((id, i) => {
      expect(parsed.get(LABELS[i])).toEqual([...DEMO_DEFAULT_COLORS[id]]);
    });
  });

  it("writes a color outside the palette as a 0xRRGGBB literal", () => {
    const colors = [...DEMO_DEFAULT_COLORS[1]];
    colors[0] = 0x123456;
    colors[53] = 0x00000a;

    const layers = allLayers();
    layers[1] = layer(1, colors);
    const text = buildDtsi(layers);

    expect(text).toContain("0x123456");
    expect(text).toContain("0x00000A");
    expect(parse(text).get("map_fn1")).toEqual(colors);
  });

  it("puts the names of the keys in the comments", () => {
    const layers = allLayers();
    layers[0].keyNames = layers[0].keyNames.map((_, slot) => `K${slot}`);
    const text = buildDtsi(layers);

    expect(text).toContain("/* K0 K1 K2 K3 K4 K5 */");
    expect(text).toContain("/* K36 K37 K38 (polegares) */");
    expect(text).toContain("/* K39 K40 K41 (polegares) */");
  });

  it("keeps the text of the comments harmless", () => {
    const layers = allLayers();
    layers[2] = { ...layers[2], name: "Mídia */ &x { };" };
    layers[2].keyNames[0] = "A*/B";
    const text = buildDtsi(layers);

    expect(hasNonAscii(text)).toBe(false);
    expect(text).toContain("/* Camada 2: Midia * / &x { }; */");
    // still six blocks and the same colors
    expect(parse(text).size).toBe(6);
  });

  it("is plain ASCII with Unix line endings", () => {
    const text = buildDtsi(allLayers());

    expect(hasNonAscii(text)).toBe(false);
    expect(text).not.toContain("\r");
    expect(text.endsWith("};\n")).toBe(true);
  });

  it("uses a placeholder for a key that has no name", () => {
    const layers = allLayers();
    layers[0].keyNames = layers[0].keyNames.map((_, slot) =>
      slot === 3 ? "" : `N${slot}`,
    );

    expect(buildDtsi(layers)).toContain("/* N0 N1 N2 k3 N4 N5 */");
  });
});
