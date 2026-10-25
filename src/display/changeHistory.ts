/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The history of the Display and OLED tabs: what the user changed, in steps, so
 * that Undo and Redo can walk back and forth. It knows nothing about the
 * keyboard or React: DisplayController records into it and writes what it gives
 * back.
 *
 * A step is the list of settings that changed together (one slider, a widget
 * that was moved, a restore of the defaults, a file that was applied). Dragging
 * changes the same things many times in a row: those count as one step, so that
 * one Undo takes the slider, or the widget, back to where it was before the drag.
 */

/** One setting that changed: the value it had and the one it got. */
export interface SettingChange {
  id: number;
  before: number;
  after: number;
}

interface Step {
  changes: SettingChange[];
  /** When the last change of the step was made, in milliseconds. */
  at: number;
  /** Whether a change of the same group that follows soon can join the step. */
  joinable: boolean;
  /** What the changes are part of: a change of the same group joins the step. */
  group: string;
}

/** How many steps are kept; the oldest ones are forgotten beyond this. */
export const HISTORY_LIMIT = 100;

/**
 * How long a change of the same group can come after the previous one to
 * still be the same step. A drag sends changes every few tens of milliseconds;
 * two separate clicks on a control are further apart than this.
 */
export const MERGE_WINDOW_MS = 800;

export interface RecordOptions {
  /**
   * false for a step that is not a drag (a restore of the defaults): nothing
   * joins it, and it joins nothing. Default true.
   */
  joinable?: boolean;
  /**
   * What the changes belong to, for the ones that touch different settings as
   * a gesture goes on: a widget that is dragged changes only its x in one move
   * of the pointer, only its y in the next and both in the one after, and they
   * are all the same drag. Default: the settings themselves, so that changes of
   * the same settings (and only those) join.
   */
  group?: string;
}

/** The group of changes that were given none: the settings they touch. */
function groupOf(changes: readonly SettingChange[]): string {
  return `ids:${changes
    .map((c) => c.id)
    .sort((a, b) => a - b)
    .join(",")}`;
}

export class ChangeHistory {
  private past: Step[] = [];
  private future: Step[] = [];

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** How many steps Undo can still walk back. */
  get undoDepth(): number {
    return this.past.length;
  }

  /**
   * Remembers a change the user made. A new change ends the redo steps (they
   * would not lead anywhere any more). A change of the same group as the last
   * step, soon after it, joins that step: a setting that was in the step keeps
   * the value it had when the step began, and takes the new one; a setting that
   * was not is added. A setting that ends where the step began is left out of
   * it, and a step with nothing left is dropped.
   */
  record(
    changes: readonly SettingChange[],
    at: number,
    options: RecordOptions = {},
  ): void {
    const real = changes.filter((c) => c.before !== c.after);
    if (real.length === 0) {
      return;
    }

    const joinable = options.joinable ?? true;
    const group = options.group ?? groupOf(real);

    this.future = [];

    const last = this.past[this.past.length - 1];
    if (
      last &&
      joinable &&
      last.joinable &&
      last.group === group &&
      at - last.at <= MERGE_WINDOW_MS &&
      at - last.at >= 0
    ) {
      const merged = new Map(last.changes.map((c) => [c.id, c] as const));
      for (const change of real) {
        const had = merged.get(change.id);
        merged.set(
          change.id,
          had ? { ...had, after: change.after } : { ...change },
        );
      }

      last.changes = [...merged.values()].filter((c) => c.before !== c.after);
      last.at = at;
      if (last.changes.length === 0) {
        this.past.pop();
      }
      return;
    }

    this.past.push({
      changes: real.map((c) => ({ ...c })),
      at,
      joinable,
      group,
    });
    if (this.past.length > HISTORY_LIMIT) {
      this.past.shift();
    }
  }

  /**
   * Takes the last step back: returns its changes (write each `before`) and keeps
   * the step for Redo. Null when there is nothing to undo.
   */
  undo(): SettingChange[] | null {
    const step = this.past.pop();
    if (!step) {
      return null;
    }

    this.future.push(step);
    return step.changes.map((c) => ({ ...c }));
  }

  /**
   * Does the step that was taken back again: returns its changes (write each
   * `after`). Null when there is nothing to redo.
   */
  redo(): SettingChange[] | null {
    const step = this.future.pop();
    if (!step) {
      return null;
    }

    this.past.push(step);
    return step.changes.map((c) => ({ ...c }));
  }

  /** Forgets everything. */
  clear(): void {
    this.past = [];
    this.future = [];
  }
}
