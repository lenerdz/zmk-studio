/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The layer that is active on the keyboard right now, as React state: it asks
 * the keyboard (the live status request, see ../live/liveStatusPoller.ts) while
 * `enabled` is true, the keyboard is connected and it is unlocked, and stops when
 * any of them stops being true. The layer and the status are kept apart as plain
 * values, so a reading that says the same as the one before does not render the
 * keyboard view again (it is asked about five times a second).
 */
import { useContext, useEffect, useState } from "react";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import {
  LiveStatusPoller,
  type LiveStatusKind,
} from "../live/liveStatusPoller";
import { FOLLOW_POLL_MS } from "./followLayer";

export interface ActiveLayer {
  /**
   * The index of the highest layer that is active on the keyboard, in the order
   * of the keymap. Undefined until the keyboard has answered and while nobody asks.
   */
  layer: number | undefined;
  /**
   * `idle` (nobody asks, or the keyboard is not there), `loading`, `ready`,
   * `unsupported` (the firmware has no live status request) or `error` (it
   * stopped answering; the last layer is kept).
   */
  status: LiveStatusKind;
}

/**
 * @param enabled whether somebody looks at the answer. Asking restarts the idle
 *   timer of the lock of ZMK Studio (a firmware with CONFIG_ZMK_STUDIO_LOCKING),
 *   so it is asked only while this is true.
 * @param intervalMs milliseconds between an answer and the next question
 */
export function useActiveLayer(
  enabled: boolean,
  intervalMs: number = FOLLOW_POLL_MS,
): ActiveLayer {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [layer, setLayer] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<LiveStatusKind>("idle");

  useEffect(() => {
    const conn = connection.conn;

    if (
      !enabled ||
      !conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setStatus("idle");
      setLayer(undefined);
      return;
    }

    const poller = new LiveStatusPoller(
      conn,
      (state) => {
        setStatus(state.status);
        setLayer(state.reading?.layerIndex);
      },
      { intervalMs },
    );
    poller.start();

    return () => poller.stop();
  }, [enabled, connection, lockState, intervalMs]);

  return { layer, status };
}
