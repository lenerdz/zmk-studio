/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The part of the turn of the view that needs no browser: the key it is kept
 * under and the reading of what was kept.
 */
import { describe, expect, it } from "vitest";
import { parseViewTurn, viewTurnKey } from "./useViewTurn";

describe("viewTurnKey", () => {
  it("is a key for each screen", () => {
    expect(viewTurnKey("left")).not.toBe(viewTurnKey("right"));
    expect(viewTurnKey("left")).toContain("left");
    expect(viewTurnKey("right")).toContain("right");
  });
});

describe("parseViewTurn", () => {
  it("reads the four turns", () => {
    expect(parseViewTurn("0")).toBe(0);
    expect(parseViewTurn("1")).toBe(1);
    expect(parseViewTurn("2")).toBe(2);
    expect(parseViewTurn("3")).toBe(3);
  });

  it("takes any whole number around the circle", () => {
    expect(parseViewTurn("4")).toBe(0);
    expect(parseViewTurn("5")).toBe(1);
    expect(parseViewTurn("-1")).toBe(3);
    expect(parseViewTurn(" 2 ")).toBe(2);
  });

  it("is 0 for what is not a whole number", () => {
    expect(parseViewTurn(null)).toBe(0);
    expect(parseViewTurn("")).toBe(0);
    expect(parseViewTurn("left")).toBe(0);
    expect(parseViewTurn("1.5")).toBe(0);
    expect(parseViewTurn("NaN")).toBe(0);
  });
});
