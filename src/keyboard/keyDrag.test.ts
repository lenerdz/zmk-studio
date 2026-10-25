/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { corneKeymap } from "./corne.mock";
import {
  DRAG_THRESHOLD,
  DragAction,
  DragState,
  IDLE,
  LAYER_HOVER_MS,
  bindingsEqual,
  dragReducer,
  dropModeFor,
  dropOnRelease,
  ghostTag,
  layerToOpen,
  layerToRestore,
  planDrop,
  planDropAcross,
} from "./keyDrag";

const binding = (behaviorId: number, param1 = 0, param2 = 0): BehaviorBinding => ({
  behaviorId,
  param1,
  param2,
});

/** Plays the actions in order, from the idle state. */
const run = (...actions: DragAction[]): DragState =>
  actions.reduce(dragReducer, IDLE);

const press = (
  from = 3,
  pointerId = 1,
  x = 100,
  y = 100,
  layer?: number,
): DragAction => ({
  type: "press",
  from,
  layer,
  pointerId,
  x,
  y,
});

const move = (
  x: number,
  y: number,
  over: number | undefined = undefined,
  mode: "swap" | "copy" = "swap",
  pointerId = 1,
  overLayer?: number,
): DragAction => ({ type: "move", pointerId, x, y, over, overLayer, mode });

describe("dropModeFor", () => {
  it("swaps by default and copies with Ctrl or Alt", () => {
    expect(dropModeFor({})).toBe("swap");
    expect(dropModeFor({ ctrlKey: false, altKey: false })).toBe("swap");
    expect(dropModeFor({ ctrlKey: true })).toBe("copy");
    expect(dropModeFor({ altKey: true })).toBe("copy");
    expect(dropModeFor({ ctrlKey: true, altKey: true })).toBe("copy");
  });
});

describe("bindingsEqual", () => {
  it("compares the behavior and both parameters", () => {
    expect(bindingsEqual(binding(1, 2, 3), binding(1, 2, 3))).toBe(true);
    expect(bindingsEqual(binding(1, 2, 3), binding(2, 2, 3))).toBe(false);
    expect(bindingsEqual(binding(1, 2, 3), binding(1, 9, 3))).toBe(false);
    expect(bindingsEqual(binding(1, 2, 3), binding(1, 2, 9))).toBe(false);
  });
});

describe("planDrop", () => {
  const bindings = [binding(1, 10), binding(1, 20), binding(2, 30), binding(1, 10)];

  it("swaps the two bindings, writing the target first", () => {
    expect(planDrop(bindings, 0, 2, "swap")).toEqual([
      { keyPosition: 2, binding: bindings[0], previous: bindings[2] },
      { keyPosition: 0, binding: bindings[2], previous: bindings[0] },
    ]);
  });

  it("copies the dragged binding and leaves the dragged key alone", () => {
    expect(planDrop(bindings, 0, 2, "copy")).toEqual([
      { keyPosition: 2, binding: bindings[0], previous: bindings[2] },
    ]);
  });

  it("changes nothing when dropped on the same key", () => {
    expect(planDrop(bindings, 1, 1, "swap")).toEqual([]);
    expect(planDrop(bindings, 1, 1, "copy")).toEqual([]);
  });

  it("changes nothing when both keys already do the same", () => {
    expect(planDrop(bindings, 0, 3, "swap")).toEqual([]);
    expect(planDrop(bindings, 0, 3, "copy")).toEqual([]);
  });

  it("changes nothing for a position the layer does not have", () => {
    expect(planDrop(bindings, 0, 4, "swap")).toEqual([]);
    expect(planDrop(bindings, 7, 0, "copy")).toEqual([]);
    expect(planDrop(bindings, -1, 0, "swap")).toEqual([]);
  });

  it("applies to a real layer: swapping twice gives the layer back", () => {
    const layer = corneKeymap.layers[0].bindings;
    const swapped = layer.slice();
    for (const edit of planDrop(layer, 1, 2, "swap")) {
      swapped[edit.keyPosition] = edit.binding;
    }

    expect(swapped[1]).toEqual(layer[2]);
    expect(swapped[2]).toEqual(layer[1]);
    expect(swapped.filter((b, i) => b !== layer[i])).toHaveLength(2);

    for (const edit of planDrop(swapped, 1, 2, "swap")) {
      swapped[edit.keyPosition] = edit.binding;
    }
    expect(swapped).toEqual(layer);
  });
});

describe("planDropAcross", () => {
  const first = [binding(1, 10), binding(1, 20), binding(2, 30)];
  const second = [binding(3, 1), binding(3, 2), binding(2, 30)];
  const a = { layerId: 7, bindings: first };
  const b = { layerId: 9, bindings: second };

  it("on one layer is planDrop, with the layer on each edit", () => {
    expect(planDropAcross(a, 0, a, 2, "swap")).toEqual(
      planDrop(first, 0, 2, "swap").map((edit) => ({ ...edit, layerId: 7 })),
    );
    expect(planDropAcross(a, 0, a, 2, "copy")).toEqual([
      { layerId: 7, keyPosition: 2, binding: first[0], previous: first[2] },
    ]);
    expect(planDropAcross(a, 1, a, 1, "swap")).toEqual([]);
  });

  it("copies a key onto another layer and leaves the layer it came from alone", () => {
    expect(planDropAcross(a, 0, b, 1, "copy")).toEqual([
      { layerId: 9, keyPosition: 1, binding: first[0], previous: second[1] },
    ]);
  });

  it("swaps across layers, writing the key that receives first", () => {
    expect(planDropAcross(a, 0, b, 1, "swap")).toEqual([
      { layerId: 9, keyPosition: 1, binding: first[0], previous: second[1] },
      { layerId: 7, keyPosition: 0, binding: second[1], previous: first[0] },
    ]);
  });

  it("takes the same position of another layer as another key", () => {
    expect(planDropAcross(a, 1, b, 1, "copy")).toEqual([
      { layerId: 9, keyPosition: 1, binding: first[1], previous: second[1] },
    ]);
    expect(planDropAcross(a, 1, b, 1, "swap")).toHaveLength(2);
  });

  it("changes nothing when the two keys already do the same", () => {
    expect(planDropAcross(a, 2, b, 2, "swap")).toEqual([]);
    expect(planDropAcross(a, 2, b, 2, "copy")).toEqual([]);
  });

  it("changes nothing for a position a layer does not have", () => {
    expect(planDropAcross(a, 5, b, 0, "swap")).toEqual([]);
    expect(planDropAcross(a, 0, b, 5, "copy")).toEqual([]);
    expect(planDropAcross(a, -1, b, 0, "swap")).toEqual([]);
  });

  it("applies to two real layers: swapping twice gives both back", () => {
    const [base, raise] = corneKeymap.layers;
    const layers = new Map([
      [base.id, base.bindings.slice()],
      [raise.id, raise.bindings.slice()],
    ]);
    const swap = (from: number, to: number) => {
      const edits = planDropAcross(
        { layerId: base.id, bindings: layers.get(base.id)! },
        from,
        { layerId: raise.id, bindings: layers.get(raise.id)! },
        to,
        "swap",
      );
      for (const edit of edits) {
        layers.get(edit.layerId)![edit.keyPosition] = edit.binding;
      }
      return edits;
    };

    expect(swap(1, 2)).toHaveLength(2);
    expect(layers.get(raise.id)![2]).toEqual(base.bindings[1]);
    expect(layers.get(base.id)![1]).toEqual(raise.bindings[2]);

    // the same drag from the other side puts everything back
    const back = planDropAcross(
      { layerId: raise.id, bindings: layers.get(raise.id)! },
      2,
      { layerId: base.id, bindings: layers.get(base.id)! },
      1,
      "swap",
    );
    for (const edit of back) {
      layers.get(edit.layerId)![edit.keyPosition] = edit.binding;
    }
    expect(layers.get(base.id)).toEqual(base.bindings);
    expect(layers.get(raise.id)).toEqual(raise.bindings);
  });
});

describe("layerToOpen", () => {
  it("opens the layer a key rests over, unless it is the one on the screen", () => {
    expect(layerToOpen(4, 2)).toBe(4);
    expect(layerToOpen(2, 2)).toBeUndefined();
    expect(layerToOpen(undefined, 2)).toBeUndefined();
    expect(layerToOpen(0, 2)).toBe(0);
    expect(layerToOpen(3, undefined)).toBe(3);
  });

  it("waits a moment before opening, not an instant and not a long time", () => {
    expect(LAYER_HOVER_MS).toBeGreaterThanOrEqual(150);
    expect(LAYER_HOVER_MS).toBeLessThanOrEqual(600);
  });
});

describe("layerToRestore", () => {
  it("goes back to the layer the key came from when another is on the screen", () => {
    expect(layerToRestore(1, 4)).toBe(1);
    expect(layerToRestore(0, 4)).toBe(0);
  });

  it("stays when the layer is the same or unknown", () => {
    expect(layerToRestore(4, 4)).toBeUndefined();
    expect(layerToRestore(undefined, 4)).toBeUndefined();
  });
});

describe("ghostTag", () => {
  it("says what the drop does on the same layer", () => {
    expect(ghostTag({ mode: "swap", droppable: true })).toBe("Swap");
    expect(ghostTag({ mode: "copy", droppable: true })).toBe("Copy");
    expect(ghostTag({ mode: "swap", droppable: false })).toBe("Swap: drop on a key");
    expect(ghostTag({ mode: "copy", droppable: false })).toBe("Copy: drop on a key");
  });

  it("names the layer the key came from when another is on the screen", () => {
    expect(ghostTag({ mode: "swap", droppable: true, fromLayer: "Base" })).toBe("Swap with Base");
    expect(ghostTag({ mode: "copy", droppable: true, fromLayer: "Base" })).toBe("Copy from Base");
    expect(ghostTag({ mode: "copy", droppable: false, fromLayer: "Base" })).toBe(
      "Copy from Base: drop on a key",
    );
  });

  it("tells that the layer under the pointer is about to open", () => {
    expect(ghostTag({ mode: "swap", droppable: false, opening: true })).toBe(
      "Hold to open this layer",
    );
    expect(
      ghostTag({ mode: "copy", droppable: false, fromLayer: "Base", opening: true }),
    ).toBe("Hold to open this layer");
  });
});

describe("dragReducer", () => {
  it("starts idle and a press makes it pressed", () => {
    expect(run(press(5, 7, 10, 20))).toEqual({
      phase: "pressed",
      from: 5,
      pointerId: 7,
      startX: 10,
      startY: 20,
    });
  });

  it("is still a click while the pointer moves less than the threshold", () => {
    const small = DRAG_THRESHOLD - 1;
    expect(run(press(3, 1, 100, 100), move(100 + small, 100)).phase).toBe("pressed");
    // the distance counts in both directions, not per axis
    expect(run(press(3, 1, 100, 100), move(103, 104)).phase).toBe("pressed");
  });

  it("becomes a drag once the pointer moves the threshold", () => {
    expect(
      run(press(3, 1, 100, 100), move(100 + DRAG_THRESHOLD, 100, 4, "copy")),
    ).toEqual({
      phase: "dragging",
      from: 3,
      pointerId: 1,
      x: 100 + DRAG_THRESHOLD,
      y: 100,
      over: 4,
      mode: "copy",
    });
  });

  it("follows the pointer, the key under it and the mode", () => {
    const state = run(
      press(3, 1, 100, 100),
      move(150, 100, 4),
      move(200, 120, undefined),
      move(210, 130, 9, "copy"),
    );

    expect(state).toMatchObject({ phase: "dragging", x: 210, y: 130, over: 9, mode: "copy" });
  });

  it("switches the mode when a modifier changes without movement", () => {
    const dragging = run(press(), move(200, 100, 4));
    const copying = dragReducer(dragging, { type: "mode", mode: "copy" });

    expect(copying).toMatchObject({ phase: "dragging", over: 4, mode: "copy" });
    expect(dragReducer(copying, { type: "mode", mode: "copy" })).toBe(copying);
    expect(dragReducer(copying, { type: "mode", mode: "swap" })).toMatchObject({
      mode: "swap",
    });
  });

  it("ignores the mode before the drag starts", () => {
    const pressed = run(press());
    expect(dragReducer(pressed, { type: "mode", mode: "copy" })).toBe(pressed);
    expect(dragReducer(IDLE, { type: "mode", mode: "copy" })).toBe(IDLE);
  });

  it("ignores a second pointer during a gesture", () => {
    const pressed = run(press(3, 1));
    expect(dragReducer(pressed, press(8, 2))).toBe(pressed);
    expect(dragReducer(pressed, move(400, 400, 9, "swap", 2))).toBe(pressed);

    const dragging = run(press(3, 1), move(200, 100, 4));
    expect(dragReducer(dragging, move(500, 500, 9, "swap", 2))).toBe(dragging);
    expect(dragReducer(dragging, { type: "end", pointerId: 2 })).toBe(dragging);
  });

  it("goes back to idle when the pointer ends", () => {
    expect(run(press(), { type: "end", pointerId: 1 })).toBe(IDLE);
    expect(run(press(), move(200, 100, 4), { type: "end", pointerId: 1 })).toBe(IDLE);
  });

  it("swallows the rest of the gesture after a cancel", () => {
    const cancelled = run(press(), move(200, 100, 4), { type: "cancel" });
    expect(cancelled).toEqual({ phase: "cancelled", pointerId: 1 });

    // moving, switching mode or pressing again changes nothing until the release
    expect(dragReducer(cancelled, move(300, 100, 5))).toBe(cancelled);
    expect(dragReducer(cancelled, { type: "mode", mode: "copy" })).toBe(cancelled);
    expect(dragReducer(cancelled, press(2, 3))).toBe(cancelled);
    expect(dragReducer(cancelled, { type: "end", pointerId: 1 })).toBe(IDLE);
  });

  it("a cancel before the drag starts also ends the gesture", () => {
    expect(run(press(), { type: "cancel" })).toEqual({ phase: "cancelled", pointerId: 1 });
    expect(dragReducer(IDLE, { type: "cancel" })).toBe(IDLE);
  });
});

describe("dragReducer with layers", () => {
  it("remembers the layer the key was picked up from", () => {
    expect(run(press(3, 1, 100, 100, 7))).toMatchObject({ phase: "pressed", layer: 7 });
    expect(
      run(press(3, 1, 100, 100, 7), move(200, 100, 4, "swap", 1, undefined)),
    ).toMatchObject({ phase: "dragging", from: 3, fromLayer: 7 });
  });

  it("follows the layer of the list under the pointer", () => {
    const state = run(
      press(3, 1, 100, 100, 7),
      move(50, 100, undefined, "swap", 1, 9),
    );
    expect(state).toMatchObject({ phase: "dragging", overLayer: 9, over: undefined });

    // the layer opens and the pointer goes to a key of it: no layer under it now
    expect(dragReducer(state, move(300, 200, 5, "swap", 1, undefined))).toMatchObject({
      overLayer: undefined,
      over: 5,
      fromLayer: 7,
    });
  });

  it("keeps the layer through a cancel", () => {
    expect(run(press(3, 1, 100, 100, 7), { type: "cancel" })).toEqual({
      phase: "cancelled",
      pointerId: 1,
      fromLayer: 7,
    });
    expect(
      run(press(3, 1, 100, 100, 7), move(200, 100, 4), { type: "cancel" }),
    ).toEqual({ phase: "cancelled", pointerId: 1, fromLayer: 7 });
  });
});

describe("dropOnRelease with layers", () => {
  const dragging = run(press(3, 1, 100, 100, 7), move(200, 100, 4));

  it("reports the layer the key came from and the one it landed on", () => {
    expect(dropOnRelease(dragging, 4, "swap", 7)).toEqual({
      from: 3,
      to: 4,
      mode: "swap",
      fromLayer: 7,
      toLayer: 7,
    });
    expect(dropOnRelease(dragging, 4, "copy", 9)).toEqual({
      from: 3,
      to: 4,
      mode: "copy",
      fromLayer: 7,
      toLayer: 9,
    });
  });

  it("drops on the same position of another layer, which is another key", () => {
    expect(dropOnRelease(dragging, 3, "copy", 9)).toEqual({
      from: 3,
      to: 3,
      mode: "copy",
      fromLayer: 7,
      toLayer: 9,
    });
  });

  it("does nothing on the dragged key itself", () => {
    expect(dropOnRelease(dragging, 3, "swap", 7)).toBeUndefined();
  });

  it("does nothing off the keys, whatever layer is on the screen", () => {
    expect(dropOnRelease(dragging, undefined, "swap", 9)).toBeUndefined();
  });
});

describe("dropOnRelease", () => {
  const dragging = run(press(3), move(200, 100, 4, "swap"));

  it("drops on the key under the pointer, with the mode at the release", () => {
    expect(dropOnRelease(dragging, 4, "swap")).toEqual({ from: 3, to: 4, mode: "swap" });
    expect(dropOnRelease(dragging, 9, "copy")).toEqual({ from: 3, to: 9, mode: "copy" });
  });

  it("does nothing off the keys or on the dragged key", () => {
    expect(dropOnRelease(dragging, undefined, "swap")).toBeUndefined();
    expect(dropOnRelease(dragging, 3, "swap")).toBeUndefined();
  });

  it("does nothing unless a drag is going on", () => {
    expect(dropOnRelease(IDLE, 4, "swap")).toBeUndefined();
    expect(dropOnRelease(run(press(3)), 4, "swap")).toBeUndefined();
    expect(dropOnRelease(run(press(3), move(200, 100, 4), { type: "cancel" }), 4, "swap")).toBeUndefined();
  });
});
