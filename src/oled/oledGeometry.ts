/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Where things are on the OLED screens of zmk-nice-oled, and the arithmetic the
 * editor needs: rectangles, what part of one the screen shows, and the two
 * systems of coordinates of the right screen.
 *
 * The widgets are drawn on a canvas of 68 x 160 pixels (the viewer canvas of
 * nice!view, a 160 x 160 buffer of which 68 x 160 is used) that is rotated by
 * 270 degrees before it is sent to the 128 x 32 panel. The panel therefore shows
 * only a strip of the canvas, 32 pixels wide and 128 pixels tall, from the row
 * 32 down. Everything in the app is upright: x goes right and y goes down, the
 * way the screen is looked at when the keyboard is on the desk.
 */

/** The canvas the widgets are drawn on. */
export const CANVAS = { width: 68, height: 160 } as const;

/** The part of the canvas the OLED panel shows (rows 32 to 159, columns 0 to 31). */
export const WINDOW = { x: 0, y: 32, width: 32, height: 128 } as const;

/** The size of the panel as it is mounted on the keyboard (landscape). */
export const PANEL = { width: 128, height: 32 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Visibility = "full" | "partial" | "none";

export const WINDOW_RECT: Rect = {
  x: WINDOW.x,
  y: WINDOW.y,
  w: WINDOW.width,
  h: WINDOW.height,
};

/** The part two rectangles share, or null when they do not touch. */
export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
}

/** The smallest rectangle that holds all of them; null for none. */
export function union(rects: Rect[]): Rect | null {
  if (rects.length === 0) {
    return null;
  }

  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));

  return { x, y, w: right - x, h: bottom - y };
}

/** How many pixels of a rectangle the panel shows. */
export function visiblePixels(rect: Rect): number {
  const shared = intersection(rect, WINDOW_RECT);
  return shared ? shared.w * shared.h : 0;
}

/** Whether the panel shows all of a rectangle, a part of it or nothing. */
export function visibilityOf(rect: Rect): Visibility {
  const shown = visiblePixels(rect);
  if (shown === 0) {
    return "none";
  }
  return shown === rect.w * rect.h ? "full" : "partial";
}

/*
 * The picture of the right screen (the animation or the still image) is not
 * placed like the other widgets. The firmware places it on the landscape canvas
 * of the panel: its position (X, Y) is the corner of the picture as the panel
 * is mounted, which is the canvas turned by 90 degrees. The editor works on the
 * upright canvas, so it converts both ways with these two functions.
 *
 *   upright x = Y                      upright y = 160 - X - height
 *   X = 160 - upright y - height       Y = upright x
 *
 * where height is the height of the picture as it is looked at (69 for the
 * animations). With the position of the build, X = 18 and Y = -18, an animation
 * of 68 x 69 is at x = -18, y = 73 on the upright canvas.
 */

/** The upright rectangle of a picture whose position setting is (X, Y). */
export function pictureRect(
  X: number,
  Y: number,
  size: Pick<Rect, "w" | "h">,
): Rect {
  return { x: Y, y: CANVAS.height - X - size.h, w: size.w, h: size.h };
}

/** The position setting (X, Y) of a picture whose upright corner is (x, y). */
export function picturePosition(
  corner: { x: number; y: number },
  size: Pick<Rect, "h">,
): { x: number; y: number } {
  return { x: CANVAS.height - corner.y - size.h, y: corner.x };
}
