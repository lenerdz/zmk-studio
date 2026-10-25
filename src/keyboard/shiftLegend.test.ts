/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { hid_usage_get_labels } from "../hid-usages";
import {
  DEFAULT_SHIFT_LAYOUT,
  SHIFT_LAYOUTS,
  keyLegend,
  parseShiftLayout,
  withShiftLegend,
} from "./shiftLegend";

const KEYBOARD = 0x07;
const CONSUMER = 0x0c;

// A usage as ZMK writes it: implicit modifiers in the top byte, then the page and the id.
const usage = (id: number, modifiers = 0, page = KEYBOARD) =>
  modifiers * 0x1000000 + page * 0x10000 + id;

const LEFT_SHIFT = 0x02;
const RIGHT_SHIFT = 0x20;
const LEFT_CTRL = 0x01;
const LEFT_ALT = 0x04;
const RIGHT_ALT = 0x40;
const LEFT_GUI = 0x08;

const N1 = 0x1e;
const N6 = 0x23;
const N0 = 0x27;
const A = 0x04;
const Z = 0x1d;

describe("the choice of layout", () => {
  it("offers off, US and ABNT2, with the default among them", () => {
    expect(SHIFT_LAYOUTS.map((l) => l.value)).toEqual(["off", "us", "abnt2"]);
    expect(SHIFT_LAYOUTS.map((l) => l.value)).toContain(DEFAULT_SHIFT_LAYOUT);
    expect(new Set(SHIFT_LAYOUTS.map((l) => l.label)).size).toBe(3);
  });

  it("reads a saved choice and falls back to the default for anything else", () => {
    expect(parseShiftLayout("off")).toBe("off");
    expect(parseShiftLayout("us")).toBe("us");
    expect(parseShiftLayout("abnt2")).toBe("abnt2");
    expect(parseShiftLayout("dvorak")).toBe(DEFAULT_SHIFT_LAYOUT);
    expect(parseShiftLayout("")).toBe(DEFAULT_SHIFT_LAYOUT);
    expect(parseShiftLayout(null)).toBe(DEFAULT_SHIFT_LAYOUT);
    expect(parseShiftLayout(undefined)).toBe(DEFAULT_SHIFT_LAYOUT);
  });
});

describe("keyLegend on the US layout", () => {
  it("gives the signs of the number row", () => {
    const row = [N1, N1 + 1, N1 + 2, N1 + 3, N1 + 4, N6, N6 + 1, N6 + 2, N6 + 3, N0];

    expect(row.map((id) => keyLegend(usage(id), "us").shifted).join("")).toBe(
      "!@#$%^&*()",
    );
  });

  it("gives the other signs", () => {
    const shifted = (id: number) => keyLegend(usage(id), "us").shifted;

    expect(shifted(0x2d)).toBe("_"); // -
    expect(shifted(0x2e)).toBe("+"); // =
    expect(shifted(0x2f)).toBe("{"); // [
    expect(shifted(0x30)).toBe("}"); // ]
    expect(shifted(0x31)).toBe("|"); // \
    expect(shifted(0x33)).toBe(":"); // ;
    expect(shifted(0x34)).toBe('"'); // '
    expect(shifted(0x35)).toBe("~"); // `
    expect(shifted(0x36)).toBe("<"); // ,
    expect(shifted(0x37)).toBe(">"); // .
    expect(shifted(0x38)).toBe("?"); // /
    expect(shifted(0x64)).toBe("|"); // Non-US \
  });

  it("leaves the label of the usage as it is", () => {
    for (const id of [N1, 0x2d, 0x33, 0x38]) {
      expect(keyLegend(usage(id), "us").main).toBeUndefined();
    }
  });

  it("has nothing for letters, which are drawn as capitals", () => {
    for (let id = A; id <= Z; id++) {
      expect(keyLegend(usage(id), "us")).toEqual({});
    }
  });

  it("has nothing for keys that print nothing different with Shift", () => {
    // Enter, Escape, Backspace, Tab, Space, arrows, F1, the modifiers
    for (const id of [0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x4f, 0x50, 0x3a, 0xe0, 0xe1, 0xe5]) {
      expect(keyLegend(usage(id), "us")).toEqual({});
    }
  });

  it("has nothing for the keys of another usage page", () => {
    // the same numbers on the consumer page are volume and brightness keys
    for (const id of [N1, 0x2d, 0xe9, 0xea, 0x6f]) {
      expect(keyLegend(usage(id, 0, CONSUMER), "us")).toEqual({});
    }
  });
});

describe("keyLegend with the Shift of the usage itself", () => {
  it("draws the key as what it prints, with nothing in parentheses", () => {
    // &kp EXCL is LS(N1)
    expect(keyLegend(usage(N1, LEFT_SHIFT), "us")).toEqual({ main: "!" });
    expect(keyLegend(usage(0x34, LEFT_SHIFT), "us")).toEqual({ main: '"' });
    // the right Shift counts the same
    expect(keyLegend(usage(N1, RIGHT_SHIFT), "us")).toEqual({ main: "!" });
    // both
    expect(keyLegend(usage(N1, LEFT_SHIFT | RIGHT_SHIFT), "us")).toEqual({ main: "!" });
  });

  it("leaves a shifted letter alone: its label is a capital already", () => {
    expect(keyLegend(usage(A, LEFT_SHIFT), "us")).toEqual({});
    expect(keyLegend(usage(A, LEFT_SHIFT), "abnt2")).toEqual({});
  });

  it("adds nothing when another modifier is with the Shift", () => {
    expect(keyLegend(usage(N1, LEFT_SHIFT | LEFT_CTRL), "us")).toEqual({});
    expect(keyLegend(usage(N1, LEFT_SHIFT | RIGHT_ALT), "abnt2")).toEqual({});
  });

  it("adds nothing for Ctrl, Alt or GUI alone: they change what the key does, not what it prints", () => {
    for (const modifiers of [LEFT_CTRL, LEFT_ALT, RIGHT_ALT, LEFT_GUI]) {
      expect(keyLegend(usage(N1, modifiers), "us")).toEqual({});
      expect(keyLegend(usage(0x33, modifiers), "abnt2")).toEqual({});
    }
  });

  it("works for usages above the signed 32 bit range (right GUI is 0x80)", () => {
    expect(keyLegend(usage(N1, 0x80), "us")).toEqual({});
    expect(keyLegend(usage(N1, 0x80 | LEFT_SHIFT), "us")).toEqual({});
  });
});

describe("keyLegend with the legend off", () => {
  it("is empty for every usage", () => {
    for (const id of [N1, 0x2d, 0x33, 0x87]) {
      expect(keyLegend(usage(id), "off")).toEqual({});
      expect(keyLegend(usage(id, LEFT_SHIFT), "off")).toEqual({});
    }
  });
});

describe("keyLegend on the ABNT2 layout", () => {
  it("gives the signs of the number row, with the diaeresis on 6", () => {
    const row = [N1, N1 + 1, N1 + 2, N1 + 3, N1 + 4, N6, N6 + 1, N6 + 2, N6 + 3, N0];

    expect(row.map((id) => keyLegend(usage(id), "abnt2").shifted).join("")).toBe(
      "!@#$%¨&*()",
    );
    // the digits themselves are the labels already
    expect(keyLegend(usage(N1), "abnt2").main).toBeUndefined();
  });

  it("changes the label and the legend of the keys that print something else", () => {
    expect(keyLegend(usage(0x2f), "abnt2")).toEqual({ main: "´", shifted: "`" });
    expect(keyLegend(usage(0x30), "abnt2")).toEqual({ main: "[", shifted: "{" });
    expect(keyLegend(usage(0x31), "abnt2")).toEqual({ main: "]", shifted: "}" });
    expect(keyLegend(usage(0x32), "abnt2")).toEqual({ main: "]", shifted: "}" });
    expect(keyLegend(usage(0x34), "abnt2")).toEqual({ main: "~", shifted: "^" });
    expect(keyLegend(usage(0x35), "abnt2")).toEqual({ main: "'", shifted: '"' });
    expect(keyLegend(usage(0x38), "abnt2")).toEqual({ main: ";", shifted: ":" });
    expect(keyLegend(usage(0x64), "abnt2")).toEqual({ main: "\\", shifted: "|" });
    expect(keyLegend(usage(0x87), "abnt2")).toEqual({ main: "/", shifted: "?" });
  });

  it("draws the key of the cedilla as a capital, with no legend", () => {
    expect(keyLegend(usage(0x33), "abnt2")).toEqual({ main: "Ç" });
    expect(keyLegend(usage(0x33, LEFT_SHIFT), "abnt2")).toEqual({ main: "Ç" });
  });

  it("keeps the signs that are the same as on the US layout", () => {
    for (const id of [0x2d, 0x2e, 0x36, 0x37]) {
      expect(keyLegend(usage(id), "abnt2").shifted).toBe(
        keyLegend(usage(id), "us").shifted,
      );
      expect(keyLegend(usage(id), "abnt2").main).toBeUndefined();
    }
  });

  it("draws a key with the Shift of the usage as what it prints on this layout", () => {
    expect(keyLegend(usage(N6, LEFT_SHIFT), "abnt2")).toEqual({ main: "¨" });
    expect(keyLegend(usage(0x38, LEFT_SHIFT), "abnt2")).toEqual({ main: ":" });
    expect(keyLegend(usage(0x35, LEFT_SHIFT), "abnt2")).toEqual({ main: '"' });
    expect(keyLegend(usage(0x87, LEFT_SHIFT), "abnt2")).toEqual({ main: "?" });
  });

  it("has an entry for every place the US table has one", () => {
    for (let id = 0; id <= 0xff; id++) {
      if (keyLegend(usage(id), "us").shifted !== undefined) {
        expect(keyLegend(usage(id), "abnt2")).not.toEqual({});
      }
    }
  });

  it("has nothing for letters or for the other usage pages", () => {
    expect(keyLegend(usage(A), "abnt2")).toEqual({});
    expect(keyLegend(usage(Z), "abnt2")).toEqual({});
    expect(keyLegend(usage(N1, 0, CONSUMER), "abnt2")).toEqual({});
  });
});

describe("withShiftLegend", () => {
  it("puts the sign in parentheses after the label", () => {
    expect(withShiftLegend("1", { shifted: "!" })).toBe("1 (!)");
    expect(withShiftLegend(";", { shifted: ":" })).toBe("; (:)");
    expect(withShiftLegend("[", { shifted: "{" })).toBe("[ ({)");
  });

  it("replaces the label when the key prints something else", () => {
    expect(withShiftLegend("'", { main: "~", shifted: "^" })).toBe("~ (^)");
    expect(withShiftLegend("NUBS", { main: "\\" })).toBe("\\");
    expect(withShiftLegend("1", { main: "!" })).toBe("!");
  });

  it("leaves the label as it is without a legend", () => {
    expect(withShiftLegend("Esc", {})).toBe("Esc");
    expect(withShiftLegend(undefined, {})).toBeUndefined();
    expect(withShiftLegend(undefined, { shifted: "!" })).toBeUndefined();
  });

  it("goes with the labels the app has for the usages", () => {
    const label = (id: number) => hid_usage_get_labels(KEYBOARD, id).short;

    expect(withShiftLegend(label(N1), keyLegend(usage(N1), "us"))).toBe("1 (!)");
    expect(withShiftLegend(label(0x2d), keyLegend(usage(0x2d), "us"))).toBe("- (_)");
    expect(withShiftLegend(label(0x34), keyLegend(usage(0x34), "us"))).toBe("' (\")");
    expect(withShiftLegend(label(0x34), keyLegend(usage(0x34), "abnt2"))).toBe("~ (^)");
    // a letter keeps the label upstream draws
    expect(withShiftLegend(label(A), keyLegend(usage(A), "us"))).toBe(label(A));
  });
});
