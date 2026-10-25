/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Dragging a key of the keymap onto another one, in the same layer or in another
 * (a key held over a layer of the list opens it). This file has the rules and
 * nothing that touches the page, so they run in the tests: what a drop changes,
 * the states a press goes through until it is a click or a drag, and when a layer
 * opens.
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

/**
 * Milliseconds a dragged key has to rest over a layer of the list before the
 * layer opens. Short enough to feel immediate, long enough that crossing the list
 * on the way to a key does not flip through the layers.
 */
export const LAYER_HOVER_MS = 350;

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

/** One key of one layer that a drop changes. */
export interface LayerBindingEdit extends BindingEdit {
  /** The id of the layer the key is on. */
  layerId: number;
}

/** A layer as a drop sees it: its id and the bindings it has now. */
export interface DropLayer {
  layerId: number;
  bindings: readonly BehaviorBinding[];
}

/**
 * The keys a drop changes when the dragged key and the key that receives it can
 * be on different layers, in the order to write them. A swap writes both layers.
 * Empty when the drop changes nothing, as in `planDrop`. The same position of
 * another layer is another key, so `from` and `to` may be equal there.
 */
export function planDropAcross(
  source: DropLayer,
  from: number,
  target: DropLayer,
  to: number,
  mode: DropMode,
): LayerBindingEdit[] {
  if (source.layerId === target.layerId) {
    return planDrop(target.bindings, from, to, mode).map((edit) => ({
      ...edit,
      layerId: target.layerId,
    }));
  }

  const dragged = source.bindings[from];
  const receiving = target.bindings[to];

  if (!dragged || !receiving || bindingsEqual(dragged, receiving)) {
    return [];
  }

  const edits: LayerBindingEdit[] = [
    {
      layerId: target.layerId,
      keyPosition: to,
      binding: dragged,
      previous: receiving,
    },
  ];

  if (mode === "swap") {
    edits.push({
      layerId: source.layerId,
      keyPosition: from,
      binding: receiving,
      previous: dragged,
    });
  }

  return edits;
}

/**
 * The layer to open when a dragged key rests over `overLayer` in the list while
 * `shown` is on the screen: none over no layer, or over the one already open.
 */
export function layerToOpen(
  overLayer: number | undefined,
  shown: number | undefined,
): number | undefined {
  return overLayer !== undefined && overLayer !== shown ? overLayer : undefined;
}

/**
 * The layer to go back to when a drag ends without a drop (Escape, or the button
 * let go over no key): the one the key was picked up from, if another is on the
 * screen by then.
 */
export function layerToRestore(
  fromLayer: number | undefined,
  shown: number | undefined,
): number | undefined {
  return fromLayer !== undefined && fromLayer !== shown ? fromLayer : undefined;
}

export interface GhostTagInfo {
  mode: DropMode;
  /** The pointer is over a key that would receive the drop. */
  droppable: boolean;
  /**
   * The name of the layer the dragged key comes from, when it is not the one on
   * the screen.
   */
  fromLayer?: string;
  /**
   * The pointer is over a layer of the list that is not the one on the screen:
   * it opens if the key stays there.
   */
  opening?: boolean;
}

/** The words under the key that follows the pointer. */
export function ghostTag({
  mode,
  droppable,
  fromLayer,
  opening,
}: GhostTagInfo): string {
  if (opening) {
    return "Hold to open this layer";
  }

  const verb =
    fromLayer === undefined
      ? mode === "copy"
        ? "Copy"
        : "Swap"
      : mode === "copy"
        ? `Copy from ${fromLayer}`
        : `Swap with ${fromLayer}`;

  return droppable ? verb : `${verb}: drop on a key`;
}

/**
 * Where a press is. `pressed`: the button is down on a key and has not moved
 * far enough to be a drag. `dragging`: it has. `cancelled`: Escape (or the loss
 * of the pointer) ended the drag while the button is still down; the rest of the
 * gesture does nothing.
 *
 * The layers are ids, and only when the keys belong to layers: `layer` and
 * `fromLayer` are the layer the key was picked up from.
 */
export type DragState =
  | { phase: "idle" }
  | {
      phase: "pressed";
      from: number;
      layer: number | undefined;
      pointerId: number;
      startX: number;
      startY: number;
    }
  | {
      phase: "dragging";
      from: number;
      fromLayer: number | undefined;
      pointerId: number;
      x: number;
      y: number;
      /**
       * The key under the pointer, if it is not the dragged one. The same
       * position of another layer is another key.
       */
      over: number | undefined;
      /** The layer of the list under the pointer, if any. */
      overLayer: number | undefined;
      mode: DropMode;
    }
  | { phase: "cancelled"; pointerId: number; fromLayer: number | undefined };

export type DragAction =
  | {
      type: "press";
      from: number;
      layer?: number;
      pointerId: number;
      x: number;
      y: number;
    }
  | {
      type: "move";
      pointerId: number;
      x: number;
      y: number;
      over: number | undefined;
      overLayer?: number;
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
            layer: action.layer,
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
              fromLayer: state.layer,
              pointerId: state.pointerId,
              x: action.x,
              y: action.y,
              over: action.over,
              overLayer: action.overLayer,
              mode: action.mode,
            };
      }

      return state.phase === "dragging" && state.pointerId === action.pointerId
        ? {
            ...state,
            x: action.x,
            y: action.y,
            over: action.over,
            overLayer: action.overLayer,
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
        ? {
            phase: "cancelled",
            pointerId: state.pointerId,
            fromLayer:
              state.phase === "dragging" ? state.fromLayer : state.layer,
          }
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
  /** The layer the dragged key was picked up from, when keys belong to layers. */
  fromLayer?: number;
  /** The layer on the screen where it was dropped. */
  toLayer?: number;
}

/**
 * What releasing the pointer over `over` does: a drop, or nothing. `toLayer` is
 * the layer on the screen at that moment.
 */
export function dropOnRelease(
  state: DragState,
  over: number | undefined,
  mode: DropMode,
  toLayer?: number,
): Drop | undefined {
  if (state.phase !== "dragging" || over === undefined) {
    return undefined;
  }

  // The dragged key itself. The same position of another layer is another key.
  if (over === state.from && toLayer === state.fromLayer) {
    return undefined;
  }

  return {
    from: state.from,
    to: over,
    mode,
    fromLayer: state.fromLayer,
    toLayer,
  };
}
