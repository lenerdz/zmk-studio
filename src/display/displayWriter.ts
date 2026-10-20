/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Sends the changes of the display settings to the keyboard. A slider that is
 * being dragged asks for dozens of values per second, and the keyboard needs
 * only the ones where it rests, so the writer
 *   - sends one request at a time, never two in flight;
 *   - keeps only the latest value asked for each setting while it waits;
 *   - leaves at least `intervalMs` between the start of two requests: the
 *     first change goes out right away, the ones that follow are held and the
 *     last value of each setting is always sent (when the slider is let go, or
 *     earlier).
 */

/** The shortest time between two requests of the writer. */
export const DISPLAY_SEND_INTERVAL_MS = 120;

export interface DisplayWriterOptions {
  /** Puts one value on the keyboard; a rejection counts as a failed request. */
  send: (id: number, value: number) => Promise<void>;
  /**
   * Called once when a request fails. The values that were still waiting are
   * dropped: the caller reads the keyboard again to know what it really has.
   */
  onError: (error: unknown) => void;
  /** Default DISPLAY_SEND_INTERVAL_MS. */
  intervalMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DisplayWriter {
  private readonly options: DisplayWriterOptions;
  private readonly intervalMs: number;

  /** What waits to be sent, in the order the settings were first changed. */
  private readonly wanted = new Map<number, number>();
  private active = false;
  private current: Promise<void> = Promise.resolve();
  private lastSentAt = Number.NEGATIVE_INFINITY;

  constructor(options: DisplayWriterOptions) {
    this.options = options;
    this.intervalMs = options.intervalMs ?? DISPLAY_SEND_INTERVAL_MS;
  }

  /** Asks for a value. Asking again for the same setting replaces the value. */
  set(id: number, value: number): void {
    this.wanted.set(id, value);

    if (!this.active) {
      this.active = true;
      // Not started here: everything asked for in the same turn goes in one
      // request, and nothing runs inside the call.
      this.current = Promise.resolve().then(() => this.run());
    }
  }

  /** Resolves when everything that was asked for has been sent (or failed). */
  async idle(): Promise<void> {
    while (this.active) {
      await this.current;
    }
  }

  /**
   * Drops what is waiting and resolves when the request that is in flight, if
   * there is one, has finished.
   */
  async cancel(): Promise<void> {
    this.wanted.clear();
    await this.idle();
  }

  private async run(): Promise<void> {
    let failure: { error: unknown } | undefined;

    try {
      while (this.wanted.size > 0) {
        const wait = this.lastSentAt + this.intervalMs - Date.now();
        if (wait > 0) {
          // Things may change while it waits (new values, a cancel): look again.
          await sleep(wait);
          continue;
        }

        const [id, value] = this.wanted.entries().next().value as [
          number,
          number,
        ];
        this.wanted.delete(id);
        this.lastSentAt = Date.now();

        try {
          await this.options.send(id, value);
        } catch (e) {
          this.wanted.clear();
          failure = { error: e };
          break;
        }
      }
    } finally {
      this.active = false;
    }

    // Told after the writer has stopped, so that whatever onError asks for
    // starts a new run instead of being left behind.
    if (failure) {
      try {
        this.options.onError(failure.error);
      } catch (e) {
        console.error("The display writer's onError failed", e);
      }
    }
  }
}
