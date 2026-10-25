/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Carries the display settings of the connected keyboard into React: reads them
 * when the keyboard is unlocked and hands out the operations of a
 * DisplayController (displayController.ts holds the rules).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type { ConnectionState } from "../rpc/ConnectionContext";
import { INACTIVE_DISPLAY, type DisplayApi } from "./DisplayContext";
import {
  DisplayController,
  INITIAL_DISPLAY_STATE,
  LOADING_DISPLAY_STATE,
  type DisplayState,
} from "./displayController";

/**
 * What the tab shows while a new controller reads the keyboard: the settings it
 * already had, if any, so a reconnection does not make the tab blink away.
 */
export function stateWhileLoading(previous: DisplayState): DisplayState {
  return previous.status === "ready" ? previous : LOADING_DISPLAY_STATE;
}

/**
 * @param connection the connection state of the app. A new object (even with
 *   the same connection) makes the settings load again, like the rest of the
 *   app does after a discard or a settings reset.
 */
export function useDisplaySettings(
  connection: ConnectionState,
  lockState: LockState,
): DisplayApi {
  const [state, setState] = useState<DisplayState>(INITIAL_DISPLAY_STATE);
  const stateRef = useRef<DisplayState>(INITIAL_DISPLAY_STATE);
  const controllerRef = useRef<DisplayController | null>(null);

  useEffect(() => {
    const conn = connection.conn;

    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      stateRef.current = INITIAL_DISPLAY_STATE;
      setState(INITIAL_DISPLAY_STATE);
      return;
    }

    const controller = new DisplayController(
      conn,
      (next) => {
        stateRef.current = next;
        setState(next);
      },
      stateWhileLoading(stateRef.current),
    );
    controllerRef.current = controller;
    stateRef.current = controller.getState();
    setState(controller.getState());
    void controller.load();

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [connection, lockState]);

  const setValue = useCallback((id: number, value: number) => {
    controllerRef.current?.setValue(id, value);
  }, []);

  const setValues = useCallback(
    (changes: ReadonlyArray<readonly [number, number]>, group?: string) => {
      controllerRef.current?.setValues(changes, group);
    },
    [],
  );

  const restoreDefaults = useCallback(async () => {
    await controllerRef.current?.restoreDefaults();
  }, []);

  const undo = useCallback(() => {
    controllerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    controllerRef.current?.redo();
  }, []);

  return useMemo<DisplayApi>(
    () => ({
      ...INACTIVE_DISPLAY,
      status: state.status,
      error: state.error,
      settings: state.settings,
      problem: state.problem,
      busy: state.busy,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      setValue,
      setValues,
      restoreDefaults,
      undo,
      redo,
    }),
    [state, setValue, setValues, restoreDefaults, undo, redo],
  );
}
