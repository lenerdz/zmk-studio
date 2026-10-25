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
  /**
   * Changes several settings as one step of the history (a widget that was
   * moved, a file that was applied). Each pair is a setting id and its new value.
   * `group` names a gesture that changes different settings as it goes on (a
   * drag): the changes of the same group that come close together are one step.
   */
  setValues: (
    changes: ReadonlyArray<readonly [id: number, value: number]>,
    group?: string,
  ) => void;
  /** Puts every setting back to what the firmware was built with. */
  restoreDefaults: () => Promise<void>;
  /** There is a change made in the Display or the OLED tab to take back. */
  canUndo: boolean;
  /** A change was taken back and can be done again. */
  canRedo: boolean;
  /** Takes back the last change (the keyboard keeps the result by itself). */
  undo: () => void;
  /** Does again the change that was taken back. */
  redo: () => void;
}

export const INACTIVE_DISPLAY: DisplayApi = {
  status: "idle",
  settings: [],
  busy: false,
  setValue: () => {},
  setValues: () => {},
  restoreDefaults: async () => {},
  canUndo: false,
  canRedo: false,
  undo: () => {},
  redo: () => {},
};

export const DisplayContext = createContext<DisplayApi>(INACTIVE_DISPLAY);
