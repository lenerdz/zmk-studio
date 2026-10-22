/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the drags of the OLED tab carry (the types of the data transfer of the
 * browser). A screen takes a drop only when it carries one of these, so a file
 * or a piece of text dragged over it does nothing.
 */

/** A chip of the tray of hidden widgets: the key of the widget. */
export const DRAG_WIDGET_MIME = "application/x-zmk-oled-widget";

/** A picture of the gallery: the value of its kind. */
export const DRAG_KIND_MIME = "application/x-zmk-oled-kind";
