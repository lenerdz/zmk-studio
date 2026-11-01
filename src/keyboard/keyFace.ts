/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The words a few keys wear on their face on the keyboard drawing: the Return
 * key reads "Enter" (not "Ret"), the spacebar reads "Space" (not a box symbol)
 * and the two Shift keys read "Shift", which BindingLabel draws under an up arrow.
 *
 * They are kept apart from the names of hid-usage-name-overrides.json on purpose:
 * those are shared, and the key names written as comments in the exported
 * led_colors.dtsi ("RET", "SPACE", "SHFT"; see lights/keyNames.ts) come from them.
 * A change in the faces must not rename the keys in that file.
 *
 * Nothing here touches the page, so the tables run in the tests.
 */
import { hid_usage_get_labels } from "../hid-usages";

/** The three widths a label can be written in (see HidUsageLabel). */
export interface FaceLabels {
  short?: string;
  med?: string;
  long?: string;
}

/** The usage page of the keyboard keys. */
const KEYBOARD_PAGE = 0x07;

// Usage ids of the keyboard page.
const RETURN = 0x28;
const SPACE = 0x2c;
const LEFT_SHIFT = 0xe1;
const RIGHT_SHIFT = 0xe5;

/** The same word at every width: the key is not wide enough to need another. */
const word = (text: string): FaceLabels => ({
  short: text,
  med: text,
  long: text,
});

/** What the face says instead of the shared label, by usage id of the keyboard page. */
const FACE: Readonly<Record<number, FaceLabels>> = {
  [RETURN]: word("Enter"),
  [SPACE]: word("Space"),
  [LEFT_SHIFT]: word("Shift"),
  [RIGHT_SHIFT]: word("Shift"),
};

/**
 * The labels to draw on the face of a key: the shared ones of the usage, with
 * the words above in place of them where the face has its own.
 */
export function faceLabels(page: number, id: number): FaceLabels {
  const shared = hid_usage_get_labels(page, id);
  const own = page === KEYBOARD_PAGE ? FACE[id] : undefined;

  return own ? { ...shared, ...own } : shared;
}

export type ShiftSide = "left" | "right";

/**
 * Which Shift key a usage is, when it is one: the usage of the key itself on the
 * keyboard page. A usage that carries an implicit modifier in its top byte (a key
 * that sends Ctrl and Shift together, ZMK's `LC(LSHFT)`) is another key, and so
 * is anything on another page, such as the consumer page.
 */
export function shiftSide(usage: number): ShiftSide | undefined {
  const modifiers = usage >>> 24;
  const page = (usage >>> 16) & 0xff;

  if (modifiers !== 0 || page !== KEYBOARD_PAGE) {
    return undefined;
  }

  switch (usage & 0xffff) {
    case LEFT_SHIFT:
      return "left";
    case RIGHT_SHIFT:
      return "right";
    default:
      return undefined;
  }
}

/** What the tooltip of a Shift key says: the face only says "Shift". */
export function shiftTitle(side: ShiftSide): string {
  return side === "left" ? "Left Shift" : "Right Shift";
}

/** The name written under the arrow of a Shift key. */
export function shiftName(side: ShiftSide): string {
  const id = side === "left" ? LEFT_SHIFT : RIGHT_SHIFT;

  return FACE[id].short ?? "Shift";
}
