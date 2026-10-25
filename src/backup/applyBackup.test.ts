/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Applying a file to the demo keyboard, through the same framing and message
 * encoding the app uses with a real one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Keymap } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { DEMO_DISPLAY_SETTINGS } from "../display/demo/demoDisplay";
import { corneBehaviors, corneKeymap } from "../keyboard/corne.mock";
import { connectDemo } from "../lights/testUtils";
import { call_rpc_strict } from "../rpc/logging";
import type { DoCallback, UndoCallback } from "../undoRedo";
import { writeKeyOps } from "./applyKeys";
import {
  applyBackup,
  hasChanges,
  type ApplyTargets,
  type Plans,
  type Section,
} from "./applyBackup";
import {
  collectKeys,
  collectScreens,
  keyOps,
  planKeys,
  planLights,
  planScreens,
  type KeyOp,
} from "./backupPlan";

beforeEach(() => {
  // The app logs every request and answer.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const transparent = () =>
  Object.values(corneBehaviors).find((b) => b.displayName === "Transparent")!.id;

/** What the keyboard has, read the way the app reads it. */
async function keymapOf(conn: ReturnType<typeof connectDemo>["conn"]): Promise<Keymap> {
  const response = await call_rpc_strict(conn, { keymap: { getKeymap: true } });
  return response.keymap!.getKeymap!;
}

describe("writeKeyOps", () => {
  const ops = (): KeyOp[] => [
    { kind: "name", layerId: corneKeymap.layers[0].id, to: "BASE", from: "QWERTY" },
    {
      kind: "binding",
      layerId: corneKeymap.layers[1].id,
      keyPosition: 2,
      to: { behaviorId: transparent(), param1: 0, param2: 0 },
      from: corneKeymap.layers[1].bindings[2],
    },
    {
      kind: "binding",
      layerId: corneKeymap.layers[1].id,
      keyPosition: 7,
      to: { behaviorId: transparent(), param1: 0, param2: 0 },
      from: corneKeymap.layers[1].bindings[7],
    },
  ];

  it("writes the names and the keys to the keyboard", async () => {
    const { conn } = connectDemo();

    await writeKeyOps(conn, ops(), "apply");
    const keymap = await keymapOf(conn);

    expect(keymap.layers[0].name).toBe("BASE");
    expect(keymap.layers[1].bindings[2]).toEqual({
      behaviorId: transparent(),
      param1: 0,
      param2: 0,
    });
    expect(keymap.layers[1].bindings[7].behaviorId).toBe(transparent());
    // The rest is as it was.
    expect(keymap.layers[1].bindings[3]).toEqual(corneKeymap.layers[1].bindings[3]);
  });

  it("puts them back", async () => {
    const { conn } = connectDemo();
    await writeKeyOps(conn, ops(), "apply");

    await writeKeyOps(conn, ops(), "revert");

    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("does nothing for no ops", async () => {
    const { conn } = connectDemo();

    await writeKeyOps(conn, [], "apply");

    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("puts back what it wrote when the keyboard refuses a key", async () => {
    const { conn } = connectDemo();
    const refused: KeyOp = {
      kind: "binding",
      layerId: corneKeymap.layers[2].id,
      keyPosition: 1,
      // A behavior the keyboard does not have
      to: { behaviorId: 9999, param1: 0, param2: 0 },
      from: corneKeymap.layers[2].bindings[1],
    };

    await expect(
      writeKeyOps(conn, [...ops(), refused], "apply"),
    ).rejects.toThrow(/the keyboard did not accept the key 1 of the layer/);

    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("puts back what it wrote when the keyboard refuses a name", async () => {
    const { conn } = connectDemo();
    const refused: KeyOp = { kind: "name", layerId: 999, to: "X", from: "Y" };

    await expect(
      writeKeyOps(conn, [...ops(), refused], "apply"),
    ).rejects.toThrow(/did not accept the name "X" for the layer 999/);

    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("puts back what it wrote when the keyboard stops answering", async () => {
    const { conn, device, close } = connectDemo();
    const handle = device.handle.bind(device);
    let writes = 0;
    vi.spyOn(device, "handle").mockImplementation((request) => {
      if (request.keymap?.setLayerBinding !== undefined && ++writes === 2) {
        close();
      }
      return handle(request);
    });

    await expect(writeKeyOps(conn, ops(), "apply")).rejects.toThrow(
      /Could not write the keys/,
    );
  });
});

describe("hasChanges", () => {
  it("is false for a part that has no plan", () => {
    for (const section of ["keys", "lights", "screens"] as const) {
      expect(hasChanges({}, section)).toBe(false);
    }
  });
});

describe("applyBackup", () => {
  const chosenAll: Record<Section, boolean> = {
    keys: true,
    lights: true,
    screens: true,
  };

  /** A file that differs from the demo keyboard in two keys, a name, two layers of colors and two settings. */
  function setup() {
    const keyboard = connectDemo();

    const file = collectKeys(corneKeymap, corneBehaviors)!;
    file.layers[0].name = "BASE";
    file.layers[1].bindings[0] = { behavior: "Transparent", param1: 0, param2: 0 };
    file.layers[3].bindings[5] = { behavior: "None", param1: 0, param2: 0 };
    const keys = planKeys(file, corneKeymap, corneBehaviors);

    const lights = planLights(
      {
        slotCount: 2,
        layers: [
          { id: 0, name: "QWERTY", colors: ["#111111", "#222222"] },
          { id: 1, name: "FN1", colors: ["#333333", "#444444"] },
        ],
      },
      {
        slotCount: 2,
        layerIds: [0, 1],
        maps: { 0: [0, 0], 1: [0, 0] },
      },
      new Map(),
    );

    const screensFile = collectScreens(DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s })))!;
    screensFile.settings.find((s) => s.id === 1)!.value = 10;
    screensFile.settings.find((s) => s.id === 3)!.value = 2;
    const screens = planScreens(screensFile, DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s })));

    const plans: Plans = { keys, lights, screens };

    let undo: UndoCallback | null = null;
    const doIt = vi.fn(async (callback: DoCallback) => {
      undo = await callback();
    });
    const paint = vi.fn<ApplyTargets["paint"]>(async () => {});
    const setValues = vi.fn<ApplyTargets["setValues"]>();
    const reloadKeys = vi.fn();
    const targets: ApplyTargets = {
      conn: keyboard.conn,
      doIt,
      paint,
      setValues,
      reloadKeys,
    };

    return {
      ...keyboard,
      plans,
      targets,
      doIt,
      paint,
      setValues,
      reloadKeys,
      undo: () => undo!(),
    };
  }

  it("sees the changes of the file", () => {
    const { plans } = setup();

    expect(plans.keys!.changedKeys).toBe(2);
    expect(plans.keys!.renames).toHaveLength(1);
    expect(plans.lights!.changedColors).toBe(4);
    expect(plans.screens!.changes).toHaveLength(2);
    for (const section of ["keys", "lights", "screens"] as const) {
      expect(hasChanges(plans, section)).toBe(true);
    }
  });

  it("applies the three parts and says how much of each", async () => {
    const { conn, plans, targets, doIt, paint, setValues, reloadKeys } = setup();

    const report = await applyBackup(plans, chosenAll, targets);

    expect(report).toEqual({ applied: { keys: 2, lights: 4, screens: 2 } });
    // The keys went through the undo of the app, as one step
    expect(doIt).toHaveBeenCalledTimes(1);
    const keymap = await keymapOf(conn);
    expect(keymap.layers[0].name).toBe("BASE");
    expect(keymap.layers[1].bindings[0].behaviorId).toBe(transparent());
    expect(reloadKeys).toHaveBeenCalledTimes(1);
    // One call per layer of colors
    expect(paint.mock.calls).toEqual([
      [0, [{ slot: 0, rgb: 0x111111 }, { slot: 1, rgb: 0x222222 }]],
      [1, [{ slot: 0, rgb: 0x333333 }, { slot: 1, rgb: 0x444444 }]],
    ]);
    // The settings in one call, so they are one step of the history
    expect(setValues.mock.calls).toEqual([[[[1, 10], [3, 2]]]]);
  });

  it("applies only the parts that were chosen", async () => {
    const { conn, plans, targets, doIt, paint, setValues } = setup();

    const report = await applyBackup(
      plans,
      { keys: false, lights: true, screens: false },
      targets,
    );

    expect(report).toEqual({ applied: { lights: 4 } });
    expect(doIt).not.toHaveBeenCalled();
    expect(paint).toHaveBeenCalledTimes(2);
    expect(setValues).not.toHaveBeenCalled();
    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("does not touch a part that has nothing to change", async () => {
    const { plans, targets, doIt, paint, setValues } = setup();
    const same: Plans = {
      keys: planKeys(collectKeys(corneKeymap, corneBehaviors)!, corneKeymap, corneBehaviors),
      lights: { ...plans.lights!, layers: [], changedColors: 0 },
      screens: { ...plans.screens!, changes: [] },
    };

    const report = await applyBackup(same, chosenAll, targets);

    expect(report).toEqual({ applied: {} });
    expect(doIt).not.toHaveBeenCalled();
    expect(paint).not.toHaveBeenCalled();
    expect(setValues).not.toHaveBeenCalled();
  });

  it("applies the parts the file has plans for, and no others", async () => {
    const { plans, targets, doIt, paint, setValues } = setup();

    const report = await applyBackup({ screens: plans.screens }, chosenAll, targets);

    expect(report).toEqual({ applied: { screens: 2 } });
    expect(doIt).not.toHaveBeenCalled();
    expect(paint).not.toHaveBeenCalled();
    expect(setValues).toHaveBeenCalledTimes(1);
  });

  it("takes the keys back with the undo it gave to the app", async () => {
    const { conn, plans, targets, reloadKeys, undo } = setup();
    await applyBackup(plans, { keys: true, lights: false, screens: false }, targets);
    expect(await keymapOf(conn)).not.toEqual(corneKeymap);
    expect(reloadKeys).toHaveBeenCalledTimes(1);

    await undo();

    expect(await keymapOf(conn)).toEqual(corneKeymap);
    expect(reloadKeys).toHaveBeenCalledTimes(2);
  });

  it("says so when the keyboard refuses the keys, and applies nothing after", async () => {
    const { conn, plans, targets, paint, setValues } = setup();
    // The keyboard has no behavior with this number
    plans.keys!.layers[0].edits[0].binding = { behaviorId: 9999, param1: 0, param2: 0 };
    // The undo runner of the app lets the error through
    const failing: ApplyTargets = {
      ...targets,
      doIt: async (callback) => {
        await callback();
      },
    };

    const report = await applyBackup(plans, chosenAll, failing);

    expect(report.applied).toEqual({});
    expect(report.failed?.section).toBe("keys");
    expect(report.failed?.message).toMatch(/Nothing was changed/);
    expect(paint).not.toHaveBeenCalled();
    expect(setValues).not.toHaveBeenCalled();
    expect(await keymapOf(conn)).toEqual(corneKeymap);
  });

  it("says so when a layer of colors fails, and keeps what was applied", async () => {
    const { plans, targets, paint, setValues } = setup();
    paint.mockImplementation(async (layerId) => {
      if (layerId === 1) {
        throw new Error("the keyboard is busy");
      }
    });

    const report = await applyBackup(plans, chosenAll, targets);

    expect(report).toEqual({
      applied: { keys: 2, lights: 2 },
      failed: { section: "lights", message: "the keyboard is busy" },
    });
    expect(setValues).not.toHaveBeenCalled();
  });

  it("uses the plans it was given: a file applied twice is the second time a no-op", async () => {
    const { conn, plans, targets } = setup();
    await applyBackup(plans, { keys: true, lights: false, screens: false }, targets);

    const again = planKeys(
      collectKeys(await keymapOf(conn), corneBehaviors)!,
      await keymapOf(conn),
      corneBehaviors,
    );

    expect(keyOps(again)).toEqual([]);
  });
});
