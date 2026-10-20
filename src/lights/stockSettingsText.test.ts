/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { stockSettingsText } from "./stockSettingsText";

describe("stockSettingsText", () => {
  it("is the original text for a firmware with only the keymap", () => {
    expect(stockSettingsText(false, false)).toBe("the stock keymap");
  });

  it("adds the light colors", () => {
    expect(stockSettingsText(true, false)).toBe(
      "the stock keymap and the stock light colors",
    );
  });

  it("adds the screen settings", () => {
    expect(stockSettingsText(false, true)).toBe(
      "the stock keymap and the stock screen settings",
    );
  });

  it("lists the three of them", () => {
    expect(stockSettingsText(true, true)).toBe(
      "the stock keymap, the stock light colors and the stock screen settings",
    );
  });
});
