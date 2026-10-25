/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Asks the keyboard what it is doing again and again, for as long as somebody
 * looks at it, without React (useLiveStatus carries it into React). The
 * keyboard has no notification for this: it answers one question at a time.
 *
 * What it takes care of: one question at a time (the next one is asked after
 * the answer, so a slow link is not flooded), none while the page is hidden,
 * the history of the speed that the graph of the screen draws, and giving up
 * after a few failures in a row instead of asking a keyboard that is gone.
 */
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { fetchLiveStatus, type LiveStatus } from "./liveProtocol";

/** The screen keeps the last ten readings of the speed for its graph. */
export const WPM_HISTORY_LENGTH = 10;

/** What the preview draws from: the status and the history of the speed. */
export interface LiveReading extends LiveStatus {
  /** The last readings of the speed, the oldest first: always ten. */
  wpmHistory: readonly number[];
}

export type LiveStatusKind =
  /** Nobody looks, or the keyboard is not there (not connected or locked). */
  | "idle"
  | "loading"
  | "ready"
  /** The firmware does not have the live status request. */
  | "unsupported"
  | "error";

export interface LiveState {
  status: LiveStatusKind;
  reading: LiveReading | null;
  /** What went wrong when status is "error". */
  error?: string;
}

export const IDLE_LIVE_STATE: LiveState = { status: "idle", reading: null };

/** The history after a new reading: the oldest one leaves. */
export function pushWpm(history: readonly number[], wpm: number): number[] {
  return [...history.slice(1 - WPM_HISTORY_LENGTH), wpm];
}

export interface PollerOptions {
  /** Milliseconds between the end of an answer and the next question. Default 500. */
  intervalMs?: number;
  /** Milliseconds between two entries of the history of the speed. Default 1000. */
  historyEveryMs?: number;
  /** Failures in a row before the poller gives up. Default 3. */
  failuresBeforeError?: number;
  /** For tests: the clock in ms. Default Date.now. */
  now?: () => number;
  /** For tests: whether the page is shown. Default: the visibility of the document. */
  visible?: () => boolean;
}

function pageIsShown(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class LiveStatusPoller {
  private readonly conn: RpcConnection;
  private readonly onChange: (state: LiveState) => void;
  private readonly intervalMs: number;
  private readonly historyEveryMs: number;
  private readonly failuresBeforeError: number;
  private readonly now: () => number;
  private readonly visible: () => boolean;

  private state: LiveState = IDLE_LIVE_STATE;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private failures = 0;
  private history: number[] = [];
  private lastHistoryAt: number | null = null;

  constructor(
    conn: RpcConnection,
    onChange: (state: LiveState) => void,
    options: PollerOptions = {},
  ) {
    this.conn = conn;
    this.onChange = onChange;
    this.intervalMs = options.intervalMs ?? 500;
    this.historyEveryMs = options.historyEveryMs ?? 1000;
    this.failuresBeforeError = options.failuresBeforeError ?? 3;
    this.now = options.now ?? Date.now;
    this.visible = options.visible ?? pageIsShown;
  }

  getState(): LiveState {
    return this.state;
  }

  private update(state: LiveState) {
    this.state = state;
    this.onChange(state);
  }

  /** Starts asking, at once. Does nothing when it is already running. */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.failures = 0;
    this.history = new Array<number>(WPM_HISTORY_LENGTH).fill(0);
    this.lastHistoryAt = null;
    this.update({ status: "loading", reading: null });
    this.schedule(0);
  }

  /** Stops asking. An answer that is still on its way is dropped. */
  stop(): void {
    this.running = false;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(ms: number) {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.tick();
    }, ms);
  }

  private reading(status: LiveStatus): LiveReading {
    const at = this.now();

    if (this.lastHistoryAt === null) {
      // The first reading: the speed of now is the last one, the rest were zero
      this.history = pushWpm(this.history, status.wpm);
      this.lastHistoryAt = at;
    } else if (at - this.lastHistoryAt >= this.historyEveryMs) {
      this.history = pushWpm(this.history, status.wpm);
      this.lastHistoryAt = at;
    }

    return { ...status, wpmHistory: this.history };
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Nothing is asked while nobody can see the answer
    if (!this.visible()) {
      this.schedule(1000);
      return;
    }

    try {
      const status = await fetchLiveStatus(this.conn);
      if (!this.running) {
        return;
      }

      if (status === null) {
        this.running = false;
        this.update({ status: "unsupported", reading: null });
        return;
      }

      this.failures = 0;
      this.update({ status: "ready", reading: this.reading(status) });
      this.schedule(this.intervalMs);
    } catch (e) {
      if (!this.running) {
        return;
      }

      this.failures++;
      if (this.failures >= this.failuresBeforeError) {
        this.running = false;
        console.error("Failed to read the live status", e);
        this.update({
          status: "error",
          reading: this.state.reading,
          error: errorText(e),
        });
        return;
      }

      this.schedule(this.intervalMs);
    }
  }
}
