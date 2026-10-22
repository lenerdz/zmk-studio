/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  clampCrop,
  cropBetween,
  cropHandleAt,
  dragCrop,
  isWhole,
  nextTurn,
  normalizeTurn,
  packPair,
  pieceOf,
  readCrop,
  rotateCrop,
  turnTransform,
  turnedSize,
  unpackPair,
  writeCrop,
  type Crop,
  type Size,
} from "./pictureView";

/** A picture of numbered pixels (the number says which pixel it is), by rows. */
function numbered(w: number, h: number): number[][] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => y * w + x),
  );
}

/** The picture turned a quarter of a turn: (u, v) goes to (h - 1 - v, u) clockwise. */
function turn(picture: number[][], direction: 1 | -1): number[][] {
  const h = picture.length;
  const w = picture[0].length;
  const out = Array.from({ length: w }, () => Array<number>(h).fill(-1));

  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      if (direction === 1) {
        out[u][h - 1 - v] = picture[v][u];
      } else {
        out[w - 1 - u][v] = picture[v][u];
      }
    }
  }
  return out;
}

/** The piece of a picture. */
function cut(picture: number[][], crop: Crop): number[][] {
  return picture
    .slice(crop.y, crop.y + crop.h)
    .map((row) => row.slice(crop.x, crop.x + crop.w));
}

describe("the turn", () => {
  it("is held in 0 to 3, whatever the setting says", () => {
    expect([0, 1, 2, 3, 4, 5, -1, -2, 7].map(normalizeTurn)).toEqual([
      0, 1, 2, 3, 0, 1, 3, 2, 3,
    ]);
  });

  it("goes a quarter further either way and comes round", () => {
    expect(nextTurn(0, 1)).toBe(1);
    expect(nextTurn(3, 1)).toBe(0);
    expect(nextTurn(0, -1)).toBe(3);
    expect(nextTurn(2, -1)).toBe(1);
  });

  it("swaps the sides of the picture at each quarter, and only then", () => {
    const size = { w: 68, h: 69 };

    expect(turnedSize(size, 0)).toEqual({ w: 68, h: 69 });
    expect(turnedSize(size, 1)).toEqual({ w: 69, h: 68 });
    expect(turnedSize(size, 2)).toEqual({ w: 68, h: 69 });
    expect(turnedSize(size, 3)).toEqual({ w: 69, h: 68 });
    expect(turnedSize(size, 5)).toEqual({ w: 69, h: 68 });
  });
});

describe("the transform that draws a turn", () => {
  /** Where a point of a w x h box goes under the transform (the box turns about its top left corner). */
  function where(turn: number, w: number, h: number, x: number, y: number) {
    const quarter = ((turn % 4) + 4) % 4;
    // A quarter clockwise is (x, y) -> (-y, x), about the corner
    let [px, py] = [x, y];
    for (let i = 0; i < quarter; i++) {
      [px, py] = [-py, px];
    }
    const moves: Record<number, [number, number]> = {
      0: [0, 0],
      1: [h, 0],
      2: [w, h],
      3: [0, w],
    };
    return [px + moves[quarter][0], py + moves[quarter][1]];
  }

  it("is nothing for no turn", () => {
    expect(turnTransform(0, 68, 69)).toBeUndefined();
    expect(turnTransform(4, 68, 69)).toBeUndefined();
  });

  it("turns about the corner and moves the box back to it, by the sides it has", () => {
    expect(turnTransform(1, 68, 69)).toBe("translateX(69px) rotate(90deg)");
    expect(turnTransform(2, 68, 69)).toBe("translate(68px, 69px) rotate(180deg)");
    expect(turnTransform(3, 68, 69)).toBe("translateY(68px) rotate(270deg)");
    expect(turnTransform(-1, 68, 69)).toBe(turnTransform(3, 68, 69));
  });

  it("puts the corners of the box in the corners of the turned box", () => {
    // The top left corner of the picture goes to the top right after a quarter clockwise
    expect(where(1, 68, 69, 0, 0)).toEqual([69, 0]);
    expect(where(1, 68, 69, 68, 0)).toEqual([69, 68]);
    expect(where(1, 68, 69, 0, 69)).toEqual([0, 0]);
    // Half a turn swaps opposite corners
    expect(where(2, 68, 69, 0, 0)).toEqual([68, 69]);
    expect(where(2, 68, 69, 68, 69)).toEqual([0, 0]);
    // Three quarters: the top left corner goes to the bottom left
    expect(where(3, 68, 69, 0, 0)).toEqual([0, 68]);
    expect(where(3, 68, 69, 68, 0)).toEqual([0, 0]);
  });
});

describe("the two bytes of a setting", () => {
  it("hold the first number in the low byte and the second one in the high byte", () => {
    expect(packPair(3, 4)).toBe(3 + 256 * 4);
    expect(unpackPair(packPair(3, 4))).toEqual([3, 4]);
    expect(unpackPair(packPair(255, 255))).toEqual([255, 255]);
    expect(unpackPair(0)).toEqual([0, 0]);
  });

  it("cut off what does not fit a byte", () => {
    expect(packPair(256, 0)).toBe(0);
    expect(packPair(0, 257)).toBe(256);
  });
});

describe("the crop the keyboard reads", () => {
  const shape: Size = { w: 32, h: 64 };

  it("is the whole picture when the width or the height is 0", () => {
    expect(readCrop({ xy: 0, wh: 0 }, shape)).toBeNull();
    expect(readCrop({ xy: packPair(5, 6), wh: packPair(0, 10) }, shape)).toBeNull();
    expect(readCrop({ xy: packPair(5, 6), wh: packPair(10, 0) }, shape)).toBeNull();
  });

  it("is the piece the two settings give", () => {
    expect(
      readCrop({ xy: packPair(4, 10), wh: packPair(20, 30) }, shape),
    ).toEqual({ x: 4, y: 10, w: 20, h: 30 });
  });

  it("is cut off at the edge of the picture, the way the firmware does", () => {
    expect(
      readCrop({ xy: packPair(30, 60), wh: packPair(20, 30) }, shape),
    ).toEqual({ x: 30, y: 60, w: 2, h: 4 });
    // A corner past the picture is held on its last pixel
    expect(
      readCrop({ xy: packPair(200, 200), wh: packPair(5, 5) }, shape),
    ).toEqual({ x: 31, y: 63, w: 1, h: 1 });
  });
});

describe("the crop the editor writes", () => {
  const shape: Size = { w: 32, h: 64 };

  it("is 0 and 0 for no crop and for a crop of the whole picture", () => {
    expect(writeCrop(null, shape)).toEqual({ xy: 0, wh: 0 });
    expect(writeCrop({ x: 0, y: 0, w: 32, h: 64 }, shape)).toEqual({
      xy: 0,
      wh: 0,
    });
    // More than the picture is the whole picture too
    expect(writeCrop({ x: 0, y: 0, w: 500, h: 500 }, shape)).toEqual({
      xy: 0,
      wh: 0,
    });
  });

  it("packs the piece, and reading it back gives the same piece", () => {
    const crop = { x: 4, y: 10, w: 20, h: 30 };
    const settings = writeCrop(crop, shape);

    expect(settings).toEqual({ xy: 4 + 256 * 10, wh: 20 + 256 * 30 });
    expect(readCrop(settings, shape)).toEqual(crop);
  });

  it("holds a crop that is out of the picture inside it first", () => {
    const settings = writeCrop({ x: 30, y: 60, w: 20, h: 30 }, shape);

    expect(readCrop(settings, shape)).toEqual({ x: 30, y: 60, w: 2, h: 4 });
  });

  it("keeps a piece of one pixel (a width of 0 would be the whole picture)", () => {
    const settings = writeCrop({ x: 5, y: 5, w: 0, h: 0 }, shape);

    expect(readCrop(settings, shape)).toEqual({ x: 5, y: 5, w: 1, h: 1 });
  });
});

describe("clamping a crop", () => {
  const shape: Size = { w: 32, h: 64 };

  it("rounds it and holds it inside the picture", () => {
    expect(clampCrop({ x: -3, y: 2.6, w: 10, h: 100 }, shape)).toEqual({
      x: 0,
      y: 3,
      w: 10,
      h: 61,
    });
  });

  it("knows the whole picture", () => {
    expect(isWhole({ x: 0, y: 0, w: 32, h: 64 }, shape)).toBe(true);
    expect(isWhole({ x: 0, y: 0, w: 32, h: 63 }, shape)).toBe(false);
    expect(isWhole({ x: 1, y: 0, w: 31, h: 64 }, shape)).toBe(false);
  });

  it("gives the whole picture as the piece of no crop", () => {
    expect(pieceOf(null, shape)).toEqual({ x: 0, y: 0, w: 32, h: 64 });
    expect(pieceOf({ x: 1, y: 2, w: 3, h: 4 }, shape)).toEqual({
      x: 1,
      y: 2,
      w: 3,
      h: 4,
    });
  });
});

describe("turning the crop with the picture", () => {
  const w = 5;
  const h = 3;
  const crops: Crop[] = [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 1, y: 0, w: 3, h: 2 },
    { x: 2, y: 1, w: 3, h: 2 },
    { x: 0, y: 0, w: 5, h: 3 },
    { x: 4, y: 2, w: 1, h: 1 },
  ];

  for (const direction of [1, -1] as const) {
    it(`keeps the piece that shows the same pixels, turning ${
      direction === 1 ? "clockwise" : "counterclockwise"
    }`, () => {
      const picture = numbered(w, h);

      for (const crop of crops) {
        const turned = rotateCrop(crop, { w, h }, direction);

        expect(cut(turn(picture, direction), turned)).toEqual(
          turn(cut(picture, crop), direction),
        );
      }
    });
  }

  it("is undone by the turn the other way", () => {
    for (const crop of crops) {
      const there = rotateCrop(crop, { w, h }, 1);
      const back = rotateCrop(there, { w: h, h: w }, -1);

      expect(back).toEqual(crop);
    }
  });

  it("is the same after four quarters", () => {
    for (const crop of crops) {
      let shape: Size = { w, h };
      let now = crop;

      for (let i = 0; i < 4; i++) {
        now = rotateCrop(now, shape, 1);
        shape = { w: shape.h, h: shape.w };
      }
      expect(now).toEqual(crop);
    }
  });
});

describe("the handle a pointer takes hold of", () => {
  const crop: Crop = { x: 10, y: 20, w: 12, h: 16 };

  it("is the inside of the crop away from its edges, to move it", () => {
    expect(cropHandleAt(crop, 16, 28, 1.5)).toBe("move");
  });

  it("is an edge near one, and a corner near two", () => {
    expect(cropHandleAt(crop, 10.5, 28, 1.5)).toBe("w");
    expect(cropHandleAt(crop, 21.8, 28, 1.5)).toBe("e");
    expect(cropHandleAt(crop, 16, 20.4, 1.5)).toBe("n");
    expect(cropHandleAt(crop, 16, 36.5, 1.5)).toBe("s");
    expect(cropHandleAt(crop, 10, 20, 1.5)).toBe("nw");
    expect(cropHandleAt(crop, 22, 20, 1.5)).toBe("ne");
    expect(cropHandleAt(crop, 10, 36, 1.5)).toBe("sw");
    expect(cropHandleAt(crop, 22.5, 36.5, 1.5)).toBe("se");
  });

  it("is nothing away from the crop", () => {
    expect(cropHandleAt(crop, 0, 0, 1.5)).toBeNull();
    expect(cropHandleAt(crop, 30, 28, 1.5)).toBeNull();
    expect(cropHandleAt(crop, 16, 50, 1.5)).toBeNull();
  });

  it("is the nearest edge when the crop is thinner than the slop", () => {
    const thin: Crop = { x: 10, y: 20, w: 1, h: 16 };

    expect(cropHandleAt(thin, 10.2, 28, 1.5)).toBe("w");
    expect(cropHandleAt(thin, 10.9, 28, 1.5)).toBe("e");
  });
});

describe("dragging the crop", () => {
  const shape: Size = { w: 32, h: 64 };
  const start: Crop = { x: 10, y: 20, w: 12, h: 16 };

  it("moves the whole piece, and holds it inside the picture", () => {
    expect(dragCrop("move", start, 3, -4, shape)).toEqual({
      x: 13,
      y: 16,
      w: 12,
      h: 16,
    });
    expect(dragCrop("move", start, 100, 100, shape)).toEqual({
      x: 20,
      y: 48,
      w: 12,
      h: 16,
    });
    expect(dragCrop("move", start, -100, -100, shape)).toEqual({
      x: 0,
      y: 0,
      w: 12,
      h: 16,
    });
  });

  it("moves the edges the handle has and no others", () => {
    expect(dragCrop("e", start, 5, 9, shape)).toEqual({
      x: 10,
      y: 20,
      w: 17,
      h: 16,
    });
    expect(dragCrop("w", start, -4, 9, shape)).toEqual({
      x: 6,
      y: 20,
      w: 16,
      h: 16,
    });
    expect(dragCrop("n", start, 9, 5, shape)).toEqual({
      x: 10,
      y: 25,
      w: 12,
      h: 11,
    });
    expect(dragCrop("s", start, 9, -6, shape)).toEqual({
      x: 10,
      y: 20,
      w: 12,
      h: 10,
    });
    expect(dragCrop("se", start, 2, 3, shape)).toEqual({
      x: 10,
      y: 20,
      w: 14,
      h: 19,
    });
    expect(dragCrop("nw", start, -2, -3, shape)).toEqual({
      x: 8,
      y: 17,
      w: 14,
      h: 19,
    });
  });

  it("keeps a pixel of each side and does not cross the opposite edge", () => {
    expect(dragCrop("e", start, -100, 0, shape)).toEqual({
      x: 10,
      y: 20,
      w: 1,
      h: 16,
    });
    expect(dragCrop("w", start, 100, 0, shape)).toEqual({
      x: 21,
      y: 20,
      w: 1,
      h: 16,
    });
    expect(dragCrop("s", start, 0, -100, shape)).toEqual({
      x: 10,
      y: 20,
      w: 12,
      h: 1,
    });
  });

  it("does not go out of the picture", () => {
    expect(dragCrop("se", start, 100, 100, shape)).toEqual({
      x: 10,
      y: 20,
      w: 22,
      h: 44,
    });
    expect(dragCrop("nw", start, -100, -100, shape)).toEqual({
      x: 0,
      y: 0,
      w: 22,
      h: 36,
    });
  });
});

describe("drawing a new crop", () => {
  const shape: Size = { w: 32, h: 64 };

  it("has both pixels in it, whichever corner comes first", () => {
    expect(cropBetween({ x: 4, y: 5 }, { x: 9, y: 12 }, shape)).toEqual({
      x: 4,
      y: 5,
      w: 6,
      h: 8,
    });
    expect(cropBetween({ x: 9, y: 12 }, { x: 4, y: 5 }, shape)).toEqual({
      x: 4,
      y: 5,
      w: 6,
      h: 8,
    });
  });

  it("is one pixel when both are the same, and stays inside the picture", () => {
    expect(cropBetween({ x: 7, y: 7 }, { x: 7, y: 7 }, shape)).toEqual({
      x: 7,
      y: 7,
      w: 1,
      h: 1,
    });
    expect(cropBetween({ x: -5, y: -5 }, { x: 100, y: 100 }, shape)).toEqual({
      x: 0,
      y: 0,
      w: 32,
      h: 64,
    });
  });
});
