/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * A short name for what a key does, for the comments of the exported
 * led_colors.dtsi (TAB, Q, SHFT, FN1, ...). It is built from what the keyboard
 * reports, the same way the key labels of the app are, and is plain ASCII: the
 * file is read by the devicetree compiler and by people with any editor.
 */
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type {
  BehaviorBinding,
  Layer,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  hid_usage_get_labels,
  hid_usage_page_and_id_from_usage,
} from "../hid-usages";
import { getBindingDisplay } from "../keyboard/bindingDisplay";
import { isAscii, toAscii } from "./text";

const MAX_LENGTH = 12;

// The labels of the app draw these keys with a symbol; this is what to write.
const SYMBOL_NAMES: Readonly<Record<string, string>> = {
  "\u2423": "SPACE",
  "\u2190": "LEFT",
  "\u2193": "DOWN",
  "\u2191": "UP",
  "\u2192": "RIGHT",
  "\u21e5": "NEXT",
  "\u21e4": "PREV",
};

// Long words of the descriptions of the media keys ("Brightness Down").
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/BRIGHTNESS/g, "BRI"],
  [/VOLUME/g, "VOL"],
];

function compact(text: string): string {
  let name = toAscii(text).trim().replace(/\s+/g, "_").toUpperCase();

  for (const [word, short] of ABBREVIATIONS) {
    name = name.replace(word, short);
  }

  return name.slice(0, MAX_LENGTH);
}

function hidName(usage: number): string {
  const [page, id] = hid_usage_page_and_id_from_usage(usage);
  // The top byte of the usage holds implicit modifiers, as in HidUsageLabel.
  const labels = hid_usage_get_labels(page & 0xff, id);

  const name =
    [labels.short, labels.med, labels.long].find(isAscii) ??
    SYMBOL_NAMES[labels.short ?? ""] ??
    `0x${usage.toString(16)}`;

  return compact(name.replace(/^Keyboard /, ""));
}

export function bindingName(
  binding: BehaviorBinding,
  behavior: GetBehaviorDetailsResponse | undefined,
  layers: Pick<Layer, "id" | "name">[],
): string {
  if (!behavior) {
    return "--";
  }

  const display = getBindingDisplay(binding, behavior, layers);

  if (display.muted) {
    return "--";
  }

  if (display.hid?.length) {
    // A layer-tap has the layer and the key.
    const parts = [
      ...(display.text ? [compact(display.text)] : []),
      ...display.hid.map(hidName),
    ];
    return parts.join("+");
  }

  if (display.text) {
    return compact(display.text);
  }

  // An icon with no text (the media keys, ...): its description says what it is.
  return compact(display.title || display.header || behavior.displayName);
}
