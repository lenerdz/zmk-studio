/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Carries the live status of the connected keyboard into React: it asks the
 * keyboard (see liveStatusPoller.ts) while `enabled` is true, the keyboard is
 * connected and it is unlocked, and stops when any of them stops being true.
 */
import { useContext, useEffect, useState } from "react";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import {
  IDLE_LIVE_STATE,
  LiveStatusPoller,
  type LiveState,
} from "./liveStatusPoller";

/**
 * @param enabled whether somebody looks at the live values. Asking the keyboard
 *   restarts the idle timer of the lock of ZMK Studio (a firmware with
 *   CONFIG_ZMK_STUDIO_LOCKING), so it is asked only while this is true.
 * @param intervalMs milliseconds between an answer and the next question
 */
export function useLiveStatus(enabled: boolean, intervalMs?: number): LiveState {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [state, setState] = useState<LiveState>(IDLE_LIVE_STATE);

  useEffect(() => {
    const conn = connection.conn;

    if (
      !enabled ||
      !conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setState(IDLE_LIVE_STATE);
      return;
    }

    const poller = new LiveStatusPoller(conn, setState, { intervalMs });
    poller.start();

    return () => poller.stop();
  }, [enabled, connection, lockState, intervalMs]);

  return state;
}
