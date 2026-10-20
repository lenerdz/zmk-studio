/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { createContext } from "react";
import type { DisplaySettingData } from "./displayProtocol";

export type DisplayStatus =
  /** Not connected, or the keyboard is locked. */
  | "idle"
  | "loading"
  | "ready"
  /** The firmware has no display settings: the app looks like the original. */
  | "unsupported"
  | "error";

export interface DisplayApi {
  status: DisplayStatus;
  /** What went wrong when status is "error". */
  error?: string;
  /** The settings the keyboard has, in the order it lists them. */
  settings: DisplaySettingData[];
  /** The last change or restore the keyboard did not take, until the next one works. */
  problem?: string;
  /** A restore is going on: the controls wait. */
  busy: boolean;
  /** Changes a setting. The keyboard applies it and remembers it by itself. */
  setValue: (id: number, value: number) => void;
  /** Puts every setting back to what the firmware was built with. */
  restoreDefaults: () => Promise<void>;
}

export const INACTIVE_DISPLAY: DisplayApi = {
  status: "idle",
  settings: [],
  busy: false,
  setValue: () => {},
  restoreDefaults: async () => {},
};

export const DisplayContext = createContext<DisplayApi>(INACTIVE_DISPLAY);
