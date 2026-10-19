/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { changedEntries } from "./useLedMaps";

describe("changedEntries", () => {
  it("lists the slots whose color is not the target", () => {
    expect(changedEntries([1, 2, 3, 4], [1, 9, 3, 8], 4)).toEqual([
      { slot: 1, rgb: 9 },
      { slot: 3, rgb: 8 },
    ]);
  });

  it("is empty when the maps are the same", () => {
    expect(changedEntries([1, 2, 3], [1, 2, 3], 3)).toEqual([]);
  });

  it("only looks at the slots the keyboard has", () => {
    // entries past the slot count are unused padding of the protocol
    expect(changedEntries([1, 2, 3, 4], [1, 2, 7, 7], 2)).toEqual([]);
  });
});
