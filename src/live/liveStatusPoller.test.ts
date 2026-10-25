/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The poller of the live status with a fake clock and a keyboard that answers
 * what the test says (liveProtocol is replaced: its own tests ask the demo
 * keyboard through the framing).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import type { LiveStatus } from "./liveProtocol";
import { fetchLiveStatus } from "./liveProtocol";
import {
  LiveStatusPoller,
  pushWpm,
  WPM_HISTORY_LENGTH,
  type LiveState,
} from "./liveStatusPoller";

vi.mock("./liveProtocol", () => ({ fetchLiveStatus: vi.fn() }));

const ask = vi.mocked(fetchLiveStatus);
const conn = {} as RpcConnection;

function status(wpm: number): LiveStatus {
  return {
    batteryCentral: 80,
    batteryPeripheral: 90,
    peripheralConnected: true,
    layerIndex: 0,
    layerName: "Base",
    wpm,
    output: "usb",
    bleProfile: 0,
    bleState: "connected",
    usbState: "hid",
    uptimeS: 10,
  };
}

function start(options: ConstructorParameters<typeof LiveStatusPoller>[2] = {}) {
  const states: LiveState[] = [];
  const poller = new LiveStatusPoller(conn, (s) => states.push(s), options);
  poller.start();
  return { poller, states };
}

beforeEach(() => {
  vi.useFakeTimers();
  ask.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pushWpm", () => {
  it("lets the oldest reading go and keeps ten", () => {
    const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(pushWpm(ten, 11)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(pushWpm(ten, 11)).toHaveLength(WPM_HISTORY_LENGTH);
  });

  it("does not change the history it was given", () => {
    const ten = new Array<number>(10).fill(0);

    pushWpm(ten, 5);

    expect(ten).toEqual(new Array<number>(10).fill(0));
  });
});

describe("LiveStatusPoller", () => {
  it("says it is loading, then gives the first reading with the speed last in the history", async () => {
    ask.mockResolvedValue(status(40));

    const { states } = start();
    expect(states.at(-1)).toEqual({ status: "loading", reading: null });

    await vi.advanceTimersByTimeAsync(0);

    const last = states.at(-1);
    expect(last?.status).toBe("ready");
    expect(last?.reading?.wpm).toBe(40);
    expect(last?.reading?.wpmHistory).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 40]);
  });

  it("asks again after the interval, and not before", async () => {
    ask.mockResolvedValue(status(1));
    start({ intervalMs: 500 });

    await vi.advanceTimersByTimeAsync(0);
    expect(ask).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(499);
    expect(ask).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("asks one question at a time: the next one waits for the answer", async () => {
    let answer: (s: LiveStatus) => void = () => {};
    ask.mockImplementation(
      () => new Promise<LiveStatus>((resolve) => (answer = resolve)),
    );
    start({ intervalMs: 100 });

    await vi.advanceTimersByTimeAsync(5000);
    expect(ask).toHaveBeenCalledTimes(1);

    answer(status(3));
    await vi.advanceTimersByTimeAsync(100);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("adds an entry to the history of the speed once a second, not at every answer", async () => {
    let wpm = 10;
    ask.mockImplementation(async () => status(wpm));
    const { states } = start({ intervalMs: 500, historyEveryMs: 1000 });

    await vi.advanceTimersByTimeAsync(0); // reading 1: 10, history [..., 10]
    wpm = 20;
    await vi.advanceTimersByTimeAsync(500); // reading 2: too soon for the history
    expect(states.at(-1)?.reading?.wpm).toBe(20);
    expect(states.at(-1)?.reading?.wpmHistory.at(-1)).toBe(10);

    wpm = 30;
    await vi.advanceTimersByTimeAsync(500); // reading 3: one second after the first
    expect(states.at(-1)?.reading?.wpmHistory.slice(-2)).toEqual([10, 30]);
  });

  it("stops asking when the keyboard has no live status", async () => {
    ask.mockResolvedValue(null);

    const { states } = start();
    await vi.advanceTimersByTimeAsync(0);

    expect(states.at(-1)).toEqual({ status: "unsupported", reading: null });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("tries again after a failure and starts counting over after an answer", async () => {
    ask
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockResolvedValueOnce(status(5))
      .mockRejectedValueOnce(new Error("c"))
      .mockRejectedValueOnce(new Error("d"))
      .mockResolvedValue(status(6));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { states } = start({ intervalMs: 100, failuresBeforeError: 3 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(states.some((s) => s.status === "error")).toBe(false);
    expect(states.at(-1)?.status).toBe("ready");
  });

  it("gives up after three failures in a row and says what went wrong", async () => {
    ask.mockRejectedValue(new Error("the keyboard is gone"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { states } = start({ intervalMs: 100 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(states.at(-1)).toMatchObject({
      status: "error",
      error: "the keyboard is gone",
    });
    expect(ask).toHaveBeenCalledTimes(3);
  });

  it("keeps the last reading when it gives up", async () => {
    ask
      .mockResolvedValueOnce(status(7))
      .mockRejectedValue(new Error("gone"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { states } = start({ intervalMs: 100 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(states.at(-1)?.status).toBe("error");
    expect(states.at(-1)?.reading?.wpm).toBe(7);
  });

  it("stops when it is told to, and drops an answer that was on its way", async () => {
    let answer: (s: LiveStatus) => void = () => {};
    ask.mockImplementation(
      () => new Promise<LiveStatus>((resolve) => (answer = resolve)),
    );
    const { poller, states } = start();
    await vi.advanceTimersByTimeAsync(0);
    const before = states.length;

    poller.stop();
    answer(status(9));
    await vi.advanceTimersByTimeAsync(5000);

    expect(states).toHaveLength(before);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("does not start twice", async () => {
    ask.mockResolvedValue(status(1));
    const { poller } = start();

    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("asks nothing while the page is hidden, and goes on when it is shown again", async () => {
    ask.mockResolvedValue(status(1));
    let shown = false;
    start({ intervalMs: 100, visible: () => shown });

    await vi.advanceTimersByTimeAsync(5000);
    expect(ask).not.toHaveBeenCalled();

    shown = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(ask).toHaveBeenCalled();
  });
});
