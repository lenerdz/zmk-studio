/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The words of the Files tab for a plan: one sentence per part of the file that
 * says how much differs from the keyboard, and the lines under it that say where.
 */
import {
  describeSettingValue,
  type KeysPlan,
  type LightsPlan,
  type ScreensPlan,
} from "./backupPlan";

/** "1 key", "3 keys". */
export const count = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** How many lines of detail a part shows before "and N more". */
export const DETAIL_LINES = 12;

export const SAME = "Same as the keyboard.";

/** The sentence of the keys. */
export function describeKeys(plan: KeysPlan): string {
  if (plan.changedKeys === 0 && plan.renames.length === 0) {
    return plan.layersCompared === 0 ? "Nothing to apply." : SAME;
  }

  const keys =
    plan.changedKeys === 0
      ? ""
      : `${count(plan.changedKeys, "key")} change in ${count(plan.layers.length, "layer")}`;
  const names =
    plan.renames.length === 0
      ? ""
      : `${count(plan.renames.length, "layer name")} change`;

  return `${[keys, names].filter(Boolean).join(" and ")}.`;
}

/** The sentence of the colors. */
export function describeLights(plan: LightsPlan): string {
  if (plan.changedColors === 0) {
    return plan.layersCompared === 0 ? "Nothing to apply." : SAME;
  }

  return `${count(plan.changedColors, "color")} change in ${count(plan.layers.length, "layer")}.`;
}

/** The sentence of the screens. */
export function describeScreens(plan: ScreensPlan): string {
  if (plan.changes.length === 0) {
    return plan.compared === 0 ? "Nothing to apply." : SAME;
  }

  return `${count(plan.changes.length, "setting")} change.`;
}

function limited(lines: string[]): string[] {
  return lines.length <= DETAIL_LINES
    ? lines
    : [
        ...lines.slice(0, DETAIL_LINES),
        `and ${lines.length - DETAIL_LINES} more`,
      ];
}

/** Where the keys differ: a line per layer, and the names that change. */
export function keysDetails(plan: KeysPlan): string[] {
  return limited([
    ...plan.renames.map((r) => `Layer ${r.from || r.layerId} is named ${r.to || "(no name)"}`),
    ...plan.layers.map(
      (l) =>
        `${l.layerName || `Layer ${l.layerId}`}: ${count(l.edits.length, "key")}`,
    ),
  ]);
}

/** Where the colors differ: a line per layer. */
export function lightsDetails(plan: LightsPlan): string[] {
  return limited(
    plan.layers.map(
      (l) =>
        `${l.layerName || `Layer ${l.layerId}`}: ${count(l.entries.length, "color")}`,
    ),
  );
}

/** Which settings differ: each with the value it has and the one it gets. */
export function screensDetails(plan: ScreensPlan): string[] {
  return limited(
    plan.changes.map(
      (c) =>
        `${c.label}: ${describeSettingValue(c.id, c.from)} to ${describeSettingValue(c.id, c.to)}${c.adjusted ? " (the nearest value the keyboard takes)" : ""}`,
    ),
  );
}
