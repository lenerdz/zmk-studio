/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  contrastColor,
  hexToRgb,
  paletteName,
  PALETTE,
  rgbToDtsi,
  rgbToHex,
} from "./ledColors";

describe("palette", () => {
  it("has the 14 colors of config/led_colors.dtsi", () => {
    expect(PALETTE.map((c) => c.id)).toEqual([
      "OFF",
      "WHT",
      "RED",
      "ORG",
      "YEL",
      "LIM",
      "GRN",
      "TEA",
      "CYN",
      "SKY",
      "BLU",
      "PUR",
      "MAG",
      "PNK",
    ]);
  });

  it("has no repeated id, name or value", () => {
    for (const key of ["id", "name", "rgb"] as const) {
      const values = PALETTE.map((c) => c[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("has the values of the file", () => {
    const byId = Object.fromEntries(PALETTE.map((c) => [c.id, c.rgb]));
    expect(byId).toMatchObject({
      OFF: 0x000000,
      WHT: 0xffffff,
      RED: 0xff0000,
      ORG: 0xff8000,
      PUR: 0x8000ff,
      PNK: 0xff0080,
    });
  });
});

describe("rgbToHex and hexToRgb", () => {
  it("write six digits", () => {
    expect(rgbToHex(0xff8000)).toBe("#ff8000");
    expect(rgbToHex(0x0000ff)).toBe("#0000ff");
    expect(rgbToHex(0)).toBe("#000000");
  });

  it("ignore anything above 24 bits", () => {
    expect(rgbToHex(0xff123456)).toBe("#123456");
  });

  it("read #rrggbb, rrggbb and #rgb", () => {
    expect(hexToRgb("#ff8000")).toBe(0xff8000);
    expect(hexToRgb("FF8000")).toBe(0xff8000);
    expect(hexToRgb("  #f80 ")).toBe(0xff8800);
  });

  it("refuse text that is not a color", () => {
    for (const text of ["", "#", "#12", "#12345", "#1234567", "#gg0000", "red"]) {
      expect(hexToRgb(text)).toBeUndefined();
    }
  });

  it("make a round trip", () => {
    for (const { rgb } of PALETTE) {
      expect(hexToRgb(rgbToHex(rgb))).toBe(rgb);
    }
  });
});

describe("paletteName", () => {
  it("names the colors of the palette", () => {
    expect(paletteName(0x8000ff)).toBe("Purple");
    expect(paletteName(0)).toBe("Off");
  });

  it("has no name for other colors", () => {
    expect(paletteName(0x123456)).toBeUndefined();
  });
});

describe("rgbToDtsi", () => {
  it("uses the name of a palette color", () => {
    expect(rgbToDtsi(0x8000ff)).toBe("PUR");
    expect(rgbToDtsi(0)).toBe("OFF");
  });

  it("writes any other color as a 0xRRGGBB literal", () => {
    expect(rgbToDtsi(0x123456)).toBe("0x123456");
    expect(rgbToDtsi(0x00000a)).toBe("0x00000A");
  });
});

describe("contrastColor", () => {
  it("is black on light colors and white on dark ones", () => {
    expect(contrastColor(0xffffff)).toBe("#000000");
    expect(contrastColor(0xffff00)).toBe("#000000");
    expect(contrastColor(0x000000)).toBe("#ffffff");
    expect(contrastColor(0x0000ff)).toBe("#ffffff");
  });
});
