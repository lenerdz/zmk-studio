/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISPLAY_SEND_INTERVAL_MS, DisplayWriter } from "./displayWriter";

interface Sent {
  id: number;
  value: number;
  at: number;
}

/** A writer whose requests are recorded and finish at once. */
function recordingWriter(
  options: { fail?: (id: number, value: number) => boolean } = {},
) {
  const sent: Sent[] = [];
  const errors: unknown[] = [];
  let inFlight = 0;
  let mostInFlight = 0;

  const writer = new DisplayWriter({
    send: async (id, value) => {
      inFlight++;
      mostInFlight = Math.max(mostInFlight, inFlight);
      sent.push({ id, value, at: Date.now() });
      // The answer of the keyboard takes a moment.
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight--;
      if (options.fail?.(id, value)) {
        throw new Error(`refused ${id}=${value}`);
      }
    },
    onError: (e) => errors.push(e),
  });

  return { writer, sent, errors, mostInFlight: () => mostInFlight };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DisplayWriter", () => {
  it("sends the first change at once", async () => {
    const { writer, sent } = recordingWriter();

    writer.set(1, 200);
    await vi.advanceTimersByTimeAsync(0);

    expect(sent).toEqual([{ id: 1, value: 200, at: 1_000_000 }]);
  });

  it("sends only the last value of what is asked in the same turn", async () => {
    const { writer, sent } = recordingWriter();

    // A slider dragged from 0 to 100 within one turn of the event loop.
    for (let value = 0; value <= 100; value++) {
      writer.set(1, value);
    }
    await vi.runAllTimersAsync();
    await writer.idle();

    expect(sent.map((s) => s.value)).toEqual([100]);
  });

  it("sends the first value of a drag at once and then the last one", async () => {
    const { writer, sent } = recordingWriter();

    // A slider dragged from 0 to 100, one value every 4 ms.
    for (let value = 0; value <= 100; value++) {
      writer.set(1, value);
      await vi.advanceTimersByTimeAsync(4);
    }
    await vi.runAllTimersAsync();

    expect(sent[0].value).toBe(0);
    expect(sent.at(-1)?.value).toBe(100);
    // 100 values in 400 ms: far fewer requests than values.
    expect(sent.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < sent.length; i++) {
      expect(sent[i].at - sent[i - 1].at).toBeGreaterThanOrEqual(
        DISPLAY_SEND_INTERVAL_MS,
      );
    }
  });

  it("leaves the interval between the start of two requests", async () => {
    const { writer, sent } = recordingWriter();

    writer.set(1, 10);
    await vi.advanceTimersByTimeAsync(5);
    writer.set(1, 20);
    await vi.runAllTimersAsync();

    expect(sent).toHaveLength(2);
    expect(sent[1].at - sent[0].at).toBeGreaterThanOrEqual(
      DISPLAY_SEND_INTERVAL_MS,
    );
  });

  it("holds the change that arrives during the interval until it ends", async () => {
    const { writer, sent } = recordingWriter();

    writer.set(1, 10);
    await vi.advanceTimersByTimeAsync(50);
    writer.set(1, 20);
    await vi.advanceTimersByTimeAsync(DISPLAY_SEND_INTERVAL_MS - 51);
    expect(sent).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(2);
    expect(sent.map((s) => s.value)).toEqual([10, 20]);
  });

  it("sends the settings in the order they were first changed", async () => {
    const { writer, sent } = recordingWriter();

    writer.set(3, 1);
    writer.set(1, 100);
    writer.set(2, 50);
    // Changing one that is waiting does not send it ahead of the others.
    writer.set(1, 120);
    await vi.runAllTimersAsync();

    expect(sent.map((s) => [s.id, s.value])).toEqual([
      [3, 1],
      [1, 120],
      [2, 50],
    ]);
  });

  it("never has two requests in flight", async () => {
    const { writer, mostInFlight } = recordingWriter();

    for (let id = 1; id <= 6; id++) {
      writer.set(id, id * 10);
    }
    await vi.runAllTimersAsync();

    expect(mostInFlight()).toBe(1);
  });

  it("uses the interval it is given", async () => {
    const sent: number[] = [];
    const writer = new DisplayWriter({
      send: async (_id, value) => {
        sent.push(value);
      },
      onError: () => {},
      intervalMs: 1000,
    });

    writer.set(1, 1);
    writer.set(2, 2);
    await vi.advanceTimersByTimeAsync(999);
    expect(sent).toEqual([1]);

    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toEqual([1, 2]);
  });

  it("keeps working after the writer has been idle", async () => {
    const { writer, sent } = recordingWriter();

    writer.set(1, 10);
    await vi.runAllTimersAsync();
    await vi.advanceTimersByTimeAsync(5000);
    writer.set(1, 20);
    await vi.runAllTimersAsync();

    expect(sent.map((s) => s.value)).toEqual([10, 20]);
  });

  describe("when the keyboard refuses a change", () => {
    it("tells it once and drops what was waiting", async () => {
      const { writer, sent, errors } = recordingWriter({
        fail: (id) => id === 1,
      });

      writer.set(1, 10);
      writer.set(2, 20);
      writer.set(3, 30);
      await vi.runAllTimersAsync();

      expect(sent.map((s) => s.id)).toEqual([1]);
      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe("refused 1=10");
    });

    it("sends what is asked for afterwards", async () => {
      const { writer, sent, errors } = recordingWriter({
        fail: (id, value) => id === 1 && value === 10,
      });

      writer.set(1, 10);
      await vi.runAllTimersAsync();
      expect(errors).toHaveLength(1);

      writer.set(1, 11);
      await vi.runAllTimersAsync();
      expect(sent.map((s) => s.value)).toEqual([10, 11]);
      expect(errors).toHaveLength(1);
    });

    it("starts again for a change that onError asks for", async () => {
      const sent: number[] = [];
      let refused = false;
      const writer: DisplayWriter = new DisplayWriter({
        send: async (_id, value) => {
          sent.push(value);
          if (!refused) {
            refused = true;
            throw new Error("refused");
          }
        },
        // What the app does: it shows the problem, and a change can be made.
        onError: () => writer.set(2, 99),
      });

      writer.set(1, 10);
      await vi.runAllTimersAsync();
      await writer.idle();

      expect(sent).toEqual([10, 99]);
    });

    it("does not leave the writer stuck when send throws at once", async () => {
      const errors: unknown[] = [];
      let calls = 0;
      const writer = new DisplayWriter({
        send: () => {
          calls++;
          throw new Error("no connection");
        },
        onError: (e) => errors.push(e),
      });

      writer.set(1, 1);
      await vi.runAllTimersAsync();
      writer.set(1, 2);
      await vi.runAllTimersAsync();

      expect(calls).toBe(2);
      expect(errors).toHaveLength(2);
    });
  });

  describe("cancel", () => {
    it("drops what is waiting", async () => {
      const { writer, sent } = recordingWriter();

      writer.set(1, 10);
      await vi.advanceTimersByTimeAsync(0);
      // The first one is in flight now; these two wait behind it.
      writer.set(2, 20);
      writer.set(3, 30);
      const cancelled = writer.cancel();
      await vi.runAllTimersAsync();
      await cancelled;

      expect(sent.map((s) => s.id)).toEqual([1]);
    });

    it("waits for the request that is in flight", async () => {
      let finished = false;
      const writer = new DisplayWriter({
        send: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          finished = true;
        },
        onError: () => {},
      });

      writer.set(1, 10);
      await vi.advanceTimersByTimeAsync(0);
      writer.set(2, 20);
      const cancelled = writer.cancel();
      await vi.advanceTimersByTimeAsync(49);
      expect(finished).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await cancelled;
      expect(finished).toBe(true);
    });

    it("leaves the writer usable", async () => {
      const { writer, sent } = recordingWriter();

      writer.set(1, 10);
      await vi.advanceTimersByTimeAsync(0);
      const cancelled = writer.cancel();
      await vi.runAllTimersAsync();
      await cancelled;
      writer.set(2, 20);
      await vi.runAllTimersAsync();

      expect(sent.map((s) => s.id)).toEqual([1, 2]);
    });

    it("drops a change asked for before the writer had started", async () => {
      const { writer, sent } = recordingWriter();

      writer.set(1, 10);
      await writer.cancel();
      await vi.runAllTimersAsync();

      expect(sent).toEqual([]);
    });
  });

  describe("idle", () => {
    it("resolves at once when nothing was asked", async () => {
      const { writer } = recordingWriter();

      await expect(writer.idle()).resolves.toBeUndefined();
    });

    it("resolves when everything asked for has been sent", async () => {
      const { writer, sent } = recordingWriter();

      writer.set(1, 10);
      writer.set(2, 20);
      const idle = writer.idle();
      await vi.runAllTimersAsync();
      await idle;

      expect(sent.map((s) => s.id)).toEqual([1, 2]);
    });
  });
});
