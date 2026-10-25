/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from "./backupFile";

const NOW = new Date("2026-10-25T15:30:45.000Z");

const SAMPLE: Backup = buildBackup({
  keyboard: "Corne",
  now: NOW,
  keys: {
    layers: [
      {
        name: "QWERTY",
        bindings: [
          { behavior: "Key Press", param1: 458756, param2: 0 },
          { behavior: "Momentary Layer", param1: 1, param2: 0 },
        ],
      },
      {
        name: "",
        bindings: [{ behavior: "Transparent", param1: 0, param2: 0 }],
      },
    ],
  },
  lights: {
    slotCount: 3,
    layers: [
      { id: 0, name: "QWERTY", colors: ["#ff0000", "#00ff00", "#0000ff"] },
      { id: 2, name: "", colors: ["#000000", "#ffffff", "#123abc"] },
    ],
  },
  screens: {
    settings: [
      { id: 1, label: "Left screen contrast", value: 128 },
      { id: 20, label: "Animation: time of a cycle", value: -5 },
    ],
  },
});

describe("buildBackup", () => {
  it("has the format, the version, the app, the date and the keyboard", () => {
    expect(SAMPLE).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      app: APP_NAME,
      createdAt: "2026-10-25T15:30:45.000Z",
      keyboard: "Corne",
    });
  });

  it("has only the parts it was given", () => {
    const keysOnly = buildBackup({
      keyboard: "",
      now: NOW,
      keys: { layers: [] },
    });

    expect(keysOnly).toHaveProperty("keys");
    expect(keysOnly).not.toHaveProperty("lights");
    expect(keysOnly).not.toHaveProperty("screens");
  });
});

describe("serializeBackup", () => {
  it("reads back as the same backup", () => {
    const parsed = parseBackup(serializeBackup(SAMPLE));

    expect(parsed).toEqual({ ok: true, backup: SAMPLE });
  });

  it("is valid JSON that ends with a new line", () => {
    const text = serializeBackup(SAMPLE);

    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text)).toEqual(SAMPLE);
  });

  it("keeps a key and a list of colors on one line each", () => {
    const text = serializeBackup(SAMPLE);

    expect(text).toContain(
      '{ "behavior": "Key Press", "param1": 458756, "param2": 0 }',
    );
    expect(text).toContain('"colors": ["#ff0000", "#00ff00", "#0000ff"]');
    // 2 spaces of indentation, like the rest.
    expect(text).toContain('\n  "keyboard": "Corne"');
  });

  it("keeps a behavior name with quotes and backslashes", () => {
    const tricky = buildBackup({
      keyboard: "",
      now: NOW,
      keys: {
        layers: [
          {
            name: 'a "layer"',
            bindings: [{ behavior: 'Say "hi" \\ bye', param1: 1, param2: 2 }],
          },
        ],
      },
    });

    expect(parseBackup(serializeBackup(tricky))).toEqual({
      ok: true,
      backup: tricky,
    });
  });
});

describe("backupFileName", () => {
  it("is the keyboard, the word backup, the day and the time (UTC)", () => {
    expect(backupFileName("Corne", NOW)).toBe("corne-backup-2026-10-25-1530.json");
  });

  it("writes a name that is safe for a file", () => {
    expect(backupFileName("Corne  (L)/R:*", NOW)).toBe(
      "corne-l-r-backup-2026-10-25-1530.json",
    );
    expect(backupFileName("Teclado Ação", NOW)).toBe(
      "teclado-acao-backup-2026-10-25-1530.json",
    );
  });

  it("has a name for a keyboard that did not say its own", () => {
    expect(backupFileName("", NOW)).toBe("keyboard-backup-2026-10-25-1530.json");
    expect(backupFileName("***", NOW)).toBe("keyboard-backup-2026-10-25-1530.json");
  });
});

describe("parseBackup", () => {
  const withChange = (change: (copy: Record<string, any>) => void): string => {
    const copy = JSON.parse(JSON.stringify(SAMPLE));
    change(copy);
    return JSON.stringify(copy);
  };

  const error = (text: string): string => {
    const result = parseBackup(text);
    if (result.ok) {
      throw new Error("expected an error");
    }
    return result.error;
  };

  it("refuses what is not JSON, and what is not a backup", () => {
    expect(error("{ nope")).toBe("The file is not valid JSON.");
    expect(error("[]")).toBe("This is not a backup made by this app.");
    expect(error("null")).toBe("This is not a backup made by this app.");
    expect(error('{"format":"something-else","version":1}')).toBe(
      "This is not a backup made by this app.",
    );
  });

  it("refuses a file without a valid version, and one from a newer app", () => {
    expect(error(withChange((c) => delete c.version))).toBe(
      "The file has no valid version.",
    );
    expect(error(withChange((c) => (c.version = 0)))).toBe(
      "The file has no valid version.",
    );
    expect(error(withChange((c) => (c.version = "1")))).toBe(
      "The file has no valid version.",
    );
    expect(error(withChange((c) => (c.version = BACKUP_VERSION + 1)))).toMatch(
      /newer version of the app/,
    );
  });

  it("refuses a file with nothing in it", () => {
    expect(
      error(
        withChange((c) => {
          delete c.keys;
          delete c.lights;
          delete c.screens;
        }),
      ),
    ).toMatch(/nothing in it/);
  });

  it("takes a file with only one of the parts", () => {
    const result = parseBackup(
      withChange((c) => {
        delete c.keys;
        delete c.lights;
      }),
    );

    expect(result.ok && result.backup.screens?.settings).toHaveLength(2);
    expect(result.ok && result.backup.keys).toBeUndefined();
  });

  it("takes a file that lacks the app, the date and the keyboard", () => {
    const result = parseBackup(
      withChange((c) => {
        delete c.app;
        delete c.createdAt;
        delete c.keyboard;
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      backup: { app: "", createdAt: "", keyboard: "" },
    });
  });

  it("ignores what it does not know", () => {
    const result = parseBackup(
      withChange((c) => {
        c.somethingNew = { a: 1 };
        c.keys.layers[0].extra = true;
      }),
    );

    expect(result.ok && result.backup).toEqual(SAMPLE);
  });

  describe("the keys", () => {
    it("must be a list of layers with a name and keys", () => {
      expect(error(withChange((c) => (c.keys = {})))).toMatch(/list of layers/);
      expect(error(withChange((c) => (c.keys = { layers: [] })))).toMatch(
        /from 1 to 64 layers/,
      );
      expect(
        error(withChange((c) => delete c.keys.layers[1].name)),
      ).toMatch(/keys\.layers\[1\] must have a name/);
      expect(
        error(withChange((c) => (c.keys.layers[0].bindings = []))),
      ).toMatch(/keys\.layers\[0\] must have from 1 to 512 keys/);
    });

    it("must name the behavior and give whole parameters in 32 bits", () => {
      expect(
        error(withChange((c) => (c.keys.layers[0].bindings[1].behavior = 7))),
      ).toMatch(/bindings\[1\] must name a behavior/);
      for (const bad of [-1, 1.5, 4294967296, "3", null]) {
        expect(
          error(withChange((c) => (c.keys.layers[0].bindings[0].param1 = bad))),
        ).toMatch(/bindings\[0\] must have param1 and param2/);
      }
      expect(
        parseBackup(
          withChange((c) => (c.keys.layers[0].bindings[0].param2 = 4294967295)),
        ).ok,
      ).toBe(true);
    });
  });

  describe("the lights", () => {
    it("must say how many colors a map has, and have that many", () => {
      expect(error(withChange((c) => (c.lights.slotCount = 0)))).toMatch(
        /lights must have slotCount/,
      );
      expect(error(withChange((c) => (c.lights.slotCount = 2)))).toMatch(
        /lights\.layers\[0\]\.colors must be 2 colors written as #rrggbb/,
      );
      expect(error(withChange((c) => (c.lights.layers = [])))).toMatch(
        /from 1 to 64 layers/,
      );
    });

    it("must have colors written as #rrggbb", () => {
      for (const bad of ["ff0000", "#ff00", "#gg0000", "#ff00000", 255, null]) {
        expect(
          error(withChange((c) => (c.lights.layers[1].colors[0] = bad))),
        ).toMatch(/lights\.layers\[1\]\.colors/);
      }
    });

    it("takes capitals and writes them in small letters", () => {
      const result = parseBackup(
        withChange((c) => (c.lights.layers[0].colors[0] = "#FF00AA")),
      );

      expect(result.ok && result.backup.lights?.layers[0].colors[0]).toBe(
        "#ff00aa",
      );
    });

    it("must have a layer id once", () => {
      expect(
        error(withChange((c) => (c.lights.layers[1].id = 0))),
      ).toMatch(/repeats the layer id 0/);
      expect(
        error(withChange((c) => delete c.lights.layers[0].id)),
      ).toMatch(/must have an id and a name/);
    });
  });

  describe("the screens", () => {
    it("must be a list of settings with an id and a value", () => {
      expect(error(withChange((c) => (c.screens = {})))).toMatch(
        /list of settings/,
      );
      expect(error(withChange((c) => (c.screens.settings = [])))).toMatch(
        /from 1 to 1024 settings/,
      );
      for (const bad of [1.5, "5", null, 2147483648]) {
        expect(
          error(withChange((c) => (c.screens.settings[0].value = bad))),
        ).toMatch(/screens\.settings\[0\] must have an id and a value/);
      }
      expect(
        error(withChange((c) => (c.screens.settings[0].id = -1))),
      ).toMatch(/must have an id and a value/);
    });

    it("must have a setting once, and a label is not needed", () => {
      expect(
        error(withChange((c) => (c.screens.settings[1].id = 1))),
      ).toMatch(/repeats the setting 1/);

      const result = parseBackup(
        withChange((c) => delete c.screens.settings[0].label),
      );
      expect(result.ok && result.backup.screens?.settings[0].label).toBe("");
    });

    it("takes a negative value", () => {
      const result = parseBackup(serializeBackup(SAMPLE));

      expect(result.ok && result.backup.screens?.settings[1].value).toBe(-5);
    });
  });
});
