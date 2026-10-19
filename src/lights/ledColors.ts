/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Constants and color helpers for the per-layer light maps of keyboards that
 * run the zmk-rgb-matrix module (see src/lights/README.md).
 */

/**
 * Number of entries in the LedMap message. The firmware always sends this many
 * (the protocol uses a fixed-size array); the entries from LedInfo.slotCount on
 * are zero and not used.
 */
export const LED_PROTOCOL_SLOTS = 54;

/** Most entries the firmware accepts in one set_led_colors request. */
export const LED_MAX_ENTRIES_PER_REQUEST = 16;

export interface PaletteColor {
  /** The name of the color in config/led_colors.dtsi. */
  id: string;
  name: string;
  /** 0xRRGGBB */
  rgb: number;
}

/**
 * The palette of config/led_colors.dtsi in lenerdz/corne-zmk: same names, same
 * values. A color that is not here is written as a 0xRRGGBB literal when the
 * map is exported.
 */
export const PALETTE: readonly PaletteColor[] = [
  { id: "OFF", name: "Off", rgb: 0x000000 },
  { id: "WHT", name: "White", rgb: 0xffffff },
  { id: "RED", name: "Red", rgb: 0xff0000 },
  { id: "ORG", name: "Orange", rgb: 0xff8000 },
  { id: "YEL", name: "Yellow", rgb: 0xffff00 },
  { id: "LIM", name: "Lime", rgb: 0x80ff00 },
  { id: "GRN", name: "Green", rgb: 0x00ff00 },
  { id: "TEA", name: "Teal", rgb: 0x00ff80 },
  { id: "CYN", name: "Cyan", rgb: 0x00ffff },
  { id: "SKY", name: "Sky", rgb: 0x0080ff },
  { id: "BLU", name: "Blue", rgb: 0x0000ff },
  { id: "PUR", name: "Purple", rgb: 0x8000ff },
  { id: "MAG", name: "Magenta", rgb: 0xff00ff },
  { id: "PNK", name: "Pink", rgb: 0xff0080 },
];

/** "#rrggbb" */
export function rgbToHex(rgb: number): string {
  return "#" + (rgb & 0xffffff).toString(16).padStart(6, "0");
}

/** Reads "#rgb", "#rrggbb" (the "#" is optional). Returns undefined if invalid. */
export function hexToRgb(text: string): number | undefined {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) {
    return undefined;
  }

  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((d) => d + d)
      .join("");
  }

  return parseInt(digits, 16);
}

/** The name of the color in the palette, or undefined. */
export function paletteName(rgb: number): string | undefined {
  return PALETTE.find((c) => c.rgb === (rgb & 0xffffff))?.name;
}

/** How a color is written in config/led_colors.dtsi: its palette name or 0xRRGGBB. */
export function rgbToDtsi(rgb: number): string {
  const color = PALETTE.find((c) => c.rgb === (rgb & 0xffffff));
  if (color) {
    return color.id;
  }

  return "0x" + (rgb & 0xffffff).toString(16).toUpperCase().padStart(6, "0");
}

/** Black or white, whichever reads better on top of the given color. */
export function contrastColor(rgb: number): string {
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 140 ? "#000000" : "#ffffff";
}
