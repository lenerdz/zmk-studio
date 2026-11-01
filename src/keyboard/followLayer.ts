/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Following the layer the keyboard is on: when a layer key is pressed on the
 * keyboard itself (hold FN1, tap a toggle), the keys on the screen change to the
 * keys of that layer. The keyboard says which layer is the highest active one
 * (the live status request, see ../live), and the screen switches when that
 * changes, not all the time, so choosing another layer in the list is not undone
 * a moment later.
 *
 * Nothing here touches the page, so the rules run in the tests.
 */

/**
 * Milliseconds between an answer of the keyboard and the next question. Short
 * enough that a pressed layer key shows its layer at once (a quarter of a second
 * at the worst), long enough for a link that also carries the edits of the keys.
 */
export const FOLLOW_POLL_MS = 200;

/** The saved choice: on, unless it was switched off. */
export function parseFollowLayer(value: string | null | undefined): boolean {
  return value !== "false";
}

/**
 * The layer the screen goes to now, or undefined to leave it where it is.
 *
 * @param last the layer the keyboard was on at the reading before (undefined
 *   before the first one that could be used)
 * @param now the layer the keyboard is on (undefined while it has not answered)
 * @param layerCount how many layers the keymap on the screen has: a layer that
 *   is not among them, or a keymap that is not loaded yet, is left for later
 */
export function layerToFollow(
  last: number | undefined,
  now: number | undefined,
  layerCount: number,
): number | undefined {
  if (
    now === undefined ||
    !Number.isInteger(now) ||
    now < 0 ||
    now >= layerCount
  ) {
    return undefined;
  }

  return now === last ? undefined : now;
}
