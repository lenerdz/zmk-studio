/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Applies the parts of a file the user chose, in the order keys, lights,
 * screens, each through what the app already uses to change it, so that the
 * result can be taken back with Undo:
 *  - the keys go through the undo of the app (one step for all the keys of the
 *    file) and need Save, like any change of the Keys tab;
 *  - the colors go through ledMaps.paint (one step per layer) and need Save;
 *  - the screens go through the display settings (one step for all of them) and
 *    the keyboard keeps them by itself.
 * If a part fails, the ones after it are not applied and the error says which one.
 */
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import type { DisplayApi } from "../display/DisplayContext";
import type { LedMapsApi } from "../lights/LedMapsContext";
import type { DoCallback } from "../undoRedo";
import { writeKeyOps } from "./applyKeys";
import {
  keyOps,
  type KeysPlan,
  type LightsPlan,
  type ScreensPlan,
} from "./backupPlan";

export type Section = "keys" | "lights" | "screens";

export interface Plans {
  keys?: KeysPlan;
  lights?: LightsPlan;
  screens?: ScreensPlan;
}

export interface ApplyTargets {
  conn: RpcConnection;
  /** The undo and redo runner of the app. */
  doIt: (callback: DoCallback) => Promise<void>;
  paint: LedMapsApi["paint"];
  setValues: DisplayApi["setValues"];
  /** Asks the Keys tab to read the keymap again. */
  reloadKeys: () => void;
}

export interface ApplyReport {
  /** How much of each part was changed: keys, colors, settings. */
  applied: Partial<Record<Section, number>>;
  /** The part that failed, and why; the parts after it were not applied. */
  failed?: { section: Section; message: string };
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Whether a part of the file has anything to change. */
export function hasChanges(plans: Plans, section: Section): boolean {
  switch (section) {
    case "keys":
      return (
        (plans.keys?.changedKeys ?? 0) > 0 ||
        (plans.keys?.renames.length ?? 0) > 0
      );
    case "lights":
      return (plans.lights?.changedColors ?? 0) > 0;
    case "screens":
      return (plans.screens?.changes.length ?? 0) > 0;
  }
}

export async function applyBackup(
  plans: Plans,
  chosen: Readonly<Record<Section, boolean>>,
  targets: ApplyTargets,
): Promise<ApplyReport> {
  const applied: Partial<Record<Section, number>> = {};

  if (chosen.keys && plans.keys && hasChanges(plans, "keys")) {
    const ops = keyOps(plans.keys);
    const { conn, reloadKeys } = targets;

    try {
      await targets.doIt(async () => {
        await writeKeyOps(conn, ops, "apply");
        reloadKeys();

        return async () => {
          try {
            await writeKeyOps(conn, ops, "revert");
          } catch (e) {
            console.error("Failed to undo the keys of the file", e);
            (globalThis as { alert?: (message: string) => void }).alert?.(
              `Failed to undo the keys of the file: ${messageOf(e)}`,
            );
          }
          reloadKeys();
        };
      });
    } catch (e) {
      return { applied, failed: { section: "keys", message: messageOf(e) } };
    }
    applied.keys = plans.keys.changedKeys;
  }

  if (chosen.lights && plans.lights && hasChanges(plans, "lights")) {
    let colors = 0;
    try {
      for (const layer of plans.lights.layers) {
        await targets.paint(layer.layerId, layer.entries);
        colors += layer.entries.length;
      }
    } catch (e) {
      applied.lights = colors;
      return { applied, failed: { section: "lights", message: messageOf(e) } };
    }
    applied.lights = colors;
  }

  if (chosen.screens && plans.screens && hasChanges(plans, "screens")) {
    targets.setValues(plans.screens.changes.map((c) => [c.id, c.to] as const));
    applied.screens = plans.screens.changes.length;
  }

  return { applied };
}
