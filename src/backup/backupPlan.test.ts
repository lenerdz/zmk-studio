/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import type { Keymap } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { DEMO_DISPLAY_SETTINGS } from "../display/demo/demoDisplay";
import { corneBehaviors, corneKeymap } from "../keyboard/corne.mock";
import { ANIMATION_KINDS, WIDGETS } from "../oled/oledCatalog";
import { OLED_ID } from "../oled/oledIds";
import type { BackupKeys, BackupLights, BackupScreens } from "./backupFile";
import {
  collectKeys,
  collectLights,
  collectScreens,
  colorText,
  colorValue,
  describeSettingValue,
  keyOps,
  labelOfSetting,
  planKeys,
  planLights,
  planScreens,
  type LightsSource,
} from "./backupPlan";

const keymap = (): Keymap => structuredClone(corneKeymap);

/** The keys of the keyboard as a file, to change a copy of it. */
const keysFile = (): BackupKeys => collectKeys(keymap(), corneBehaviors)!;

const behaviorId = (name: string): number =>
  Object.values(corneBehaviors).find((b) => b.displayName === name)!.id;

describe("collectKeys", () => {
  it("names the behavior of every key and keeps the layers in order", () => {
    const file = keysFile();

    expect(file.layers.map((l) => l.name)).toEqual(
      corneKeymap.layers.map((l) => l.name),
    );
    expect(file.layers[0].bindings).toHaveLength(
      corneKeymap.layers[0].bindings.length,
    );
    const first = corneKeymap.layers[0].bindings[0];
    expect(file.layers[0].bindings[0]).toEqual({
      behavior: corneBehaviors[first.behaviorId].displayName,
      param1: first.param1,
      param2: first.param2,
    });
  });

  it("is null while a behavior of a key is not known", () => {
    const some = { ...corneBehaviors };
    delete some[corneKeymap.layers[0].bindings[0].behaviorId];

    expect(collectKeys(keymap(), some)).toBeNull();
    expect(collectKeys(keymap(), {})).toBeNull();
  });
});

describe("planKeys", () => {
  it("has nothing to change for the keys the keyboard has", () => {
    const plan = planKeys(keysFile(), keymap(), corneBehaviors);

    expect(plan).toEqual({
      layers: [],
      renames: [],
      changedKeys: 0,
      layersCompared: corneKeymap.layers.length,
      problems: [],
    });
    expect(keyOps(plan)).toEqual([]);
  });

  it("lists a key that differs with what it gets and what it had", () => {
    const file = keysFile();
    file.layers[1].bindings[3] = { behavior: "Transparent", param1: 0, param2: 0 };

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.changedKeys).toBe(1);
    expect(plan.layers).toEqual([
      {
        layerId: corneKeymap.layers[1].id,
        layerName: corneKeymap.layers[1].name,
        edits: [
          {
            keyPosition: 3,
            binding: { behaviorId: behaviorId("Transparent"), param1: 0, param2: 0 },
            previous: corneKeymap.layers[1].bindings[3],
          },
        ],
      },
    ]);
  });

  it("sees a different parameter of the same behavior", () => {
    const file = keysFile();
    const key = file.layers[0].bindings[0];
    file.layers[0].bindings[0] = { ...key, param1: key.param1 + 1 };

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.changedKeys).toBe(1);
    expect(plan.layers[0].edits[0].binding.param1).toBe(key.param1 + 1);
  });

  it("lists the layers that are named differently", () => {
    const file = keysFile();
    file.layers[0].name = "BASE";

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.renames).toEqual([
      { layerId: corneKeymap.layers[0].id, from: "QWERTY", to: "BASE" },
    ]);
    expect(plan.changedKeys).toBe(0);
  });

  it("cuts a name to what the keyboard takes", () => {
    const file = keysFile();
    file.layers[0].name = "A very long name";
    const short = { ...keymap(), maxLayerNameLength: 5 };

    const plan = planKeys(file, short, corneBehaviors);

    expect(plan.renames[0].to).toBe("A ver");
  });

  it("leaves a key alone when the keyboard has no behavior of that name", () => {
    const file = keysFile();
    file.layers[0].bindings[0] = { behavior: "Teleport", param1: 1, param2: 2 };
    file.layers[2].bindings[4] = { behavior: "Teleport", param1: 3, param2: 4 };

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.changedKeys).toBe(0);
    expect(plan.problems).toEqual([
      'The keyboard has no behavior named "Teleport" (2 keys in the file): those keys stay as they are.',
    ]);
  });

  it("leaves a layer alone when it has another number of keys", () => {
    const file = keysFile();
    file.layers[2].bindings.pop();
    file.layers[2].bindings[0] = { behavior: "Transparent", param1: 0, param2: 0 };

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.layers).toEqual([]);
    expect(plan.layersCompared).toBe(corneKeymap.layers.length - 1);
    expect(plan.problems).toHaveLength(1);
    expect(plan.problems[0]).toMatch(/RAISE: the file has \d+ keys and the keyboard has \d+/);
  });

  it("says when the file has more layers than the keyboard", () => {
    const file = keysFile();
    file.layers.push({ name: "EXTRA", bindings: file.layers[0].bindings });
    file.layers.push({ name: "EXTRA2", bindings: file.layers[0].bindings });

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.changedKeys).toBe(0);
    expect(plan.problems).toEqual([
      "The file has 10 layers and the keyboard has 8: the last 2 layers of the file are left out. Add layers in the Keys tab to bring them.",
    ]);
  });

  it("says when the file has fewer layers than the keyboard", () => {
    const file = keysFile();
    file.layers.length = 7;

    const plan = planKeys(file, keymap(), corneBehaviors);

    expect(plan.layersCompared).toBe(7);
    expect(plan.problems).toEqual([
      "The file has 7 layers and the keyboard has 8: the last layer of the keyboard stays as it is.",
    ]);

    file.layers.length = 5;
    expect(planKeys(file, keymap(), corneBehaviors).problems).toEqual([
      "The file has 5 layers and the keyboard has 8: the last 3 layers of the keyboard stay as they are.",
    ]);
  });

  it("says one layer more in the singular", () => {
    const file = keysFile();
    file.layers.push({ name: "EXTRA", bindings: file.layers[0].bindings });

    expect(planKeys(file, keymap(), corneBehaviors).problems).toEqual([
      "The file has 9 layers and the keyboard has 8: the last layer of the file is left out. Add a layer in the Keys tab to bring it.",
    ]);
  });

  it("matches the layers by their place, whatever their ids", () => {
    const other = keymap();
    other.layers.forEach((l, i) => (l.id = 100 + i));
    const file = keysFile();
    file.layers[0].bindings[2] = { behavior: "Transparent", param1: 0, param2: 0 };

    const plan = planKeys(file, other, corneBehaviors);

    expect(plan.layers.map((l) => l.layerId)).toEqual([100]);
  });
});

describe("keyOps", () => {
  it("writes the names first, then the keys, each with what undoes it", () => {
    const file = keysFile();
    file.layers[0].name = "BASE";
    file.layers[1].bindings[0] = { behavior: "Transparent", param1: 0, param2: 0 };
    file.layers[3].bindings[5] = { behavior: "None", param1: 0, param2: 0 };

    const ops = keyOps(planKeys(file, keymap(), corneBehaviors));

    expect(ops.map((op) => op.kind)).toEqual(["name", "binding", "binding"]);
    expect(ops[0]).toEqual({
      kind: "name",
      layerId: corneKeymap.layers[0].id,
      to: "BASE",
      from: "QWERTY",
    });
    expect(ops[1]).toMatchObject({
      kind: "binding",
      layerId: corneKeymap.layers[1].id,
      keyPosition: 0,
      from: corneKeymap.layers[1].bindings[0],
    });
    expect(ops[2]).toMatchObject({
      layerId: corneKeymap.layers[3].id,
      keyPosition: 5,
    });
  });
});

describe("the colors", () => {
  const source = (): LightsSource => ({
    slotCount: 4,
    layerIds: [0, 1, 4],
    maps: {
      0: [0xff0000, 0x00ff00, 0x0000ff, 0x000000, 0x111111, 0x222222],
      1: [0x010101, 0x020202, 0x030303, 0x040404, 0, 0],
      4: [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0, 0],
    },
  });
  const names = new Map([
    [0, "QWERTY"],
    [1, "FN1"],
    [4, "SYS"],
  ]);

  it("writes a color as #rrggbb and reads it back", () => {
    expect(colorText(0xff00aa)).toBe("#ff00aa");
    expect(colorText(0x0000ff)).toBe("#0000ff");
    expect(colorText(0)).toBe("#000000");
    expect(colorValue("#ff00aa")).toBe(0xff00aa);
    expect(colorValue(colorText(0x123456))).toBe(0x123456);
  });

  describe("collectLights", () => {
    it("keeps the entries each map uses, with the name of the layer", () => {
      expect(collectLights(source(), names)).toEqual({
        slotCount: 4,
        layers: [
          { id: 0, name: "QWERTY", colors: ["#ff0000", "#00ff00", "#0000ff", "#000000"] },
          { id: 1, name: "FN1", colors: ["#010101", "#020202", "#030303", "#040404"] },
          { id: 4, name: "SYS", colors: ["#ffffff", "#ffffff", "#ffffff", "#ffffff"] },
        ],
      });
    });

    it("is null for a keyboard without maps", () => {
      expect(collectLights({ slotCount: 0, layerIds: [], maps: {} }, names)).toBeNull();
      expect(collectLights({ ...source(), layerIds: [] }, names)).toBeNull();
    });
  });

  describe("planLights", () => {
    const fileOf = (change?: (file: BackupLights) => void): BackupLights => {
      const file = collectLights(source(), names)!;
      change?.(file);
      return file;
    };

    it("has nothing to change for the colors the keyboard has", () => {
      expect(planLights(fileOf(), source(), names)).toEqual({
        layers: [],
        changedColors: 0,
        layersCompared: 3,
        problems: [],
      });
    });

    it("lists the colors that differ, with the ones they replace", () => {
      const file = fileOf((f) => {
        f.layers[1].colors[0] = "#aabbcc";
        f.layers[1].colors[3] = "#000000";
        f.layers[2].colors[2] = "#123456";
      });

      const plan = planLights(file, source(), names);

      expect(plan.changedColors).toBe(3);
      expect(plan.layers).toEqual([
        {
          layerId: 1,
          layerName: "FN1",
          entries: [
            { slot: 0, rgb: 0xaabbcc },
            { slot: 3, rgb: 0x000000 },
          ],
          previous: [
            { slot: 0, rgb: 0x010101 },
            { slot: 3, rgb: 0x040404 },
          ],
        },
        {
          layerId: 4,
          layerName: "SYS",
          entries: [{ slot: 2, rgb: 0x123456 }],
          previous: [{ slot: 2, rgb: 0xffffff }],
        },
      ]);
    });

    it("applies nothing from a file made for another number of colors", () => {
      const file = fileOf((f) => {
        f.slotCount = 5;
        f.layers.forEach((l) => l.colors.push("#000000"));
      });

      const plan = planLights(file, source(), names);

      expect(plan.layers).toEqual([]);
      expect(plan.changedColors).toBe(0);
      expect(plan.problems).toEqual([
        "The file has 5 colors per map and the keyboard uses 4: it was made for another LED layout, so no color is applied.",
      ]);
    });

    it("leaves out a layer the keyboard has no map for", () => {
      const file = fileOf((f) => {
        f.layers.push({ id: 9, name: "GHOST", colors: ["#111111", "#111111", "#111111", "#111111"] });
      });

      const plan = planLights(file, source(), names);

      expect(plan.layersCompared).toBe(3);
      expect(plan.problems).toEqual([
        "The keyboard has no color map for the layer GHOST (id 9) of the file: it is left out.",
      ]);
    });

    it("names a layer by its id when it has no name", () => {
      const file = fileOf((f) => {
        f.layers[0].name = "";
        f.layers.push({ id: 7, name: "", colors: ["#111111", "#111111", "#111111", "#111111"] });
      });

      const plan = planLights(file, source(), names);

      expect(plan.problems[0]).toMatch(/layer 7 \(id 7\)/);
    });
  });
});

describe("the settings of the screens", () => {
  const settings = () => DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s }));

  describe("labelOfSetting", () => {
    it("is the name of the Display tab for ids 1 to 15", () => {
      expect(labelOfSetting(1)).toBe("Left screen contrast");
      expect(labelOfSetting(5)).toBe("Light toast on the right screen");
      expect(labelOfSetting(7)).toBe("Turn the key lights off");
      expect(labelOfSetting(11)).toBe("Pixel shift");
    });

    it("says which part a time or a distance belongs to, because the list mixes the groups", () => {
      expect(labelOfSetting(4)).toBe("Screen off: time without activity");
      expect(labelOfSetting(8)).toBe("Key lights off: time without activity");
      expect(labelOfSetting(10)).toBe("Underglow off: time without activity");
      expect(labelOfSetting(12)).toBe("Pixel shift: time between two moves");
      expect(labelOfSetting(13)).toBe("Pixel shift: distance");
      expect(labelOfSetting(15)).toBe("Dimming: contrast of a dimmed screen");
    });

    it("gives every setting of the Display tab a label of its own", () => {
      const labels = Array.from({ length: 15 }, (_, i) => labelOfSetting(i + 1));

      expect(new Set(labels).size).toBe(15);
    });

    it("is the widget and the part of it for the OLED ids", () => {
      const layer = WIDGETS.find((w) => w.key === "l_layer")!.label;
      const picture = WIDGETS.find((w) => w.key === "r_anim")!.label;

      expect(labelOfSetting(OLED_ID.L_LAYER_SHOW)).toBe(`${layer}: shown`);
      expect(labelOfSetting(OLED_ID.L_LAYER_X)).toBe(`${layer}: x`);
      expect(labelOfSetting(OLED_ID.L_LAYER_Y)).toBe(`${layer}: y`);
      expect(labelOfSetting(OLED_ID.R_ANIM_KIND)).toBe(`${picture}: picture`);
      expect(labelOfSetting(OLED_ID.R_ANIM_ROT)).toBe(`${picture}: turn`);
      expect(labelOfSetting(OLED_ID.R_ANIM_CROP_WH)).toBe(
        `${picture}: size of the crop`,
      );
    });

    it("is Setting N for an id nobody knows", () => {
      expect(labelOfSetting(99)).toBe("Setting 99");
      expect(labelOfSetting(500)).toBe("Setting 500");
    });
  });

  describe("describeSettingValue", () => {
    it("writes a value the way the tabs do", () => {
      expect(describeSettingValue(5, 1)).toBe("On");
      expect(describeSettingValue(5, 0)).toBe("Off");
      expect(describeSettingValue(OLED_ID.L_LAYER_SHOW, 1)).toBe("Shown");
      expect(describeSettingValue(OLED_ID.L_LAYER_SHOW, 0)).toBe("Hidden");
      expect(describeSettingValue(OLED_ID.L_LAYER_X, 12)).toBe("12");
    });

    it("writes the name of a picture", () => {
      const kind = ANIMATION_KINDS[3];

      expect(describeSettingValue(OLED_ID.R_ANIM_KIND, kind.value)).toBe(kind.label);
      expect(describeSettingValue(OLED_ID.R_ANIM_KIND, 9999)).toBe("9999");
    });
  });

  describe("collectScreens", () => {
    it("keeps the id, a label and the value of every setting", () => {
      const file = collectScreens(settings())!;

      expect(file.settings).toHaveLength(DEMO_DISPLAY_SETTINGS.length);
      expect(file.settings[0]).toEqual({
        id: DEMO_DISPLAY_SETTINGS[0].id,
        label: labelOfSetting(DEMO_DISPLAY_SETTINGS[0].id),
        value: DEMO_DISPLAY_SETTINGS[0].value,
      });
    });

    it("is null for a keyboard without screen settings", () => {
      expect(collectScreens([])).toBeNull();
    });
  });

  describe("planScreens", () => {
    const fileOf = (change?: (file: BackupScreens) => void): BackupScreens => {
      const file = collectScreens(settings())!;
      change?.(file);
      return file;
    };
    const setting = (file: BackupScreens, id: number) =>
      file.settings.find((s) => s.id === id)!;

    it("has nothing to change for the settings the keyboard has", () => {
      expect(planScreens(fileOf(), settings())).toEqual({
        changes: [],
        compared: DEMO_DISPLAY_SETTINGS.length,
        problems: [],
      });
    });

    it("lists the settings that differ", () => {
      const file = fileOf((f) => {
        setting(f, 1).value = 10;
        setting(f, OLED_ID.L_LAYER_X).value = 7;
      });

      const plan = planScreens(file, settings());

      expect(plan.changes).toEqual([
        { id: 1, label: "Left screen contrast", from: 128, to: 10, adjusted: false },
        {
          id: OLED_ID.L_LAYER_X,
          label: labelOfSetting(OLED_ID.L_LAYER_X),
          from: DEMO_DISPLAY_SETTINGS.find((s) => s.id === OLED_ID.L_LAYER_X)!.value,
          to: 7,
          adjusted: false,
        },
      ]);
    });

    it("holds a value at the end of the range the keyboard gave, and says so", () => {
      const file = fileOf((f) => (setting(f, 1).value = 9999));

      const plan = planScreens(file, settings());

      expect(plan.changes).toEqual([
        { id: 1, label: "Left screen contrast", from: 128, to: 255, adjusted: true },
      ]);
    });

    it("has no change for a value that is held to the one the keyboard has", () => {
      const have = settings();
      have.find((s) => s.id === 1)!.value = 255;
      const file = fileOf((f) => (setting(f, 1).value = 9999));

      expect(planScreens(file, have).changes).toEqual([]);
    });

    it("leaves out a setting the keyboard does not have", () => {
      const file = fileOf((f) => {
        f.settings.push({ id: 300, label: "Something new", value: 1 });
        f.settings.push({ id: 301, label: "", value: 1 });
      });

      const plan = planScreens(file, settings());

      expect(plan.compared).toBe(DEMO_DISPLAY_SETTINGS.length);
      expect(plan.problems).toEqual([
        "The keyboard has no settings Something new, Setting 301: left out.",
      ]);
    });

    it("leaves out a picture that was retired, and says so: the keyboard would refuse it", () => {
      // A file saved before the still images were taken out: kind 52 was the castle
      const file = fileOf((f) => (setting(f, OLED_ID.R_ANIM_KIND).value = 52));

      const plan = planScreens(file, settings());

      expect(plan.changes).toEqual([]);
      expect(plan.compared).toBe(DEMO_DISPLAY_SETTINGS.length - 1);
      expect(plan.problems).toEqual([
        "The picture of the file (kind 52) was taken out of the firmware: the keyboard keeps the one it has.",
      ]);
    });

    it("still applies the rest of a file that has a retired picture", () => {
      const file = fileOf((f) => {
        setting(f, OLED_ID.R_ANIM_KIND).value = 5;
        setting(f, 1).value = 10;
      });

      const plan = planScreens(file, settings());

      expect(plan.changes.map((c) => c.id)).toEqual([1]);
    });

    it("keeps a picture that is still there", () => {
      // Kind 18 is the mountains, one of the six still images that were kept
      const file = fileOf((f) => (setting(f, OLED_ID.R_ANIM_KIND).value = 18));

      const plan = planScreens(file, settings());

      expect(plan.changes.map((c) => c.id)).toEqual([OLED_ID.R_ANIM_KIND]);
      expect(plan.problems).toEqual([]);
    });

    it("says one setting in the singular, and cuts a long list", () => {
      const one = fileOf((f) => f.settings.push({ id: 300, label: "Only", value: 1 }));
      expect(planScreens(one, settings()).problems).toEqual([
        "The keyboard has no setting Only: left out.",
      ]);

      const many = fileOf((f) => {
        for (let id = 300; id < 308; id++) {
          f.settings.push({ id, label: `S${id}`, value: 1 });
        }
      });
      expect(planScreens(many, settings()).problems).toEqual([
        "The keyboard has no settings S300, S301, S302, S303, S304, S305 and 2 more: left out.",
      ]);
    });
  });
});
