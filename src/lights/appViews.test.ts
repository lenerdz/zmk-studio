/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { availableViews, viewToShow, type ViewOffers } from "./appViews";

describe("availableViews", () => {
  it("offers only the Keys tab to a keyboard with nothing else", () => {
    expect(availableViews()).toEqual(["keys"]);
    expect(availableViews({})).toEqual(["keys"]);
    expect(
      availableViews({
        lights: false,
        display: false,
        oled: false,
        files: false,
        diagnostics: false,
      }),
    ).toEqual(["keys"]);
  });

  it("adds the Lights tab when the firmware has the light maps", () => {
    expect(availableViews({ lights: true })).toEqual(["keys", "lights"]);
  });

  it("adds the Display tab when the firmware has the display settings", () => {
    expect(availableViews({ display: true })).toEqual(["keys", "display"]);
  });

  it("offers the first three, in the order of the header", () => {
    expect(availableViews({ lights: true, display: true })).toEqual([
      "keys",
      "lights",
      "display",
    ]);
  });

  it("adds the OLED tab when the firmware has the OLED layout", () => {
    expect(availableViews({ display: true, oled: true })).toEqual([
      "keys",
      "display",
      "oled",
    ]);
  });

  it("adds the Files tab for a keyboard that is connected and unlocked", () => {
    expect(availableViews({ files: true })).toEqual(["keys", "files"]);
  });

  it("adds the Diagnostics tab when the firmware tells what it is", () => {
    expect(availableViews({ diagnostics: true })).toEqual([
      "keys",
      "diagnostics",
    ]);
  });

  it("offers all six, in the order of the header", () => {
    expect(
      availableViews({
        diagnostics: true,
        files: true,
        oled: true,
        display: true,
        lights: true,
      }),
    ).toEqual(["keys", "lights", "display", "oled", "files", "diagnostics"]);
  });

  it("does not offer a tab unless it is asked for", () => {
    const offered = availableViews({ lights: true, display: true });

    expect(offered).not.toContain("oled");
    expect(offered).not.toContain("files");
    expect(offered).not.toContain("diagnostics");
  });
});

describe("viewToShow", () => {
  const all: ViewOffers = {
    lights: true,
    display: true,
    oled: true,
    files: true,
    diagnostics: true,
  };

  it("shows the tab that was asked for when the keyboard offers it", () => {
    expect(viewToShow("keys", {})).toBe("keys");
    expect(viewToShow("lights", { lights: true })).toBe("lights");
    expect(viewToShow("display", { display: true })).toBe("display");
    expect(viewToShow("display", { lights: true, display: true })).toBe(
      "display",
    );
    expect(viewToShow("oled", { display: true, oled: true })).toBe("oled");
    expect(viewToShow("files", { files: true })).toBe("files");
    expect(viewToShow("diagnostics", all)).toBe("diagnostics");
  });

  it("goes back to the Keys tab when the keyboard does not offer it", () => {
    expect(viewToShow("lights", { display: true })).toBe("keys");
    expect(viewToShow("display", { lights: true })).toBe("keys");
    expect(viewToShow("display", {})).toBe("keys");
    expect(viewToShow("oled", { lights: true, display: true })).toBe("keys");
    expect(viewToShow("oled", { lights: true, display: true, oled: false })).toBe(
      "keys",
    );
    expect(viewToShow("files", { lights: true })).toBe("keys");
    expect(viewToShow("diagnostics", { files: true })).toBe("keys");
  });

  it("goes back to the Keys tab when nothing is offered any more", () => {
    for (const view of ["lights", "display", "oled", "files", "diagnostics"] as const) {
      expect(viewToShow(view)).toBe("keys");
    }
  });
});
