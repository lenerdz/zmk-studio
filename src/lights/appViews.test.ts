/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { availableViews, viewToShow } from "./appViews";

describe("availableViews", () => {
  it("offers only the Keys tab to a keyboard with nothing else", () => {
    expect(availableViews(false, false)).toEqual(["keys"]);
  });

  it("adds the Lights tab when the firmware has the light maps", () => {
    expect(availableViews(true, false)).toEqual(["keys", "lights"]);
  });

  it("adds the Display tab when the firmware has the display settings", () => {
    expect(availableViews(false, true)).toEqual(["keys", "display"]);
  });

  it("offers all three, in the order of the header", () => {
    expect(availableViews(true, true)).toEqual(["keys", "lights", "display"]);
  });
});

describe("viewToShow", () => {
  it("shows the tab that was asked for when the keyboard offers it", () => {
    expect(viewToShow("keys", false, false)).toBe("keys");
    expect(viewToShow("lights", true, false)).toBe("lights");
    expect(viewToShow("display", false, true)).toBe("display");
    expect(viewToShow("display", true, true)).toBe("display");
  });

  it("goes back to the Keys tab when the keyboard does not offer it", () => {
    expect(viewToShow("lights", false, true)).toBe("keys");
    expect(viewToShow("display", true, false)).toBe("keys");
    expect(viewToShow("display", false, false)).toBe("keys");
  });
});
