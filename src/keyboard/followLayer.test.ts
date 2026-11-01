/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  FOLLOW_POLL_MS,
  layerToFollow,
  parseFollowLayer,
} from "./followLayer";

describe("layerToFollow", () => {
  it("goes to the layer of the first answer", () => {
    expect(layerToFollow(undefined, 0, 8)).toBe(0);
    expect(layerToFollow(undefined, 3, 8)).toBe(3);
  });

  it("goes to the new layer when the keyboard changes layer", () => {
    // FN1 pressed, then let go
    expect(layerToFollow(0, 1, 8)).toBe(1);
    expect(layerToFollow(1, 0, 8)).toBe(0);
    // another layer key pressed on top of it
    expect(layerToFollow(1, 3, 8)).toBe(3);
  });

  it("leaves the screen alone while the keyboard stays on the same layer", () => {
    // so a layer chosen in the list is not undone by the next answer
    expect(layerToFollow(0, 0, 8)).toBeUndefined();
    expect(layerToFollow(5, 5, 8)).toBeUndefined();
  });

  it("does nothing before the keyboard has answered", () => {
    expect(layerToFollow(undefined, undefined, 8)).toBeUndefined();
    expect(layerToFollow(2, undefined, 8)).toBeUndefined();
  });

  it("does nothing for a layer the keymap on the screen does not have", () => {
    expect(layerToFollow(0, 8, 8)).toBeUndefined();
    expect(layerToFollow(0, 20, 8)).toBeUndefined();
    expect(layerToFollow(0, -1, 8)).toBeUndefined();
    expect(layerToFollow(0, 1.5, 8)).toBeUndefined();
    expect(layerToFollow(0, Number.NaN, 8)).toBeUndefined();
  });

  it("waits for the keymap: with no layers loaded yet there is nowhere to go", () => {
    expect(layerToFollow(undefined, 0, 0)).toBeUndefined();
    expect(layerToFollow(undefined, 2, 0)).toBeUndefined();
  });

  it("goes to the layer once the keymap has arrived, if the screen never went there", () => {
    // the first answer came before the keymap: the caller keeps `last` as it was
    expect(layerToFollow(undefined, 2, 0)).toBeUndefined();
    expect(layerToFollow(undefined, 2, 8)).toBe(2);
  });

  it("follows the last layer of the keymap", () => {
    expect(layerToFollow(0, 7, 8)).toBe(7);
  });
});

describe("parseFollowLayer", () => {
  it("is on unless it was switched off", () => {
    expect(parseFollowLayer("true")).toBe(true);
    expect(parseFollowLayer("false")).toBe(false);
    expect(parseFollowLayer("")).toBe(true);
    expect(parseFollowLayer("yes")).toBe(true);
    expect(parseFollowLayer(null)).toBe(true);
    expect(parseFollowLayer(undefined)).toBe(true);
  });
});

describe("FOLLOW_POLL_MS", () => {
  it("is quick enough to feel immediate and not a flood", () => {
    expect(FOLLOW_POLL_MS).toBeGreaterThanOrEqual(100);
    expect(FOLLOW_POLL_MS).toBeLessThanOrEqual(300);
  });
});
