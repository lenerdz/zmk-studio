/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The tabs of the header (ViewSwitch.tsx) and which of them a keyboard offers.
 */

export type AppView = "keys" | "lights" | "display";

/** Every tab, in the order the header shows them. */
export const ALL_VIEWS: readonly AppView[] = ["keys", "lights", "display"];

/**
 * The tabs a keyboard offers. The Keys tab (the keymap editor of ZMK Studio) is
 * always one of them; the others exist only for a firmware that has what they
 * edit: the light maps, the display settings.
 */
export function availableViews(
  lightsAvailable: boolean,
  displayAvailable: boolean,
): AppView[] {
  return ALL_VIEWS.filter(
    (id) =>
      id === "keys" ||
      (id === "lights" && lightsAvailable) ||
      (id === "display" && displayAvailable),
  );
}

/**
 * The tab to show: the one asked for, or the Keys tab when the keyboard does
 * not offer it (it was disconnected, or another keyboard has been connected).
 */
export function viewToShow(
  view: AppView,
  lightsAvailable: boolean,
  displayAvailable: boolean,
): AppView {
  return availableViews(lightsAvailable, displayAvailable).includes(view)
    ? view
    : "keys";
}
