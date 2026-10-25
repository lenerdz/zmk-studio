/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Between the keyboard and the file, without React and without talking to the
 * keyboard: what goes into a file from what the keyboard has (collect...), and,
 * for a file that was opened, what applying it would change (plan...): the keys,
 * the colors and the settings that differ, and what cannot be applied and why.
 * The Files tab shows the plan before anything is written.
 */
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type {
  BehaviorBinding,
  Keymap,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  clampSetting,
  describeSetting,
  formatSettingValue,
} from "../display/displaySettings";
import type { DisplaySettingData } from "../display/displayProtocol";
import { bindingsEqual, type BindingEdit } from "../keyboard/keyDrag";
import { ANIMATION_KINDS, WIDGETS, type WidgetIds } from "../oled/oledCatalog";
import { isOledLayoutId } from "../oled/oledIds";
import type { LedEntry } from "../lights/ledProtocol";
import type {
  BackupKeys,
  BackupLights,
  BackupScreens,
} from "./backupFile";

export type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

// What a person reads, when the same text can be used in the plan and in the file.
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** The behaviors by the name the file uses; the first of two with the same name wins. */
function idsByName(behaviors: BehaviorMap): Map<string, number> {
  const ids = new Map<string, number>();
  for (const behavior of Object.values(behaviors).sort((a, b) => a.id - b.id)) {
    if (!ids.has(behavior.displayName)) {
      ids.set(behavior.displayName, behavior.id);
    }
  }
  return ids;
}

/**
 * The keys of the keyboard as the file keeps them. Null when a key uses a
 * behavior whose name is not known (the keyboard did not send them all yet): a
 * file made then would lose that key.
 */
export function collectKeys(
  keymap: Keymap,
  behaviors: BehaviorMap,
): BackupKeys | null {
  const layers = [];
  for (const layer of keymap.layers) {
    const bindings = [];
    for (const binding of layer.bindings) {
      const behavior = behaviors[binding.behaviorId];
      if (!behavior) {
        return null;
      }
      bindings.push({
        behavior: behavior.displayName,
        param1: binding.param1,
        param2: binding.param2,
      });
    }
    layers.push({ name: layer.name, bindings });
  }

  return { layers };
}

/** One layer of the keyboard that a file changes. */
export interface LayerKeyChanges {
  layerId: number;
  layerName: string;
  edits: BindingEdit[];
}

export interface LayerRename {
  layerId: number;
  /** The name it has. */
  from: string;
  /** The name it gets. */
  to: string;
}

export interface KeysPlan {
  layers: LayerKeyChanges[];
  renames: LayerRename[];
  /** How many keys change, in all the layers. */
  changedKeys: number;
  /** How many layers of the file were compared with a layer of the keyboard. */
  layersCompared: number;
  /** What cannot be applied, and why; the rest still can. */
  problems: string[];
}

/**
 * What applying the keys of a file would change. The layers are matched by their
 * place in the keymap (the first of the file with the first of the keyboard).
 * A layer with another number of keys, and a key whose behavior the keyboard does
 * not have, are left as they are and reported.
 */
export function planKeys(
  file: BackupKeys,
  keymap: Keymap,
  behaviors: BehaviorMap,
): KeysPlan {
  const ids = idsByName(behaviors);
  const problems: string[] = [];
  const layers: LayerKeyChanges[] = [];
  const renames: LayerRename[] = [];
  const unknown = new Map<string, number>();
  let changedKeys = 0;
  let layersCompared = 0;

  const extra = file.layers.length - keymap.layers.length;
  if (extra > 0) {
    problems.push(
      `The file has ${plural(file.layers.length, "layer")} and the keyboard has ${keymap.layers.length}: ${
        extra === 1
          ? "the last layer of the file is left out. Add a layer in the Keys tab to bring it."
          : `the last ${extra} layers of the file are left out. Add layers in the Keys tab to bring them.`
      }`,
    );
  } else if (extra < 0) {
    problems.push(
      `The file has ${plural(file.layers.length, "layer")} and the keyboard has ${keymap.layers.length}: ${
        extra === -1
          ? "the last layer of the keyboard stays as it is."
          : `the last ${-extra} layers of the keyboard stay as they are.`
      }`,
    );
  }

  const count = Math.min(file.layers.length, keymap.layers.length);
  for (let i = 0; i < count; i++) {
    const wanted = file.layers[i];
    const have = keymap.layers[i];
    const label = have.name || `layer ${i}`;

    if (wanted.bindings.length !== have.bindings.length) {
      problems.push(
        `Layer ${label}: the file has ${plural(wanted.bindings.length, "key")} and the keyboard has ${have.bindings.length}. The layer is left as it is.`,
      );
      continue;
    }

    layersCompared++;
    const edits: BindingEdit[] = [];
    wanted.bindings.forEach((entry, keyPosition) => {
      const behaviorId = ids.get(entry.behavior);
      if (behaviorId === undefined) {
        unknown.set(entry.behavior, (unknown.get(entry.behavior) ?? 0) + 1);
        return;
      }

      const binding: BehaviorBinding = {
        behaviorId,
        param1: entry.param1,
        param2: entry.param2,
      };
      const previous = have.bindings[keyPosition];
      if (!bindingsEqual(binding, previous)) {
        edits.push({ keyPosition, binding, previous });
      }
    });

    if (edits.length > 0) {
      layers.push({ layerId: have.id, layerName: have.name, edits });
      changedKeys += edits.length;
    }

    // A name the keyboard would refuse (too long) is cut to what it takes.
    const name =
      keymap.maxLayerNameLength > 0
        ? wanted.name.slice(0, keymap.maxLayerNameLength)
        : wanted.name;
    if (name !== have.name) {
      renames.push({ layerId: have.id, from: have.name, to: name });
    }
  }

  for (const [name, keys] of unknown) {
    problems.push(
      `The keyboard has no behavior named "${name}" (${plural(keys, "key")} in the file): those keys stay as they are.`,
    );
  }

  return { layers, renames, changedKeys, layersCompared, problems };
}

/** One write to the keyboard, with what undoes it. */
export type KeyOp =
  | {
      kind: "binding";
      layerId: number;
      keyPosition: number;
      to: BehaviorBinding;
      from: BehaviorBinding;
    }
  | { kind: "name"; layerId: number; to: string; from: string };

/** The writes of a plan, in order: the names of the layers, then the keys. */
export function keyOps(plan: KeysPlan): KeyOp[] {
  return [
    ...plan.renames.map(
      (r): KeyOp => ({ kind: "name", layerId: r.layerId, to: r.to, from: r.from }),
    ),
    ...plan.layers.flatMap((layer) =>
      layer.edits.map(
        (edit): KeyOp => ({
          kind: "binding",
          layerId: layer.layerId,
          keyPosition: edit.keyPosition,
          to: edit.binding,
          from: edit.previous,
        }),
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

/** The part of the light maps the file needs from the app. */
export interface LightsSource {
  slotCount: number;
  layerIds: readonly number[];
  maps: Readonly<Record<number, readonly number[]>>;
}

export function colorText(rgb: number): string {
  return `#${(rgb & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function colorValue(text: string): number {
  return parseInt(text.slice(1), 16);
}

/**
 * The colors of the keyboard as the file keeps them (the entries each map uses).
 * Null when the keyboard has no light maps.
 */
export function collectLights(
  lights: LightsSource,
  layerNames: ReadonlyMap<number, string>,
): BackupLights | null {
  if (lights.slotCount <= 0 || lights.layerIds.length === 0) {
    return null;
  }

  return {
    slotCount: lights.slotCount,
    layers: lights.layerIds.flatMap((id) => {
      const map = lights.maps[id];
      return map
        ? [
            {
              id,
              name: layerNames.get(id) ?? "",
              colors: map.slice(0, lights.slotCount).map(colorText),
            },
          ]
        : [];
    }),
  };
}

export interface LayerColorChanges {
  layerId: number;
  layerName: string;
  entries: LedEntry[];
  /** The colors the entries have now, to put back. */
  previous: LedEntry[];
}

export interface LightsPlan {
  layers: LayerColorChanges[];
  /** How many colors change, in all the maps. */
  changedColors: number;
  /** How many maps of the file were compared with a map of the keyboard. */
  layersCompared: number;
  problems: string[];
}

/**
 * What applying the colors of a file would change. The maps are matched by the
 * id of the layer (the keyboard keeps a map per layer id). A file with another
 * number of entries per map is for another LED layout and is not applied at all;
 * a layer the keyboard has no map for is left out.
 */
export function planLights(
  file: BackupLights,
  current: LightsSource,
  layerNames: ReadonlyMap<number, string>,
): LightsPlan {
  if (file.slotCount !== current.slotCount) {
    return {
      layers: [],
      changedColors: 0,
      layersCompared: 0,
      problems: [
        `The file has ${plural(file.slotCount, "color")} per map and the keyboard uses ${current.slotCount}: it was made for another LED layout, so no color is applied.`,
      ],
    };
  }

  const problems: string[] = [];
  const layers: LayerColorChanges[] = [];
  let changedColors = 0;
  let layersCompared = 0;

  for (const layer of file.layers) {
    const have = current.maps[layer.id];
    if (!current.layerIds.includes(layer.id) || !have) {
      problems.push(
        `The keyboard has no color map for the layer ${layer.name || layer.id} (id ${layer.id}) of the file: it is left out.`,
      );
      continue;
    }

    layersCompared++;
    const entries: LedEntry[] = [];
    const previous: LedEntry[] = [];
    layer.colors.forEach((text, slot) => {
      const rgb = colorValue(text);
      if (have[slot] !== rgb) {
        entries.push({ slot, rgb });
        previous.push({ slot, rgb: have[slot] });
      }
    });

    if (entries.length > 0) {
      layers.push({
        layerId: layer.id,
        layerName: layerNames.get(layer.id) ?? layer.name,
        entries,
        previous,
      });
      changedColors += entries.length;
    }
  }

  return { layers, changedColors, layersCompared, problems };
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

const OLED_PARTS: Array<[keyof WidgetIds, string]> = [
  ["show", "shown"],
  ["x", "x"],
  ["y", "y"],
  ["kind", "picture"],
  ["ms", "time of a cycle"],
  ["rot", "turn"],
  ["mix", "mix"],
  ["cropXY", "where the crop starts"],
  ["cropWH", "size of the crop"],
];

/** What a setting is called: the Display tab's name, or the widget and the part of it. */
export function labelOfSetting(id: number): string {
  if (!isOledLayoutId(id)) {
    return describeSetting(id).label;
  }

  for (const widget of WIDGETS) {
    for (const [part, name] of OLED_PARTS) {
      if (widget.ids[part] === id) {
        return `${widget.label}: ${name}`;
      }
    }
  }

  return `Setting ${id}`;
}

/** A value as the tabs write it: "On", the name of a picture, "Shown", or the number. */
export function describeSettingValue(id: number, value: number): string {
  if (!isOledLayoutId(id)) {
    return formatSettingValue(id, value);
  }

  for (const widget of WIDGETS) {
    if (widget.ids.kind === id) {
      return ANIMATION_KINDS.find((k) => k.value === value)?.label ?? String(value);
    }
    if (widget.ids.show === id) {
      return value !== 0 ? "Shown" : "Hidden";
    }
  }

  return String(value);
}

/** The settings of the keyboard as the file keeps them. Null when it has none. */
export function collectScreens(
  settings: readonly DisplaySettingData[],
): BackupScreens | null {
  return settings.length === 0
    ? null
    : {
        settings: settings.map((s) => ({
          id: s.id,
          label: labelOfSetting(s.id),
          value: s.value,
        })),
      };
}

export interface ScreenChange {
  id: number;
  label: string;
  /** The value it has. */
  from: number;
  /** The value it gets. */
  to: number;
  /** The file had a value outside what the keyboard takes: this is the nearest one. */
  adjusted: boolean;
}

export interface ScreensPlan {
  changes: ScreenChange[];
  /** How many settings of the file the keyboard has. */
  compared: number;
  problems: string[];
}

/**
 * What applying the settings of a file would change. A setting the keyboard does
 * not have is left out; a value outside the range the keyboard gave is held at
 * the nearest end, and the change says so.
 */
export function planScreens(
  file: BackupScreens,
  settings: readonly DisplaySettingData[],
): ScreensPlan {
  const byId = new Map(settings.map((s) => [s.id, s]));
  const changes: ScreenChange[] = [];
  const missing: string[] = [];
  let compared = 0;

  for (const entry of file.settings) {
    const have = byId.get(entry.id);
    if (!have) {
      missing.push(entry.label || `Setting ${entry.id}`);
      continue;
    }

    compared++;
    const to = clampSetting(have, entry.value);
    if (to !== have.value) {
      changes.push({
        id: entry.id,
        label: labelOfSetting(entry.id),
        from: have.value,
        to,
        adjusted: to !== entry.value,
      });
    }
  }

  const problems =
    missing.length === 0
      ? []
      : [
          `The keyboard has no ${missing.length === 1 ? "setting" : "settings"} ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ` and ${missing.length - 6} more` : ""}: left out.`,
        ];

  return { changes, compared, problems };
}
