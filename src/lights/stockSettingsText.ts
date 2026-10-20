/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What "Restore Stock Settings" puts back, written for the confirmation of the
 * header: the keymap always, the light colors and the screen settings only for a
 * firmware that has them.
 */

export function stockSettingsText(
  lightsAvailable: boolean,
  displayAvailable: boolean,
): string {
  const items = [
    "the stock keymap",
    ...(lightsAvailable ? ["the stock light colors"] : []),
    ...(displayAvailable ? ["the stock screen settings"] : []),
  ];

  if (items.length === 1) {
    return items[0];
  }

  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
