/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The keyboard shortcuts of Undo and Redo: Ctrl+Z (Cmd+Z on a Mac), and for Redo
 * Ctrl+Y or Ctrl+Shift+Z. They are left alone while the user types in a text
 * field, where they undo the typing. A slider, a checkbox or a button is not
 * typing, so the shortcut works there.
 */

export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** What the shortcut needs to know about the element that has the focus. */
export interface ShortcutTarget {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
}

// The kinds of <input> in which nothing is typed.
const NOT_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Whether the element lets the user type text, which has its own undo. */
export function isTypingTarget(
  target: ShortcutTarget | null | undefined,
): boolean {
  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName?.toLowerCase();
  if (tag === "textarea") {
    return true;
  }

  return tag === "input" && !NOT_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
}

/** What a key press asks for, or null when it is not for Undo or Redo. */
export function undoShortcut(
  event: ShortcutEvent,
  target: ShortcutTarget | null | undefined,
): "undo" | "redo" | null {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) {
    return null;
  }

  const key = event.key.toLowerCase();
  let action: "undo" | "redo";
  if (key === "z") {
    action = event.shiftKey ? "redo" : "undo";
  } else if (key === "y" && !event.shiftKey) {
    action = "redo";
  } else {
    return null;
  }

  return isTypingTarget(target) ? null : action;
}
