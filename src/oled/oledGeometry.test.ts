/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  CANVAS,
  WINDOW,
  WINDOW_RECT,
  intersection,
  picturePosition,
  pictureRect,
  union,
  visibilityOf,
  visiblePixels,
} from "./oledGeometry";

describe("the canvas and the window", () => {
  it("has the canvas of nice!view and a window that is the OLED panel turned upright", () => {
    expect(CANVAS).toEqual({ width: 68, height: 160 });
    // The panel is 128 x 32 as it is mounted, so 32 x 128 upright
    expect(WINDOW.width).toBe(32);
    expect(WINDOW.height).toBe(128);
    // It shows the bottom of the canvas: from the row 32 to the row 159
    expect(WINDOW.y + WINDOW.height).toBe(CANVAS.height);
    expect(WINDOW_RECT).toEqual({ x: 0, y: 32, w: 32, h: 128 });
  });
});

describe("intersection", () => {
  it("gives the part two rectangles share", () => {
    expect(
      intersection({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 6, w: 10, h: 10 }),
    ).toEqual({ x: 5, y: 6, w: 5, h: 4 });
  });

  it("gives null for rectangles that only touch or are apart", () => {
    expect(
      intersection({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 }),
    ).toBeNull();
    expect(
      intersection({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 5, h: 5 }),
    ).toBeNull();
  });
});

describe("union", () => {
  it("is the smallest rectangle that holds them all", () => {
    expect(
      union([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 12, y: -5, w: 1, h: 21 },
      ]),
    ).toEqual({ x: 0, y: -5, w: 13, h: 21 });
  });

  it("is null for nothing", () => {
    expect(union([])).toBeNull();
  });
});

describe("what the panel shows of a rectangle", () => {
  it("shows all of a rectangle inside the window", () => {
    const rect = { x: 0, y: 34, w: 20, h: 11 };

    expect(visibilityOf(rect)).toBe("full");
    expect(visiblePixels(rect)).toBe(220);
  });

  it("shows only the part of a rectangle that is cut by the edge", () => {
    // Text of six letters of 8 pixels on a window that is 32 pixels wide
    const rect = { x: 0, y: 146, w: 48, h: 13 };

    expect(visibilityOf(rect)).toBe("partial");
    expect(visiblePixels(rect)).toBe(32 * 13);
  });

  it("shows nothing of a rectangle above the window", () => {
    // The battery text of the build is at y = 19, above the row 32
    const rect = { x: 0, y: 19, w: 48, h: 9 };

    expect(visibilityOf(rect)).toBe("none");
    expect(visiblePixels(rect)).toBe(0);
  });

  it("counts a rectangle that ends exactly at the edge as outside", () => {
    expect(visibilityOf({ x: 0, y: 20, w: 10, h: 12 })).toBe("none");
    expect(visibilityOf({ x: 0, y: 20, w: 10, h: 13 })).toBe("partial");
  });
});

describe("the picture of the right screen", () => {
  const animation = { w: 68, h: 69 };

  it("is at x = -18, y = 73 on the upright canvas with the position of the build", () => {
    expect(pictureRect(18, -18, animation)).toEqual({
      x: -18,
      y: 73,
      w: 68,
      h: 69,
    });
  });

  it("is cut by the window: the panel shows 32 of its 68 columns", () => {
    const rect = pictureRect(18, -18, animation);

    expect(visibilityOf(rect)).toBe("partial");
    expect(visiblePixels(rect)).toBe(32 * 69);
  });

  it("goes down the canvas when X goes down (X counts from the bottom)", () => {
    expect(pictureRect(0, 0, animation).y).toBe(160 - 69);
    expect(pictureRect(91, 0, animation).y).toBe(0);
  });

  it("goes right when Y goes up", () => {
    expect(pictureRect(18, 0, animation).x).toBe(0);
    expect(pictureRect(18, 10, animation).x).toBe(10);
  });

  it("gives the position back from the corner, for any size", () => {
    for (const size of [
      { w: 68, h: 69 },
      { w: 68, h: 160 },
      { w: 68, h: 140 },
    ]) {
      for (const [X, Y] of [
        [18, -18],
        [0, 0],
        [-30, 100],
        [320, -160],
      ]) {
        const rect = pictureRect(X, Y, size);

        expect(picturePosition(rect, size)).toEqual({ x: X, y: Y });
      }
    }
  });

  it("keeps the still image of 160 pixels where X = -y (it is as tall as the canvas)", () => {
    expect(pictureRect(-5, 3, { w: 68, h: 160 })).toEqual({
      x: 3,
      y: 5,
      w: 68,
      h: 160,
    });
  });
});
