/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Writes the light maps as config/led_colors.dtsi of lenerdz/corne-zmk, so the
 * colors made in the app can become the defaults the firmware is built with.
 * The slot order and the labels of the effects that hold the maps are the ones
 * of that repository (config/corne.keymap, config/corne_left.overlay and
 * config/corne_right.overlay).
 */
import { DTSI_HEADER } from "./dtsiTemplate";
import { rgbToDtsi } from "./ledColors";
import { toAscii } from "./text";

/** Slots of the Corne config: 0-41 keys, 42-47 left underglow, 48-53 right. */
export const DTSI_SLOT_COUNT = 54;

/**
 * The devicetree label of the effect that holds the map of each layer id (the
 * layer-id of each node in config/corne.keymap).
 */
const MAP_LABELS: Readonly<Record<number, string>> = {
  0: "fx_static",
  1: "map_fn1",
  2: "map_raise",
  3: "map_nav",
  4: "map_sys",
  5: "map_media",
  6: "map_steno",
};

interface HalfSlots {
  title: string;
  rows: number[][];
  thumbs: number[];
  /** Spaces before the thumb keys (the file lines them up under the left half). */
  thumbIndent: number;
  underglow: number[];
}

const range = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => from + i);

// The order of the values inside LED_SLOTS(left, right): the three rows of six
// keys, the three thumb keys and the six underglow LEDs of each half.
const HALVES: HalfSlots[] = [
  {
    title: "esquerda",
    rows: [range(0, 6), range(12, 6), range(24, 6)],
    thumbs: range(36, 3),
    thumbIndent: 24,
    underglow: range(42, 6),
  },
  {
    title: "direita",
    rows: [range(6, 6), range(18, 6), range(30, 6)],
    thumbs: range(39, 3),
    thumbIndent: 9,
    underglow: range(48, 6),
  },
];

export interface DtsiLayer {
  id: number;
  name: string;
  /** DTSI_SLOT_COUNT colors, 0xRRGGBB. */
  colors: number[];
  /** What each key position does on this layer, for the comments. */
  keyNames: string[];
}

/** Whether the keyboard has the structure config/led_colors.dtsi describes. */
export function canExportDtsi(slotCount: number, layerIds: number[]): boolean {
  return (
    slotCount === DTSI_SLOT_COUNT &&
    layerIds.length === Object.keys(MAP_LABELS).length &&
    layerIds.every((id) => id in MAP_LABELS)
  );
}

// Inside a block comment of the file: plain ASCII, and the text must not close it.
function commentText(text: string): string {
  return toAscii(text).replace(/\*\//g, "* /").trim();
}

function layerBlock(layer: DtsiLayer): string {
  const color = (slot: number) => rgbToDtsi(layer.colors[slot] ?? 0);
  const key = (slot: number) => commentText(layer.keyNames[slot] || `k${slot}`);

  const groups = HALVES.map((half) => {
    const lines: string[] = [];

    half.rows.forEach((row, index) => {
      const values = row.map(color).join(", ");
      const names = row.map(key).join(" ");
      const open = index === 0 ? "(" : " ";
      lines.push(`        ${open}${values}, /* ${names} */`);
    });

    const thumbValues = half.thumbs.map(color).join(", ");
    const thumbNames = half.thumbs.map(key).join(" ");
    lines.push(
      `${" ".repeat(half.thumbIndent)}${thumbValues}, /* ${thumbNames} (polegares) */`,
    );

    const glow = half.underglow.map(color).join(", ");
    lines.push(`         ${glow})/* underglow */`);

    return [`        /* ${half.title} */`, ...lines].join("\n");
  });

  const label = MAP_LABELS[layer.id];

  return [
    `/* Camada ${layer.id}: ${commentText(layer.name)} */`,
    `&${label} {`,
    `    slot-colors = <LED_SLOTS(`,
    `${groups[0]},`,
    ``,
    `${groups[1]}`,
    `    )>;`,
    `};`,
  ].join("\n");
}

/** The text of config/led_colors.dtsi for the given layers (in layer id order). */
export function buildDtsi(layers: DtsiLayer[]): string {
  const blocks = [...layers]
    .sort((a, b) => a.id - b.id)
    .map((layer) => layerBlock(layer));

  return DTSI_HEADER + "\n\n" + blocks.join("\n\n") + "\n";
}
