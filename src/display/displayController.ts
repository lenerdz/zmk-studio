/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the Display tab does with the keyboard, without React: reading the
 * settings, changing one (the screen shows it at once, the writer sends it
 * without flooding the keyboard), restoring the defaults, and getting back to
 * what the keyboard really has when it refuses something. useDisplaySettings
 * only carries the state of one controller into React.
 */
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import type { DisplayStatus } from "./DisplayContext";
import {
  fetchDisplayInfo,
  restoreDisplayDefaults,
  sendDisplaySetting,
  type DisplaySettingData,
} from "./displayProtocol";
import { planChange } from "./displaySettings";
import { DisplayWriter } from "./displayWriter";

export interface DisplayState {
  status: DisplayStatus;
  error?: string;
  settings: DisplaySettingData[];
  problem?: string;
  busy: boolean;
}

export const INITIAL_DISPLAY_STATE: DisplayState = {
  status: "idle",
  settings: [],
  busy: false,
};

export const LOADING_DISPLAY_STATE: DisplayState = {
  ...INITIAL_DISPLAY_STATE,
  status: "loading",
};

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class DisplayController {
  private readonly conn: RpcConnection;
  private readonly onChange: (state: DisplayState) => void;
  private readonly writer: DisplayWriter;
  private state: DisplayState;
  private disposed = false;

  // The order of the changes of the user, to know which ones a new reading of
  // the keyboard may not overwrite: those made after it was asked for.
  private changeCount = 0;
  private readonly changedAt = new Map<number, number>();

  /**
   * @param initial what the tab shows until the keyboard answers: the settings
   *   of the previous controller when the app only reconnects, so the tab does
   *   not blink away.
   */
  constructor(
    conn: RpcConnection,
    onChange: (state: DisplayState) => void,
    initial: DisplayState = LOADING_DISPLAY_STATE,
    intervalMs?: number,
  ) {
    this.conn = conn;
    this.onChange = onChange;
    this.state = initial;
    this.writer = new DisplayWriter({
      send: (id, value) => sendDisplaySetting(conn, id, value),
      onError: (e) => {
        void this.recover(e);
      },
      intervalMs,
    });
  }

  getState(): DisplayState {
    return this.state;
  }

  private update(change: Partial<DisplayState>) {
    if (this.disposed) {
      return;
    }

    this.state = { ...this.state, ...change };
    this.onChange(this.state);
  }

  /** Reads the settings of the keyboard. */
  async load(): Promise<void> {
    try {
      const settings = await fetchDisplayInfo(this.conn);
      if (settings === null) {
        this.update({
          status: "unsupported",
          settings: [],
          error: undefined,
          problem: undefined,
        });
        return;
      }

      this.update({
        status: "ready",
        settings,
        error: undefined,
        problem: undefined,
      });
    } catch (e) {
      console.error("Failed to load the display settings", e);
      this.update({
        status: "error",
        error: errorText(e),
        settings: [],
        problem: undefined,
      });
    }
  }

  /**
   * Changes a setting: the new value is shown at once and goes to the keyboard
   * as soon as the writer can. Does nothing for a setting the keyboard does not
   * have, for the value it already has, or while a restore is going on.
   */
  setValue(id: number, value: number): void {
    if (this.state.status !== "ready" || this.state.busy) {
      return;
    }

    const plan = planChange(this.state.settings, id, value);
    if (!plan) {
      return;
    }

    this.changedAt.set(id, ++this.changeCount);
    this.update({ settings: plan.settings, problem: undefined });
    this.writer.set(id, plan.value);
  }

  /** Resolves when every change made so far has reached the keyboard. */
  settled(): Promise<void> {
    return this.writer.idle();
  }

  /** Puts every setting back to what the firmware was built with. */
  async restoreDefaults(): Promise<void> {
    if (this.state.status !== "ready" || this.state.busy) {
      return;
    }

    this.update({ busy: true, problem: undefined });
    try {
      // What was still waiting would undo the restore.
      await this.writer.cancel();
      const settings = await restoreDisplayDefaults(this.conn);
      this.update({ settings, busy: false });
    } catch (e) {
      console.error("Failed to restore the display settings", e);
      const asked = this.changeCount;
      this.update({ busy: false, problem: errorText(e) });
      await this.reread(asked);
    }
  }

  /** Stops talking to the keyboard; what is waiting to be sent is dropped. */
  dispose(): void {
    this.disposed = true;
    void this.writer.cancel();
  }

  /** The keyboard did not take a change: say so and show what it has. */
  private async recover(e: unknown): Promise<void> {
    console.error("Failed to change a display setting", e);
    const asked = this.changeCount;
    this.update({ problem: errorText(e) });
    await this.reread(asked);
  }

  /**
   * Shows what the keyboard has. `asked` is how many changes the user had made
   * when the keyboard was asked: a setting changed after that keeps the value the
   * user gave it, because the answer is older than the change.
   */
  private async reread(asked: number): Promise<void> {
    try {
      const settings = await fetchDisplayInfo(this.conn);
      if (!settings) {
        return;
      }

      this.update({
        settings: settings.map((s) =>
          (this.changedAt.get(s.id) ?? 0) > asked
            ? this.state.settings.find((mine) => mine.id === s.id) ?? s
            : s,
        ),
      });
    } catch (e) {
      // The problem is already shown; the settings stay as they were.
      console.error("Failed to read the display settings again", e);
    }
  }
}
