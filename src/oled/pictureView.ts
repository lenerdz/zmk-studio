/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The picture of the right screen as the settings say it: turned by quarter
 * turns, cut to a piece, and mixed with the widgets. Without React. The rules
 * are the ones of picture.c in the lenerdz/zmk-nice-oled fork (geometry_of and
 * picture_blit), which puts the picture on the canvas of the screen.
 *
 * Everything here is upright, the way the screen is looked at: the picture is
 * turned clockwise by the number of quarter turns, and the piece that shows (the
 * crop) is a rectangle of the picture as it is turned, counted from its top left
 * corner. A crop whose width or height is 0 is the whole picture.
 *
 * The crop travels in two settings that hold two bytes each: x and y in one
 * (x + 256 * y), the width and the height in the other (w + 256 * h). Each
 * number goes from 0 to 255, enough for a canvas of 160 pixels.
 */
import type { Rect } from "./oledGeometry";

export interface Size {
  w: number;
  h: number;
}

/** A piece of the picture as it is turned (x and y from its top left corner). */
export type Crop = Rect;

/** The number of quarter turns clockwise. */
export type Turn = 0 | 1 | 2 | 3;

/** How a lit pixel of the picture mixes with what is under it. */
export const MIX_ADD = 0;
export const MIX_INVERT = 1;

/** The settings of a picture the editor can hand to the keyboard. */
export interface CropSettings {
  xy: number;
  wh: number;
}

/** The turn held in 0 to 3, whatever number the setting holds. */
export function normalizeTurn(value: number): Turn {
  return ((((Math.round(value) % 4) + 4) % 4) as Turn);
}

/** The size of a picture turned by quarter turns: an odd number swaps the sides. */
export function turnedSize(size: Size, turn: number): Size {
  return normalizeTurn(turn) % 2 === 1
    ? { w: size.h, h: size.w }
    : { w: size.w, h: size.h };
}

/**
 * The CSS transform that turns a box of w x h pixels by quarter turns
 * clockwise about its top left corner and moves it back, so that the turned box
 * (h x w for an odd turn) has its top left corner where the box had it. Undefined
 * for no turn. The turn of the picture and the turn of the view are drawn with it.
 */
export function turnTransform(
  turn: number,
  w: number,
  h: number,
): string | undefined {
  switch (normalizeTurn(turn)) {
    case 1:
      return `translateX(${h}px) rotate(90deg)`;
    case 2:
      return `translate(${w}px, ${h}px) rotate(180deg)`;
    case 3:
      return `translateY(${w}px) rotate(270deg)`;
    default:
      return undefined;
  }
}

/** A turn one quarter further (1 is clockwise, -1 counterclockwise). */
export function nextTurn(turn: number, direction: 1 | -1): Turn {
  return normalizeTurn(turn + direction);
}

/** The two bytes a setting holds. */
export function unpackPair(value: number): [number, number] {
  const whole = Math.max(0, Math.round(value));
  return [whole & 255, (whole >> 8) & 255];
}

/** Two bytes in one setting. */
export function packPair(low: number, high: number): number {
  return (low & 255) | ((high & 255) << 8);
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** The crop held inside the picture: at least one pixel, none of it outside. */
export function clampCrop(crop: Crop, shape: Size): Crop {
  const x = clamp(Math.round(crop.x), 0, Math.max(shape.w - 1, 0));
  const y = clamp(Math.round(crop.y), 0, Math.max(shape.h - 1, 0));

  return {
    x,
    y,
    w: clamp(Math.round(crop.w), 1, Math.max(shape.w - x, 1)),
    h: clamp(Math.round(crop.h), 1, Math.max(shape.h - y, 1)),
  };
}

/** Whether a crop is all of the picture. */
export function isWhole(crop: Crop, shape: Size): boolean {
  return (
    crop.x === 0 && crop.y === 0 && crop.w === shape.w && crop.h === shape.h
  );
}

/**
 * The piece the keyboard shows for the two settings of the crop, in a picture
 * of this size: null for the whole picture (a width or a height of 0), the
 * crop held inside the picture otherwise (what goes past it is cut off, the way
 * the firmware does).
 */
export function readCrop(settings: CropSettings, shape: Size): Crop | null {
  const [x, y] = unpackPair(settings.xy);
  const [w, h] = unpackPair(settings.wh);

  if (w === 0 || h === 0) {
    return null;
  }

  const cx = Math.min(x, shape.w - 1);
  const cy = Math.min(y, shape.h - 1);

  return {
    x: cx,
    y: cy,
    w: Math.min(w, shape.w - cx),
    h: Math.min(h, shape.h - cy),
  };
}

/**
 * The two settings that make the crop. All of the picture (or no crop) is 0 and
 * 0, which is what the build has, so it is nothing the keyboard has to keep.
 */
export function writeCrop(crop: Crop | null, shape: Size): CropSettings {
  if (crop === null) {
    return { xy: 0, wh: 0 };
  }

  const held = clampCrop(crop, shape);
  if (isWhole(held, shape)) {
    return { xy: 0, wh: 0 };
  }

  return { xy: packPair(held.x, held.y), wh: packPair(held.w, held.h) };
}

/** The piece that shows: the crop, or all of the picture. */
export function pieceOf(crop: Crop | null, shape: Size): Crop {
  return crop ?? { x: 0, y: 0, w: shape.w, h: shape.h };
}

/**
 * The crop of a picture after it is turned a quarter of a turn: the same piece
 * of the picture, turned with it. `shape` is the size of the picture before the
 * turn. A point (u, v) of a picture that is turned clockwise goes to
 * (height - 1 - v, u), and counterclockwise to (v, width - 1 - u).
 */
export function rotateCrop(
  crop: Crop,
  shape: Size,
  direction: 1 | -1,
): Crop {
  return direction === 1
    ? { x: shape.h - crop.y - crop.h, y: crop.x, w: crop.h, h: crop.w }
    : { x: crop.y, y: shape.w - crop.x - crop.w, w: crop.h, h: crop.w };
}

/** Where a drag of the crop takes hold: the inside, an edge or a corner. */
export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

/**
 * What a pointer at (px, py), in pixels of the picture (fractions allowed),
 * would take hold of in a crop: an edge or a corner when it is within `slop`
 * pixels of one, the inside of the crop otherwise, and nothing outside it.
 */
export function cropHandleAt(
  crop: Crop,
  px: number,
  py: number,
  slop: number,
): CropHandle | null {
  const right = crop.x + crop.w;
  const bottom = crop.y + crop.h;
  const dl = Math.abs(px - crop.x);
  const dr = Math.abs(px - right);
  const dt = Math.abs(py - crop.y);
  const db = Math.abs(py - bottom);

  const insideX = px >= crop.x - slop && px <= right + slop;
  const insideY = py >= crop.y - slop && py <= bottom + slop;
  if (!insideX || !insideY) {
    return null;
  }

  // When the crop is thinner than two slops, the nearest edge wins
  const west = dl <= slop && dl <= dr;
  const east = dr <= slop && dr < dl;
  const north = dt <= slop && dt <= db;
  const south = db <= slop && db < dt;

  const vertical = north ? "n" : south ? "s" : "";
  const horizontal = west ? "w" : east ? "e" : "";
  const handle = `${vertical}${horizontal}`;

  return handle === "" ? "move" : (handle as CropHandle);
}

/**
 * The crop after a drag of `dx` and `dy` pixels of the picture from `start`,
 * holding the handle: the whole crop moves, or the edges the handle has. It
 * stays inside the picture and keeps at least a pixel of each side.
 */
export function dragCrop(
  handle: CropHandle,
  start: Crop,
  dx: number,
  dy: number,
  shape: Size,
): Crop {
  if (handle === "move") {
    return {
      x: clamp(start.x + dx, 0, Math.max(shape.w - start.w, 0)),
      y: clamp(start.y + dy, 0, Math.max(shape.h - start.h, 0)),
      w: start.w,
      h: start.h,
    };
  }

  let x = start.x;
  let y = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;

  if (handle.includes("w")) {
    x = clamp(start.x + dx, 0, right - 1);
  }
  if (handle.includes("e")) {
    right = clamp(right + dx, x + 1, shape.w);
  }
  if (handle.includes("n")) {
    y = clamp(start.y + dy, 0, bottom - 1);
  }
  if (handle.includes("s")) {
    bottom = clamp(bottom + dy, y + 1, shape.h);
  }

  return { x, y, w: right - x, h: bottom - y };
}

/**
 * The crop that has two pixels of the picture as opposite corners (both are
 * inside it), held inside the picture: the rectangle a drag outside the crop
 * draws.
 */
export function cropBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  shape: Size,
): Crop {
  const x = clamp(Math.min(a.x, b.x), 0, Math.max(shape.w - 1, 0));
  const y = clamp(Math.min(a.y, b.y), 0, Math.max(shape.h - 1, 0));
  const right = clamp(Math.max(a.x, b.x) + 1, x + 1, shape.w);
  const bottom = clamp(Math.max(a.y, b.y) + 1, y + 1, shape.h);

  return { x, y, w: right - x, h: bottom - y };
}
