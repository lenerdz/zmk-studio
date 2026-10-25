/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The tabs of the header (ViewSwitch.tsx) and which of them a keyboard offers.
 */

export type AppView =
  | "keys"
  | "lights"
  | "display"
  | "oled"
  | "files"
  | "diagnostics";

/** Every tab, in the order the header shows them. */
export const ALL_VIEWS: readonly AppView[] = [
  "keys",
  "lights",
  "display",
  "oled",
  "files",
  "diagnostics",
];

/** What the connected keyboard has for each tab that is not always there. */
export interface ViewOffers {
  /** The light maps (Lights tab). */
  lights?: boolean;
  /** The display settings (Display tab). */
  display?: boolean;
  /** The layout of the OLED screens (OLED tab). */
  oled?: boolean;
  /** A keyboard that is connected and unlocked (Files tab). */
  files?: boolean;
  /** The firmware information request (Diagnostics tab). */
  diagnostics?: boolean;
}

/**
 * The tabs a keyboard offers. The Keys tab (the keymap editor of ZMK Studio) is
 * always one of them; the others exist only for a firmware that has what they
 * edit or read: the light maps, the display settings, the layout of the OLED
 * screens, the firmware information. The Files tab needs only a keyboard that is
 * connected and unlocked.
 */
export function availableViews(offers: ViewOffers = {}): AppView[] {
  return ALL_VIEWS.filter((id) => id === "keys" || offers[id] === true);
}

/**
 * The tab to show: the one asked for, or the Keys tab when the keyboard does
 * not offer it (it was disconnected, or another keyboard has been connected).
 */
export function viewToShow(view: AppView, offers: ViewOffers = {}): AppView {
  return availableViews(offers).includes(view) ? view : "keys";
}
