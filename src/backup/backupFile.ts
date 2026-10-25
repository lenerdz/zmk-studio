/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The file the Files tab saves and opens: everything the app edits in one JSON
 * file (the keys, the colors of the lights and the settings of the screens),
 * and the checks a file must pass before the app trusts it. The file is plain
 * text on purpose, so a person can read it, compare two of them and keep them in
 * a repository.
 *
 * Nothing here talks to the keyboard: backupPlan.ts turns what the keyboard has
 * into a file and a file into a list of changes, and applyKeys.ts writes keys.
 */

export const BACKUP_FORMAT = "zmk-studio-backup";

/**
 * The version of the format. A file with a higher number than this one comes from
 * a newer app and is refused; the versions below are read as they are.
 */
export const BACKUP_VERSION = 1;

/** A key: the name of its behavior (not its number, which changes between firmwares) and parameters. */
export interface BackupBinding {
  behavior: string;
  param1: number;
  param2: number;
}

export interface BackupLayer {
  name: string;
  bindings: BackupBinding[];
}

/** The layers in the order of the keymap. */
export interface BackupKeys {
  layers: BackupLayer[];
}

export interface BackupLightLayer {
  /** The id of the layer in the keyboard that made the file. */
  id: number;
  /** Its name then, to read the file. */
  name: string;
  /** One "#rrggbb" per entry of the map, `slotCount` of them. */
  colors: string[];
}

export interface BackupLights {
  slotCount: number;
  layers: BackupLightLayer[];
}

export interface BackupSetting {
  id: number;
  /** What the setting is, to read the file; the app ignores it. */
  label: string;
  value: number;
}

export interface BackupScreens {
  settings: BackupSetting[];
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** The app that made the file, to read the file. */
  app: string;
  /** When it was made (ISO 8601). */
  createdAt: string;
  /** The name the keyboard gave itself then. */
  keyboard: string;
  keys?: BackupKeys;
  lights?: BackupLights;
  screens?: BackupScreens;
}

export const APP_NAME = "lenerdz/zmk-studio";

/** What goes into a file: only the parts that were chosen. */
export interface BackupInput {
  keyboard: string;
  now: Date;
  keys?: BackupKeys;
  lights?: BackupLights;
  screens?: BackupScreens;
}

export function buildBackup(input: BackupInput): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: APP_NAME,
    createdAt: input.now.toISOString(),
    keyboard: input.keyboard,
    ...(input.keys ? { keys: input.keys } : {}),
    ...(input.lights ? { lights: input.lights } : {}),
    ...(input.screens ? { screens: input.screens } : {}),
  };
}

// A key and a list of colors on one line each keep the file short enough to read:
// 8 layers of 42 keys are 330 lines instead of 2000.
const KEY_OBJECT =
  /\{\s+"behavior": ("(?:[^"\\]|\\.)*"),\s+"param1": (\d+),\s+"param2": (\d+)\s+\}/g;
const COLOR_LIST = /\[\s+("#[0-9a-f]{6}"(?:,\s+"#[0-9a-f]{6}")*)\s+\]/g;

/** The text of the file: JSON with two spaces, a key or a list of colors per line. */
export function serializeBackup(backup: Backup): string {
  return (
    JSON.stringify(backup, null, 2)
      .replace(
        KEY_OBJECT,
        (_all, behavior: string, p1: string, p2: string) =>
          `{ "behavior": ${behavior}, "param1": ${p1}, "param2": ${p2} }`,
      )
      .replace(COLOR_LIST, (_all, list: string) =>
        `[${list.replace(/,\s+/g, ", ")}]`,
      ) + "\n"
  );
}

/** The name of the file to save: "corne-backup-2026-10-25-1530.json" (UTC). */
export function backupFileName(keyboard: string, now: Date): string {
  const slug =
    keyboard
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "keyboard";
  const iso = now.toISOString();

  return `${slug}-backup-${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.json`;
}

export type ParseResult =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

const MAX_LAYERS = 64;
const MAX_KEYS = 512;
const MAX_SLOTS = 256;
const MAX_SETTINGS = 1024;
const UINT32_MAX = 4294967295;

type Json = unknown;

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInt(value: Json, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

const fail = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

function parseKeys(value: Json): BackupKeys | string {
  if (!isRecord(value) || !Array.isArray(value.layers)) {
    return "keys must have a list of layers.";
  }
  if (value.layers.length === 0 || value.layers.length > MAX_LAYERS) {
    return `keys must have from 1 to ${MAX_LAYERS} layers.`;
  }

  const layers: BackupLayer[] = [];
  for (const [i, layer] of value.layers.entries()) {
    const where = `keys.layers[${i}]`;
    if (!isRecord(layer) || typeof layer.name !== "string") {
      return `${where} must have a name.`;
    }
    if (
      !Array.isArray(layer.bindings) ||
      layer.bindings.length === 0 ||
      layer.bindings.length > MAX_KEYS
    ) {
      return `${where} must have from 1 to ${MAX_KEYS} keys.`;
    }

    const bindings: BackupBinding[] = [];
    for (const [k, binding] of layer.bindings.entries()) {
      if (!isRecord(binding) || typeof binding.behavior !== "string") {
        return `${where}.bindings[${k}] must name a behavior.`;
      }
      if (
        !isInt(binding.param1, 0, UINT32_MAX) ||
        !isInt(binding.param2, 0, UINT32_MAX)
      ) {
        return `${where}.bindings[${k}] must have param1 and param2 as whole numbers from 0 to ${UINT32_MAX}.`;
      }
      bindings.push({
        behavior: binding.behavior,
        param1: binding.param1,
        param2: binding.param2,
      });
    }

    layers.push({ name: layer.name, bindings });
  }

  return { layers };
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

function parseLights(value: Json): BackupLights | string {
  if (
    !isRecord(value) ||
    !isInt(value.slotCount, 1, MAX_SLOTS) ||
    !Array.isArray(value.layers)
  ) {
    return `lights must have slotCount (from 1 to ${MAX_SLOTS}) and a list of layers.`;
  }
  if (value.layers.length === 0 || value.layers.length > MAX_LAYERS) {
    return `lights must have from 1 to ${MAX_LAYERS} layers.`;
  }

  const slotCount = value.slotCount;
  const seen = new Set<number>();
  const layers: BackupLightLayer[] = [];
  for (const [i, layer] of value.layers.entries()) {
    const where = `lights.layers[${i}]`;
    if (
      !isRecord(layer) ||
      !isInt(layer.id, 0, UINT32_MAX) ||
      typeof layer.name !== "string"
    ) {
      return `${where} must have an id and a name.`;
    }
    if (seen.has(layer.id)) {
      return `${where} repeats the layer id ${layer.id}.`;
    }
    seen.add(layer.id);

    if (
      !Array.isArray(layer.colors) ||
      layer.colors.length !== slotCount ||
      !layer.colors.every((c) => typeof c === "string" && COLOR.test(c))
    ) {
      return `${where}.colors must be ${slotCount} colors written as #rrggbb.`;
    }

    layers.push({
      id: layer.id,
      name: layer.name,
      colors: (layer.colors as string[]).map((c) => c.toLowerCase()),
    });
  }

  return { slotCount, layers };
}

function parseScreens(value: Json): BackupScreens | string {
  if (!isRecord(value) || !Array.isArray(value.settings)) {
    return "screens must have a list of settings.";
  }
  if (value.settings.length === 0 || value.settings.length > MAX_SETTINGS) {
    return `screens must have from 1 to ${MAX_SETTINGS} settings.`;
  }

  const seen = new Set<number>();
  const settings: BackupSetting[] = [];
  for (const [i, setting] of value.settings.entries()) {
    const where = `screens.settings[${i}]`;
    if (
      !isRecord(setting) ||
      !isInt(setting.id, 0, 65535) ||
      !isInt(setting.value, -2147483648, 2147483647)
    ) {
      return `${where} must have an id and a value that are whole numbers.`;
    }
    if (seen.has(setting.id)) {
      return `${where} repeats the setting ${setting.id}.`;
    }
    seen.add(setting.id);

    settings.push({
      id: setting.id,
      label: typeof setting.label === "string" ? setting.label : "",
      value: setting.value,
    });
  }

  return { settings };
}

/**
 * Reads the text of a file. Anything that is not a backup of this app, or that
 * has a part the app cannot use, comes back as an error that says which part,
 * so a damaged file is never applied halfway.
 */
export function parseBackup(text: string): ParseResult {
  let data: Json;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("The file is not valid JSON.");
  }

  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    return fail("This is not a backup made by this app.");
  }

  if (!isInt(data.version, 1, Number.MAX_SAFE_INTEGER)) {
    return fail("The file has no valid version.");
  }
  if (data.version > BACKUP_VERSION) {
    return fail(
      `The file is from a newer version of the app (format ${data.version}; this one reads up to ${BACKUP_VERSION}).`,
    );
  }

  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: data.version,
    app: typeof data.app === "string" ? data.app : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    keyboard: typeof data.keyboard === "string" ? data.keyboard : "",
  };

  if (data.keys !== undefined) {
    const keys = parseKeys(data.keys);
    if (typeof keys === "string") {
      return fail(keys);
    }
    backup.keys = keys;
  }

  if (data.lights !== undefined) {
    const lights = parseLights(data.lights);
    if (typeof lights === "string") {
      return fail(lights);
    }
    backup.lights = lights;
  }

  if (data.screens !== undefined) {
    const screens = parseScreens(data.screens);
    if (typeof screens === "string") {
      return fail(screens);
    }
    backup.screens = screens;
  }

  if (!backup.keys && !backup.lights && !backup.screens) {
    return fail("The file has nothing in it: no keys, no lights and no screens.");
  }

  return { ok: true, backup };
}
