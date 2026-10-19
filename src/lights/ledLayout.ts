/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Where each slot of a light map is drawn. The slot of a key LED is the position
 * of the key, so those are drawn on the key. The other slots (the underglow) have
 * no key: the keyboard does not report where they are, so they are drawn in a
 * strip under the keys, in the arrangement the firmware config gives them (the
 * Corne of lenerdz/corne-zmk) or in a plain row.
 */
import type { PhysicalLayout } from "@zmkfirmware/zmk-studio-ts-client/keymap";

export type LedSlotKind = "key" | "extra";

export interface LedSlotView {
  slot: number;
  kind: LedSlotKind;
  /** Name for the tooltip and for the buttons that act on a group. */
  label: string;
  /** A few characters to write inside the cell of an LED that has no key. */
  short?: string;
  /** "left" or "right" half of the keyboard. */
  half: "left" | "right";
  /** Position and size in key units (1 = the width of a key). */
  x: number;
  y: number;
  width: number;
  height: number;
  r?: number;
  rx?: number;
  ry?: number;
}

// The underglow of the Corne in lenerdz/corne-zmk: the coordinates the LEDs have
// in config/corne_left.overlay and config/corne_right.overlay (100 = one key),
// in slot order (slots 42-47 on the left, 48-53 on the right).
const CORNE_KEY_COUNT = 42;
const CORNE_SLOT_COUNT = 54;
const CORNE_UNDERGLOW: ReadonlyArray<[number, number]> = [
  [550, 144],
  [344, 126],
  [144, 168],
  [144, 273],
  [344, 332],
  [550, 356],
  [850, 144],
  [1056, 126],
  [1256, 168],
  [1256, 273],
  [1056, 332],
  [850, 356],
];

const EXTRA_SIZE = 0.5;
const EXTRA_GAP = 0.5;

/** The lowest edge of a key in layout units (1/100 of a key), rotation included. */
function keyBottom(key: PhysicalLayout["keys"][number]): number {
  const angle = ((key.r || 0) / 100) * (Math.PI / 180);
  if (!angle) {
    return key.y + key.height;
  }

  // Rotation is clockwise around (rx, ry), with y pointing down, like the CSS
  // rotate() that draws the key.
  const rx = key.rx || 0;
  const ry = key.ry || 0;
  const corners: Array<[number, number]> = [
    [key.x, key.y],
    [key.x + key.width, key.y],
    [key.x, key.y + key.height],
    [key.x + key.width, key.y + key.height],
  ];

  return Math.max(
    ...corners.map(
      ([px, py]) =>
        ry + (px - rx) * Math.sin(angle) + (py - ry) * Math.cos(angle),
    ),
  );
}

export function buildLedSlots(
  layout: PhysicalLayout,
  slotCount: number,
): LedSlotView[] {
  const keyCount = Math.min(layout.keys.length, slotCount);
  const slots: LedSlotView[] = [];

  const keyRights = layout.keys.map((k) => k.x + k.width);
  const keyLeft = Math.min(...layout.keys.map((k) => k.x));
  const center = (keyLeft + Math.max(...keyRights)) / 200;
  const bottom = Math.max(...layout.keys.map(keyBottom)) / 100;

  for (let slot = 0; slot < keyCount; slot++) {
    const key = layout.keys[slot];
    slots.push({
      slot,
      kind: "key",
      label: `Key ${slot}`,
      half: key.x / 100 + key.width / 200 < center ? "left" : "right",
      x: key.x / 100,
      y: key.y / 100,
      width: key.width / 100,
      height: key.height / 100,
      r: (key.r || 0) / 100,
      rx: (key.rx || 0) / 100,
      ry: (key.ry || 0) / 100,
    });
  }

  const extras = slotCount - keyCount;
  const isCorne =
    layout.keys.length === CORNE_KEY_COUNT && slotCount === CORNE_SLOT_COUNT;

  for (let i = 0; i < extras; i++) {
    const slot = keyCount + i;

    if (isCorne) {
      const [cx, cy] = CORNE_UNDERGLOW[i];
      const half = i < extras / 2 ? "left" : "right";
      const index = half === "left" ? i : i - extras / 2;
      slots.push({
        slot,
        kind: "extra",
        label: `Underglow ${half} ${index + 1}`,
        short: String(index + 1),
        half,
        // The ring of LEDs of each half, moved to a strip under the keys.
        x: cx / 100 - EXTRA_SIZE / 2,
        y: (cy - 126) / 100 + bottom + EXTRA_GAP - EXTRA_SIZE / 2,
        width: EXTRA_SIZE,
        height: EXTRA_SIZE,
      });
    } else {
      slots.push({
        slot,
        kind: "extra",
        label: `LED ${slot}`,
        short: String(slot),
        half: i < extras / 2 ? "left" : "right",
        x: i * (EXTRA_SIZE + 0.15),
        y: bottom + EXTRA_GAP,
        width: EXTRA_SIZE,
        height: EXTRA_SIZE,
      });
    }
  }

  return slots;
}
