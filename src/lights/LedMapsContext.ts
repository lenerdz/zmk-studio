/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { createContext } from "react";
import type { LedEntry } from "./ledProtocol";

export type LedMapsStatus =
  /** Not connected, or the keyboard is locked. */
  | "idle"
  | "loading"
  | "ready"
  /** The firmware has no light maps: the app looks like the original. */
  | "unsupported"
  | "error";

export interface LedMapsApi {
  status: LedMapsStatus;
  /** What went wrong when status is "error". */
  error?: string;
  /** How many entries of a map the keyboard uses. */
  slotCount: number;
  /** Ids of the layers that have a map. */
  layerIds: number[];
  /** The colors (0xRRGGBB) of each map, by layer id. */
  maps: Record<number, number[]>;
  /** The keyboard has light changes that are not saved. */
  unsaved: boolean;
  /** Changes colors of a layer; can be undone with the app's undo. */
  paint: (layerId: number, entries: LedEntry[]) => Promise<void>;
  /** Puts a layer back to the colors the firmware was built with. */
  restoreDefaults: (layerId: number) => Promise<void>;
  /** Saves the light changes in the keyboard memory. */
  save: () => Promise<void>;
  /** Throws away the light changes that were not saved. */
  discard: () => Promise<void>;
}

export const INACTIVE_LED_MAPS: LedMapsApi = {
  status: "idle",
  slotCount: 0,
  layerIds: [],
  maps: {},
  unsaved: false,
  paint: async () => {},
  restoreDefaults: async () => {},
  save: async () => {},
  discard: async () => {},
};

export const LedMapsContext = createContext<LedMapsApi>(INACTIVE_LED_MAPS);
