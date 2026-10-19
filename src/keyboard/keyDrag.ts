/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Dragging a key of the keymap onto another one. This file has the rules and
 * nothing that touches the page, so they run in the tests: what a drop changes,
 * and the states a press goes through until it is a click or a drag.
 */
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";

/**
 * What dropping a key on another does: `swap` exchanges the two bindings, `copy`
 * writes the binding of the dragged key on the other one and leaves the dragged
 * key as it was.
 */
export type DropMode = "swap" | "copy";

/**
 * Pixels the pointer has to move before a press becomes a drag. A press that
 * moves less is a click (it selects the key, as before).
 */
export const DRAG_THRESHOLD = 6;

export interface DropModifiers {
  ctrlKey?: boolean;
  altKey?: boolean;
}

/** Ctrl (Windows, Linux) or Alt (Option on a Mac) held while dropping copies. */
export function dropModeFor({ ctrlKey, altKey }: DropModifiers): DropMode {
  return ctrlKey || altKey ? "copy" : "swap";
}

export function bindingsEqual(a: BehaviorBinding, b: BehaviorBinding): boolean {
  return (
    a.behaviorId === b.behaviorId &&
    a.param1 === b.param1 &&
    a.param2 === b.param2
  );
}

/** One key that a drop changes: what it gets and what it had. */
export interface BindingEdit {
  keyPosition: number;
  binding: BehaviorBinding;
  previous: BehaviorBinding;
}

/**
 * The keys a drop changes, in the order to write them. Empty when the drop
 * changes nothing: the same key, a position the layer does not have, or two keys
 * that already have the same binding.
 */
export function planDrop(
  bindings: readonly BehaviorBinding[],
  from: number,
  to: number,
  mode: DropMode,
): BindingEdit[] {
  const source = bindings[from];
  const target = bindings[to];

  if (from === to || !source || !target || bindingsEqual(source, target)) {
    return [];
  }

  const edits: BindingEdit[] = [
    { keyPosition: to, binding: source, previous: target },
  ];

  if (mode === "swap") {
    edits.push({ keyPosition: from, binding: target, previous: source });
  }

  return edits;
}

/**
 * Where a press is. `pressed`: the button is down on a key and has not moved
 * far enough to be a drag. `dragging`: it has. `cancelled`: Escape (or the loss
 * of the pointer) ended the drag while the button is still down; the rest of the
 * gesture does nothing.
 */
export type DragState =
  | { phase: "idle" }
  | {
      phase: "pressed";
      from: number;
      pointerId: number;
      startX: number;
      startY: number;
    }
  | {
      phase: "dragging";
      from: number;
      pointerId: number;
      x: number;
      y: number;
      /** The key under the pointer, if it is not the dragged one. */
      over: number | undefined;
      mode: DropMode;
    }
  | { phase: "cancelled"; pointerId: number };

export type DragAction =
  | { type: "press"; from: number; pointerId: number; x: number; y: number }
  | {
      type: "move";
      pointerId: number;
      x: number;
      y: number;
      over: number | undefined;
      mode: DropMode;
    }
  | { type: "mode"; mode: DropMode }
  | { type: "cancel" }
  | { type: "end"; pointerId: number };

export const IDLE: DragState = { phase: "idle" };

export function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case "press":
      // A second finger or button during a gesture is not a new gesture.
      return state.phase === "idle"
        ? {
            phase: "pressed",
            from: action.from,
            pointerId: action.pointerId,
            startX: action.x,
            startY: action.y,
          }
        : state;

    case "move":
      if (state.phase === "pressed" && state.pointerId === action.pointerId) {
        const moved = Math.hypot(
          action.x - state.startX,
          action.y - state.startY,
        );

        return moved < DRAG_THRESHOLD
          ? state
          : {
              phase: "dragging",
              from: state.from,
              pointerId: state.pointerId,
              x: action.x,
              y: action.y,
              over: action.over,
              mode: action.mode,
            };
      }

      return state.phase === "dragging" && state.pointerId === action.pointerId
        ? {
            ...state,
            x: action.x,
            y: action.y,
            over: action.over,
            mode: action.mode,
          }
        : state;

    case "mode":
      // A modifier key pressed or released while the pointer stays still.
      return state.phase === "dragging" && state.mode !== action.mode
        ? { ...state, mode: action.mode }
        : state;

    case "cancel":
      return state.phase === "pressed" || state.phase === "dragging"
        ? { phase: "cancelled", pointerId: state.pointerId }
        : state;

    case "end":
      return state.phase !== "idle" && state.pointerId === action.pointerId
        ? IDLE
        : state;
  }
}

export interface Drop {
  from: number;
  to: number;
  mode: DropMode;
}

/** What releasing the pointer over `over` does: a drop, or nothing. */
export function dropOnRelease(
  state: DragState,
  over: number | undefined,
  mode: DropMode,
): Drop | undefined {
  return state.phase === "dragging" && over !== undefined && over !== state.from
    ? { from: state.from, to: over, mode }
    : undefined;
}
