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

  it("offers the first three, in the order of the header", () => {
    expect(availableViews(true, true)).toEqual(["keys", "lights", "display"]);
  });

  it("adds the OLED tab when the firmware has the OLED layout", () => {
    expect(availableViews(false, true, true)).toEqual([
      "keys",
      "display",
      "oled",
    ]);
  });

  it("offers all four, in the order of the header", () => {
    expect(availableViews(true, true, true)).toEqual([
      "keys",
      "lights",
      "display",
      "oled",
    ]);
  });

  it("does not offer the OLED tab unless it is asked for", () => {
    expect(availableViews(true, true)).not.toContain("oled");
  });
});

describe("viewToShow", () => {
  it("shows the tab that was asked for when the keyboard offers it", () => {
    expect(viewToShow("keys", false, false)).toBe("keys");
    expect(viewToShow("lights", true, false)).toBe("lights");
    expect(viewToShow("display", false, true)).toBe("display");
    expect(viewToShow("display", true, true)).toBe("display");
    expect(viewToShow("oled", false, true, true)).toBe("oled");
  });

  it("goes back to the Keys tab when the keyboard does not offer it", () => {
    expect(viewToShow("lights", false, true)).toBe("keys");
    expect(viewToShow("display", true, false)).toBe("keys");
    expect(viewToShow("display", false, false)).toBe("keys");
    expect(viewToShow("oled", true, true)).toBe("keys");
    expect(viewToShow("oled", true, true, false)).toBe("keys");
  });
});
