/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What a key prints with Shift held, drawn in parentheses beside its label
 * ("1 (!)"). A HID usage names a place on the keyboard, not a character: what the
 * computer prints depends on the keyboard layout it is set to. So the legend
 * follows a layout chosen in the app, the US one (the one the names of the usages
 * assume) or the Brazilian ABNT2, or none.
 *
 * Nothing here touches the page, so the tables run in the tests.
 */

export type ShiftLayout = "off" | "us" | "abnt2";

export const DEFAULT_SHIFT_LAYOUT: ShiftLayout = "us";

export const SHIFT_LAYOUTS: ReadonlyArray<{
  value: ShiftLayout;
  label: string;
  title: string;
}> = [
  {
    value: "off",
    label: "Shift: off",
    title: "Draw only the label of each key",
  },
  {
    value: "us",
    label: "Shift: US",
    title:
      "Beside each key, in parentheses, what it prints with Shift held on a US keyboard layout",
  },
  {
    value: "abnt2",
    label: "Shift: ABNT2",
    title:
      "Beside each key, in parentheses, what it prints with Shift held on a Brazilian ABNT2 keyboard layout (the labels of the keys that print something else on it change too)",
  },
];

/** The saved choice, or the default when there is none or it is not one. */
export function parseShiftLayout(value: string | null | undefined): ShiftLayout {
  return value === "off" || value === "us" || value === "abnt2"
    ? value
    : DEFAULT_SHIFT_LAYOUT;
}

/** The usage page of the keyboard keys (the other one the app draws is the consumer page). */
const KEYBOARD_PAGE = 0x07;

/**
 * The implicit modifiers a usage can carry in its top byte, as ZMK writes them
 * (`LS(N1)` is the usage of 1 with the left Shift in that byte): the two Shifts.
 */
const SHIFT_MODIFIERS = 0x02 | 0x20;

/** What a key prints on a given layout. */
interface Printed {
  /**
   * What it prints without Shift, when that is not what the HID name of the
   * usage says (the label is replaced). Left out when they agree.
   */
  main?: string;
  /** What it prints with Shift. Left out for the keys drawn as a capital letter. */
  shifted?: string;
}

/*
 * The tables are by usage id of the keyboard page (usage 0x07). The letters (ids 4
 * to 29) are in neither: their keys are already drawn as capitals, so there is
 * nothing to add.
 */

// US layout: the label of the usage (a number, a sign) is what the key prints
// without Shift, so only the shifted character is listed.
const US: Readonly<Record<number, Printed>> = {
  0x1e: { shifted: "!" }, // 1
  0x1f: { shifted: "@" }, // 2
  0x20: { shifted: "#" }, // 3
  0x21: { shifted: "$" }, // 4
  0x22: { shifted: "%" }, // 5
  0x23: { shifted: "^" }, // 6
  0x24: { shifted: "&" }, // 7
  0x25: { shifted: "*" }, // 8
  0x26: { shifted: "(" }, // 9
  0x27: { shifted: ")" }, // 0
  0x2d: { shifted: "_" }, // -
  0x2e: { shifted: "+" }, // =
  0x2f: { shifted: "{" }, // [
  0x30: { shifted: "}" }, // ]
  0x31: { shifted: "|" }, // \
  0x32: { shifted: "|" }, // Non-US # (the scan code of \ on a US layout)
  0x33: { shifted: ":" }, // ;
  0x34: { shifted: '"' }, // '
  0x35: { shifted: "~" }, // `
  0x36: { shifted: "<" }, // ,
  0x37: { shifted: ">" }, // .
  0x38: { shifted: "?" }, // /
  0x64: { shifted: "|" }, // Non-US \
};

// Brazilian ABNT2 layout. The place of the usage keeps its name (the US one), but
// the key prints something else on many of them. 0x87 (International 1) is the
// key to the left of the right Shift that only ABNT2 has. The accents on 0x23,
// 0x2f and 0x34 are dead keys: they wait for the next letter.
const ABNT2: Readonly<Record<number, Printed>> = {
  0x1e: { shifted: "!" }, // 1
  0x1f: { shifted: "@" }, // 2
  0x20: { shifted: "#" }, // 3
  0x21: { shifted: "$" }, // 4
  0x22: { shifted: "%" }, // 5
  0x23: { shifted: "¨" }, // 6
  0x24: { shifted: "&" }, // 7
  0x25: { shifted: "*" }, // 8
  0x26: { shifted: "(" }, // 9
  0x27: { shifted: ")" }, // 0
  0x2d: { shifted: "_" }, // -
  0x2e: { shifted: "+" }, // =
  0x2f: { main: "´", shifted: "`" }, // the US [
  0x30: { main: "[", shifted: "{" }, // the US ]
  0x31: { main: "]", shifted: "}" }, // the US \
  0x32: { main: "]", shifted: "}" }, // Non-US # (the same scan code as the US \)
  0x33: { main: "Ç" }, // the US ; (a letter, drawn as a capital)
  0x34: { main: "~", shifted: "^" }, // the US '
  0x35: { main: "'", shifted: '"' }, // the US `
  0x36: { shifted: "<" }, // ,
  0x37: { shifted: ">" }, // .
  0x38: { main: ";", shifted: ":" }, // the US /
  0x64: { main: "\\", shifted: "|" }, // Non-US \
  0x87: { main: "/", shifted: "?" }, // International 1
};

const TABLES: Readonly<Record<Exclude<ShiftLayout, "off">, Readonly<Record<number, Printed>>>> = {
  us: US,
  abnt2: ABNT2,
};

export interface KeyLegend {
  /** Replaces the label of the usage: what the key prints on this layout. */
  main?: string;
  /** What the key prints with Shift, to draw in parentheses. */
  shifted?: string;
}

/**
 * What to add to the label of a usage. With the Shift of the usage itself (a key
 * that sends `LS(N1)`), the key prints the shifted character, so that is its
 * label and there is nothing to put in parentheses. Other implicit modifiers
 * (Ctrl, Alt, GUI) change what the key does, not what it prints: no legend.
 */
export function keyLegend(usage: number, layout: ShiftLayout): KeyLegend {
  if (layout === "off" || ((usage >>> 16) & 0xff) !== KEYBOARD_PAGE) {
    return {};
  }

  const printed = TABLES[layout][usage & 0xffff];
  const modifiers = (usage >>> 24) & 0xff;

  if (!printed) {
    return {};
  }

  if (modifiers === 0) {
    return {
      ...(printed.main !== undefined && { main: printed.main }),
      ...(printed.shifted !== undefined && { shifted: printed.shifted }),
    };
  }

  const shiftOnly = (modifiers & ~SHIFT_MODIFIERS) === 0;
  const text = printed.shifted ?? printed.main;

  return shiftOnly && text !== undefined ? { main: text } : {};
}

/** The label with the legend after it: `1` and `!` give `1 (!)`. */
export function withShiftLegend(
  label: string | undefined,
  legend: KeyLegend,
): string | undefined {
  const main = legend.main ?? label;

  return legend.shifted !== undefined && main !== undefined
    ? `${main} (${legend.shifted})`
    : main;
}
