/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  ChangeHistory,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  type SettingChange,
} from "./changeHistory";

const change = (id: number, before: number, after: number): SettingChange => ({
  id,
  before,
  after,
});

describe("recording", () => {
  it("starts with nothing to undo or redo", () => {
    const history = new ChangeHistory();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
  });

  it("keeps a change as a step", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 20)], 0);

    expect(history.canUndo).toBe(true);
    expect(history.undoDepth).toBe(1);
  });

  it("ignores a change that changed nothing", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 10)], 0);
    history.record([], 0);

    expect(history.canUndo).toBe(false);
  });

  it("drops the settings that did not change from a step of several", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 20), change(2, 5, 5), change(3, 0, 1)], 0);

    expect(history.undo()).toEqual([change(1, 10, 20), change(3, 0, 1)]);
  });
});

describe("undo and redo", () => {
  it("walks the steps back and forth", () => {
    const history = new ChangeHistory();
    history.record([change(1, 10, 20)], 0);
    history.record([change(2, 0, 1)], 10_000);

    expect(history.undo()).toEqual([change(2, 0, 1)]);
    expect(history.canRedo).toBe(true);
    expect(history.undo()).toEqual([change(1, 10, 20)]);
    expect(history.canUndo).toBe(false);

    expect(history.redo()).toEqual([change(1, 10, 20)]);
    expect(history.redo()).toEqual([change(2, 0, 1)]);
    expect(history.canRedo).toBe(false);
    expect(history.canUndo).toBe(true);
  });

  it("gives the changes of a step of several settings together", () => {
    const history = new ChangeHistory();
    history.record([change(1, 1, 2), change(2, 3, 4)], 0);

    expect(history.undo()).toEqual([change(1, 1, 2), change(2, 3, 4)]);
    expect(history.redo()).toEqual([change(1, 1, 2), change(2, 3, 4)]);
  });

  it("does not let the caller change what it keeps", () => {
    const history = new ChangeHistory();
    history.record([change(1, 1, 2)], 0);

    const first = history.undo()!;
    first[0].before = 99;
    history.redo();

    expect(history.undo()).toEqual([change(1, 1, 2)]);
  });

  it("forgets the steps to redo when something new is changed", () => {
    const history = new ChangeHistory();
    history.record([change(1, 10, 20)], 0);
    history.undo();
    expect(history.canRedo).toBe(true);

    history.record([change(2, 0, 1)], 10_000);

    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
  });
});

describe("a drag of one setting", () => {
  it("is one step: Undo goes back to where the drag started", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11)], 1000);
    history.record([change(1, 11, 14)], 1030);
    history.record([change(1, 14, 18)], 1060);

    expect(history.undoDepth).toBe(1);
    expect(history.undo()).toEqual([change(1, 10, 18)]);
  });

  it("is a new step when the next change comes after the window", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11)], 1000);
    history.record([change(1, 11, 12)], 1000 + MERGE_WINDOW_MS + 1);

    expect(history.undoDepth).toBe(2);
  });

  it("keeps joining while the changes keep coming, even past the window in total", () => {
    const history = new ChangeHistory();

    for (let i = 0; i < 40; i++) {
      history.record([change(1, i, i + 1)], 1000 + i * 100);
    }

    expect(history.undoDepth).toBe(1);
    expect(history.undo()).toEqual([change(1, 0, 40)]);
  });

  it("is dropped when the drag ends where it began", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 15)], 1000);
    history.record([change(1, 15, 10)], 1020);

    expect(history.canUndo).toBe(false);
  });

  it("is not joined to a change of another setting", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11)], 1000);
    history.record([change(2, 5, 6)], 1010);

    expect(history.undoDepth).toBe(2);
  });

  it("is not joined to a step of several settings", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11), change(2, 5, 6)], 1000);
    history.record([change(1, 11, 12)], 1010);

    expect(history.undoDepth).toBe(2);
  });

  it("is not joined to a step that was already taken back", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11)], 1000);
    history.undo();
    history.record([change(1, 10, 12)], 1010);

    expect(history.undoDepth).toBe(1);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toEqual([change(1, 10, 12)]);
  });

  it("is not joined when the clock went backwards", () => {
    const history = new ChangeHistory();

    history.record([change(1, 10, 11)], 5000);
    history.record([change(1, 11, 12)], 4000);

    expect(history.undoDepth).toBe(2);
  });
});

describe("the limit", () => {
  it("forgets the oldest steps beyond HISTORY_LIMIT", () => {
    const history = new ChangeHistory();

    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      // Far apart in time and in value, so no two steps are joined.
      history.record([change(i, 0, 1)], i * 10_000);
    }

    expect(history.undoDepth).toBe(HISTORY_LIMIT);
    // The last step is still there; the first ten are gone.
    expect(history.undo()).toEqual([change(HISTORY_LIMIT + 9, 0, 1)]);
    let oldest: SettingChange[] | null = null;
    for (let step = history.undo(); step; step = history.undo()) {
      oldest = step;
    }
    expect(oldest).toEqual([change(10, 0, 1)]);
  });
});

describe("clear", () => {
  it("forgets the steps to undo and to redo", () => {
    const history = new ChangeHistory();
    history.record([change(1, 1, 2)], 0);
    history.record([change(2, 1, 2)], 10_000);
    history.undo();

    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});

describe("a step that is not a drag", () => {
  it("is not joined by a change right after it, nor does it join the one before", () => {
    const history = new ChangeHistory();

    history.record([change(1, 128, 10)], 1000);
    history.record([change(1, 10, 128)], 1010, { joinable: false });
    history.record([change(1, 128, 20)], 1020);

    expect(history.undoDepth).toBe(3);
    expect(history.undo()).toEqual([change(1, 128, 20)]);
    expect(history.undo()).toEqual([change(1, 10, 128)]);
    expect(history.undo()).toEqual([change(1, 128, 10)]);
  });
});

describe("a gesture that changes several settings", () => {
  it("is one step even when each move of it changes other settings", () => {
    const history = new ChangeHistory();
    const drag = { group: "move:picture" };

    // Only x, then only y, then both: a widget dragged along a bent path.
    history.record([change(10, 0, 1)], 1000, drag);
    history.record([change(11, 0, 1)], 1020, drag);
    history.record([change(10, 1, 2), change(11, 1, 2)], 1040, drag);

    expect(history.undoDepth).toBe(1);
    expect(history.undo()).toEqual([change(10, 0, 2), change(11, 0, 2)]);
  });

  it("keeps what each setting had when the step began, also for one that joins late", () => {
    const history = new ChangeHistory();
    const drag = { group: "move:picture" };

    history.record([change(10, 5, 6)], 1000, drag);
    history.record([change(11, 40, 41)], 1020, drag);
    history.record([change(11, 41, 45)], 1040, drag);

    expect(history.undo()).toEqual([change(10, 5, 6), change(11, 40, 45)]);
    expect(history.redo()).toEqual([change(10, 5, 6), change(11, 40, 45)]);
  });

  it("leaves a setting out of the step when it ends where the step began", () => {
    const history = new ChangeHistory();
    const drag = { group: "move:picture" };

    history.record([change(10, 5, 6), change(11, 40, 41)], 1000, drag);
    history.record([change(10, 6, 5)], 1020, drag);

    expect(history.undoDepth).toBe(1);
    expect(history.undo()).toEqual([change(11, 40, 41)]);
  });

  it("is dropped when every setting is back where it began", () => {
    const history = new ChangeHistory();
    const drag = { group: "move:picture" };

    history.record([change(10, 5, 6), change(11, 40, 41)], 1000, drag);
    history.record([change(10, 6, 5), change(11, 41, 40)], 1020, drag);

    expect(history.canUndo).toBe(false);
  });

  it("is not joined to a gesture of another group", () => {
    const history = new ChangeHistory();

    history.record([change(10, 0, 1)], 1000, { group: "move:picture" });
    history.record([change(20, 0, 1)], 1020, { group: "move:battery" });
    history.record([change(10, 1, 2)], 1040);

    expect(history.undoDepth).toBe(3);
  });

  it("is not joined to a step of the same settings that has no group, nor the other way round", () => {
    const history = new ChangeHistory();

    history.record([change(10, 0, 1)], 1000);
    history.record([change(10, 1, 2)], 1020, { group: "move:picture" });

    expect(history.undoDepth).toBe(2);
  });

  it("is a new step after the window, like any drag", () => {
    const history = new ChangeHistory();
    const drag = { group: "move:picture" };

    history.record([change(10, 0, 1)], 1000, drag);
    history.record([change(11, 0, 1)], 1000 + MERGE_WINDOW_MS + 1, drag);

    expect(history.undoDepth).toBe(2);
  });

  it("without a group, the same settings in another order are the same gesture", () => {
    const history = new ChangeHistory();

    history.record([change(1, 0, 1), change(2, 0, 1)], 1000);
    history.record([change(2, 1, 2), change(1, 1, 2)], 1020);

    expect(history.undoDepth).toBe(1);
    expect(history.undo()).toEqual([change(1, 0, 2), change(2, 0, 2)]);
  });
});
