/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The ids of the OLED layout settings: which widgets of the zmk-nice-oled
 * screens are drawn and where, and which animation the right screen plays. They
 * come from CONFIG_KEYPAW_OLED_LAYOUT of the lenerdz/zmk-rgb-matrix module
 * (include/zmk/display_settings.h there is the reference) and travel in the same
 * display requests as the settings of the Display tab (ids 1 to 6).
 *
 * The ids come in blocks of eight, one block per widget, from 16 on: +0 says
 * whether the widget is drawn (0 or 1), +1 and +2 are its x and y, and the
 * animation block adds +3, the kind, and +4, the time of a cycle. The block of
 * the picture that follows (112 to 115) is the other four settings of the
 * picture: how many quarter turns clockwise it is turned, how it mixes with the
 * widgets, and the piece of it that shows (two numbers each holding two bytes).
 */

/** The first id of the OLED layout; the ids below it are the Display tab's. */
export const FIRST_OLED_ID = 16;

export const OLED_ID = {
  // Right screen (the peripheral half)
  R_ANIM_SHOW: 16,
  R_ANIM_X: 17,
  R_ANIM_Y: 18,
  R_ANIM_KIND: 19,
  R_ANIM_MS: 20,
  R_ANIM_ROT: 112,
  R_ANIM_MIX: 113,
  R_ANIM_CROP_XY: 114,
  R_ANIM_CROP_WH: 115,
  R_BATTERY_SHOW: 24,
  R_BATTERY_X: 25,
  R_BATTERY_Y: 26,
  R_LINK_SHOW: 32,
  R_LINK_X: 33,
  R_LINK_Y: 34,
  // The toast has no switch of its own: the Display tab's "Light toast" (id 5)
  R_TOAST_X: 41,
  R_TOAST_Y: 42,
  // Left screen (the central half)
  L_OUTPUT_SHOW: 48,
  L_OUTPUT_X: 49,
  L_OUTPUT_Y: 50,
  L_BATTERY_SHOW: 56,
  L_BATTERY_X: 57,
  L_BATTERY_Y: 58,
  L_PROFILE_SHOW: 64,
  L_PROFILE_X: 65,
  L_PROFILE_Y: 66,
  L_PROFILE_NUM_SHOW: 72,
  L_PROFILE_NUM_X: 73,
  L_PROFILE_NUM_Y: 74,
  L_LAYER_SHOW: 80,
  L_LAYER_X: 81,
  L_LAYER_Y: 82,
  L_WPM_GAUGE_SHOW: 88,
  L_WPM_GAUGE_X: 89,
  L_WPM_GAUGE_Y: 90,
  L_WPM_NUMBER_SHOW: 96,
  L_WPM_NUMBER_X: 97,
  L_WPM_NUMBER_Y: 98,
  L_WPM_GRAPH_SHOW: 104,
  L_WPM_GRAPH_X: 105,
  L_WPM_GRAPH_Y: 106,
} as const;

/** The setting of the Display tab that turns the light toast on and off. */
export const TOAST_SETTING_ID = 5;

/** Whether an id belongs to the OLED layout (the Display tab does not list it). */
export function isOledLayoutId(id: number): boolean {
  return id >= FIRST_OLED_ID;
}
