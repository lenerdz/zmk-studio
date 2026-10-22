/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the Display tab does with the keyboard, against the demo keyboard and
 * through the same framing and message encoding the app uses with a real one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDemo } from "../lights/testUtils";
import type { DemoDeviceOptions } from "../lights/demo/demoDevice";
import { DEMO_DISPLAY_SETTINGS } from "./demo/demoDisplay";
import {
  DisplayController,
  INITIAL_DISPLAY_STATE,
  LOADING_DISPLAY_STATE,
  type DisplayState,
} from "./displayController";
import { stateWhileLoading } from "./useDisplaySettings";

beforeEach(() => {
  // The app logs every request and answer; the controller logs its failures.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A controller on a demo keyboard, with the states it reports recorded. */
function open(options?: DemoDeviceOptions) {
  const keyboard = connectDemo(options);
  const states: DisplayState[] = [];
  const controller = new DisplayController(
    keyboard.conn,
    (s) => states.push(s),
    LOADING_DISPLAY_STATE,
    // A short interval: the tests are about the order, not about the time.
    5,
  );

  const value = (id: number) =>
    controller.getState().settings.find((s) => s.id === id)?.value;

  return { ...keyboard, controller, states, value };
}

/** How many requests that change a display setting the keyboard has seen. */
function countWrites(device: ReturnType<typeof connectDemo>["device"]) {
  const handle = device.handle.bind(device);
  let writes = 0;
  vi.spyOn(device, "handle").mockImplementation((request) => {
    if (request.keymap?.setDisplaySetting !== undefined) {
      writes++;
    }
    return handle(request);
  });

  return () => writes;
}

describe("load", () => {
  it("reads the settings and becomes ready", async () => {
    const { controller, states } = open();

    expect(controller.getState().status).toBe("loading");
    await controller.load();

    expect(controller.getState()).toMatchObject({
      status: "ready",
      busy: false,
      problem: undefined,
    });
    expect(controller.getState().settings).toEqual([...DEMO_DISPLAY_SETTINGS]);
    // The tab was told.
    expect(states.at(-1)).toBe(controller.getState());
  });

  it("is unsupported on a keyboard without the display settings", async () => {
    const { controller } = open({ display: false });

    await controller.load();

    expect(controller.getState()).toMatchObject({
      status: "unsupported",
      settings: [],
    });
  });

  it("reports an error when the keyboard cannot be read", async () => {
    const { controller, close } = open();
    close();

    await controller.load();

    expect(controller.getState().status).toBe("error");
    expect(controller.getState().error).toBeTruthy();
  });

  it("starts from the state it is given", () => {
    const keyboard = connectDemo();
    const ready: DisplayState = {
      status: "ready",
      settings: [...DEMO_DISPLAY_SETTINGS],
      busy: false,
    };

    const controller = new DisplayController(
      keyboard.conn,
      () => {},
      stateWhileLoading(ready),
    );

    expect(controller.getState()).toBe(ready);
  });
});

describe("stateWhileLoading", () => {
  it("keeps the settings a controller already had", () => {
    const ready: DisplayState = {
      status: "ready",
      settings: [...DEMO_DISPLAY_SETTINGS],
      busy: false,
    };

    expect(stateWhileLoading(ready)).toBe(ready);
  });

  it("shows loading for anything else", () => {
    for (const status of ["idle", "loading", "unsupported", "error"] as const) {
      expect(stateWhileLoading({ ...INITIAL_DISPLAY_STATE, status })).toBe(
        LOADING_DISPLAY_STATE,
      );
    }
  });
});

describe("setValue", () => {
  it("shows the change at once and the keyboard gets it", async () => {
    const { controller, device, value } = open();
    await controller.load();

    controller.setValue(1, 200);

    // Before the keyboard has answered anything.
    expect(value(1)).toBe(200);
    await controller.settled();
    expect(device.displayValue(1)).toBe(200);
    expect(value(1)).toBe(200);
  });

  it("holds the value inside the range the keyboard gave", async () => {
    const { controller, device, value } = open();
    await controller.load();

    controller.setValue(1, 9999);
    controller.setValue(4, 1);
    await controller.settled();

    expect(value(1)).toBe(255);
    expect(value(4)).toBe(30);
    expect(device.displayValue(1)).toBe(255);
    expect(device.displayValue(4)).toBe(30);
  });

  it("sends no request for the value a setting already has", async () => {
    const { controller, device } = open();
    await controller.load();
    const writes = countWrites(device);

    controller.setValue(1, 128); // the value it has
    controller.setValue(1, 1000); // held at 255: a change
    controller.setValue(1, 255); // the value it has now
    await controller.settled();
    expect(writes()).toBe(1);

    controller.setValue(1, 255);
    await controller.settled();

    expect(writes()).toBe(1);
  });

  it("does nothing for a setting the keyboard does not have", async () => {
    const { controller, device, states } = open();
    await controller.load();
    const writes = countWrites(device);
    const before = states.length;

    controller.setValue(99, 5);
    await controller.settled();

    expect(writes()).toBe(0);
    expect(states).toHaveLength(before);
  });

  it("does nothing until the settings have been read", async () => {
    const { controller, device } = open();
    const writes = countWrites(device);

    controller.setValue(1, 10);
    await controller.settled();

    expect(writes()).toBe(0);
    expect(device.displayValue(1)).toBe(128);
  });

  it("does not flood the keyboard while a slider is dragged", async () => {
    const { controller, device, value } = open();
    await controller.load();
    const writes = countWrites(device);

    for (let v = 129; v <= 255; v++) {
      controller.setValue(1, v);
    }
    await controller.settled();

    expect(writes()).toBeLessThanOrEqual(3);
    // What counts is where the slider stopped.
    expect(device.displayValue(1)).toBe(255);
    expect(value(1)).toBe(255);
  });

  it("changes several settings, each to its last value", async () => {
    const { controller, device } = open();
    await controller.load();

    controller.setValue(1, 10);
    controller.setValue(3, 2);
    controller.setValue(4, 120);
    controller.setValue(1, 20);
    controller.setValue(6, 2500);
    await controller.settled();

    expect(device.displayValue(1)).toBe(20);
    expect(device.displayValue(3)).toBe(2);
    expect(device.displayValue(4)).toBe(120);
    expect(device.displayValue(6)).toBe(2500);
  });

  it("clears the last problem when a change is made", async () => {
    const { controller } = open({ refuseDisplayWrites: 1 });
    await controller.load();
    controller.setValue(1, 200);
    await controller.settled();
    await vi.waitFor(() => expect(controller.getState().problem).toBeDefined());

    controller.setValue(1, 100);

    expect(controller.getState().problem).toBeUndefined();
    await controller.settled();
  });
});

describe("when the keyboard refuses a change", () => {
  it("says so and shows what the keyboard really has", async () => {
    const { controller, device, value } = open({ refuseDisplayWrites: 1 });
    await controller.load();

    controller.setValue(1, 200);
    expect(value(1)).toBe(200);
    await controller.settled();

    await vi.waitFor(() => {
      expect(controller.getState().problem).toMatch(
        /does not accept 200 for the setting 1/,
      );
      // Back to the 128 the keyboard kept.
      expect(value(1)).toBe(128);
    });
    expect(device.displayValue(1)).toBe(128);
    expect(controller.getState().status).toBe("ready");
  });

  it("works again after the problem", async () => {
    const { controller, device } = open({ refuseDisplayWrites: 1 });
    await controller.load();
    controller.setValue(1, 200);
    await controller.settled();
    await vi.waitFor(() => expect(controller.getState().problem).toBeDefined());

    controller.setValue(1, 100);
    await controller.settled();

    expect(device.displayValue(1)).toBe(100);
    expect(controller.getState().problem).toBeUndefined();
  });

  it("keeps what the user changes while it reads the keyboard again", async () => {
    // The change is made the moment the problem is shown, before the answer of
    // the keyboard about its settings, which is older than the change.
    const keyboard = connectDemo({ refuseDisplayWrites: 1 });
    let changed = false;
    const controller: DisplayController = new DisplayController(
      keyboard.conn,
      (state) => {
        if (state.problem && !changed) {
          changed = true;
          controller.setValue(2, 77);
        }
      },
      LOADING_DISPLAY_STATE,
      5,
    );
    await controller.load();

    controller.setValue(1, 200);
    await controller.settled();
    await vi.waitFor(() => expect(changed).toBe(true));
    await controller.settled();
    // Let the answer about the settings arrive.
    await vi.waitFor(() => {
      expect(
        controller.getState().settings.find((s) => s.id === 1)?.value,
      ).toBe(128);
    });

    expect(keyboard.device.displayValue(2)).toBe(77);
    expect(controller.getState().settings.find((s) => s.id === 2)?.value).toBe(
      77,
    );
  });

  it("drops the changes that were waiting behind the refused one", async () => {
    const { controller, device } = open({ refuseDisplayWrites: 1 });
    await controller.load();

    controller.setValue(1, 200);
    controller.setValue(2, 50);
    await controller.settled();

    await vi.waitFor(() => expect(controller.getState().problem).toBeDefined());
    // The second one never went out, and the screen shows what the keyboard has.
    expect(device.displayValue(2)).toBe(128);
    await vi.waitFor(() =>
      expect(
        controller.getState().settings.find((s) => s.id === 2)?.value,
      ).toBe(128),
    );
  });
});

describe("restoreDefaults", () => {
  it("puts every setting back, in the keyboard and on the screen", async () => {
    const { controller, device } = open();
    await controller.load();
    controller.setValue(1, 10);
    controller.setValue(3, 2);
    controller.setValue(5, 0);
    await controller.settled();

    await controller.restoreDefaults();

    expect(controller.getState().settings).toEqual([...DEMO_DISPLAY_SETTINGS]);
    expect(controller.getState().busy).toBe(false);
    expect(device.displayValue(1)).toBe(128);
    expect(device.displayValue(3)).toBe(0);
    expect(device.displayValue(5)).toBe(1);
  });

  it("drops the changes that were still waiting", async () => {
    const { controller, device } = open();
    await controller.load();

    controller.setValue(1, 10);
    controller.setValue(2, 20);
    controller.setValue(2, 30);
    await controller.restoreDefaults();
    // Give anything that was left a chance to arrive.
    await controller.settled();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(device.displayValue(1)).toBe(128);
    expect(device.displayValue(2)).toBe(128);
    expect(controller.getState().settings).toEqual([...DEMO_DISPLAY_SETTINGS]);
  });

  it("is busy while it works and ignores changes then", async () => {
    const { controller, device, states } = open();
    await controller.load();
    controller.setValue(1, 10);
    await controller.settled();

    const restoring = controller.restoreDefaults();
    expect(controller.getState().busy).toBe(true);
    controller.setValue(1, 50);
    await restoring;

    expect(states.some((s) => s.busy)).toBe(true);
    expect(controller.getState().busy).toBe(false);
    expect(device.displayValue(1)).toBe(128);
    expect(controller.getState().settings.find((s) => s.id === 1)?.value).toBe(
      128,
    );
  });

  it("does not start another restore while one is going on", async () => {
    const { controller, device } = open();
    await controller.load();
    const handle = device.handle.bind(device);
    let restores = 0;
    vi.spyOn(device, "handle").mockImplementation((request) => {
      if (request.keymap?.restoreDisplayDefaults !== undefined) {
        restores++;
      }
      return handle(request);
    });

    await Promise.all([
      controller.restoreDefaults(),
      controller.restoreDefaults(),
    ]);

    expect(restores).toBe(1);
  });

  it("says so when the keyboard does not answer", async () => {
    const { controller, close } = open();
    await controller.load();
    close();

    await controller.restoreDefaults();

    expect(controller.getState().busy).toBe(false);
    expect(controller.getState().problem).toBeTruthy();
    // The settings it had are still there.
    expect(controller.getState().status).toBe("ready");
    expect(controller.getState().settings).toHaveLength(
      DEMO_DISPLAY_SETTINGS.length,
    );
  });
});

describe("dispose", () => {
  it("reports nothing after it, and drops what was waiting", async () => {
    const { controller, device, states } = open();
    await controller.load();
    controller.setValue(1, 10);
    controller.setValue(2, 20);

    controller.dispose();
    const reported = states.length;
    controller.setValue(3, 2);
    await controller.settled();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(states).toHaveLength(reported);
    // The second change was waiting and never went out.
    expect(device.displayValue(2)).toBe(128);
  });
});
