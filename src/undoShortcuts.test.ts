/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  isTypingTarget,
  undoShortcut,
  type ShortcutEvent,
} from "./undoShortcuts";

const press = (
  key: string,
  modifiers: Partial<Omit<ShortcutEvent, "key">> = {},
): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe("undoShortcut", () => {
  it("is Undo for Ctrl+Z and for Cmd+Z", () => {
    expect(undoShortcut(press("z", { ctrlKey: true }), null)).toBe("undo");
    expect(undoShortcut(press("z", { metaKey: true }), null)).toBe("undo");
    expect(undoShortcut(press("Z", { ctrlKey: true }), null)).toBe("undo");
  });

  it("is Redo for Ctrl+Y and for Ctrl+Shift+Z", () => {
    expect(undoShortcut(press("y", { ctrlKey: true }), null)).toBe("redo");
    expect(undoShortcut(press("Y", { metaKey: true }), null)).toBe("redo");
    expect(
      undoShortcut(press("Z", { ctrlKey: true, shiftKey: true }), null),
    ).toBe("redo");
    expect(
      undoShortcut(press("z", { metaKey: true, shiftKey: true }), null),
    ).toBe("redo");
  });

  it("is nothing without Ctrl or Cmd", () => {
    expect(undoShortcut(press("z"), null)).toBeNull();
    expect(undoShortcut(press("y", { shiftKey: true }), null)).toBeNull();
  });

  it("is nothing for other keys, for Ctrl+Shift+Y or with Alt", () => {
    expect(undoShortcut(press("x", { ctrlKey: true }), null)).toBeNull();
    expect(undoShortcut(press("Control", { ctrlKey: true }), null)).toBeNull();
    expect(
      undoShortcut(press("y", { ctrlKey: true, shiftKey: true }), null),
    ).toBeNull();
    expect(
      undoShortcut(press("z", { ctrlKey: true, altKey: true }), null),
    ).toBeNull();
  });

  it("is left to a text field, which undoes the typing", () => {
    for (const target of [
      { tagName: "INPUT", type: "text" },
      { tagName: "INPUT" },
      { tagName: "INPUT", type: "number" },
      { tagName: "TEXTAREA" },
      { tagName: "DIV", isContentEditable: true },
    ]) {
      expect(undoShortcut(press("z", { ctrlKey: true }), target)).toBeNull();
      expect(undoShortcut(press("y", { ctrlKey: true }), target)).toBeNull();
    }
  });

  it("works on a slider, a checkbox, a button, a menu or the page", () => {
    for (const target of [
      { tagName: "INPUT", type: "range" },
      { tagName: "INPUT", type: "checkbox" },
      { tagName: "INPUT", type: "radio" },
      { tagName: "BUTTON" },
      { tagName: "SELECT" },
      { tagName: "BODY" },
      null,
      undefined,
    ]) {
      expect(undoShortcut(press("z", { ctrlKey: true }), target)).toBe("undo");
    }
  });
});

describe("isTypingTarget", () => {
  it("knows the elements the user types in", () => {
    expect(isTypingTarget({ tagName: "input", type: "SEARCH" })).toBe(true);
    expect(isTypingTarget({ tagName: "textarea" })).toBe(true);
    expect(isTypingTarget({ isContentEditable: true })).toBe(true);
  });

  it("knows the ones where nothing is typed", () => {
    expect(isTypingTarget({ tagName: "input", type: "File" })).toBe(false);
    expect(isTypingTarget({ tagName: "button" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    expect(isTypingTarget({})).toBe(false);
  });
});
