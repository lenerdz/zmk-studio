/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Asks the keyboard once what firmware it runs (see liveProtocol.ts) when the
 * keyboard is connected and unlocked. It does not change while the keyboard
 * runs, so there is nothing to poll; the Diagnostics tab exists only when the
 * firmware answers.
 */
import { useEffect, useState } from "react";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type { ConnectionState } from "../rpc/ConnectionContext";
import { fetchFirmwareInfo, type FirmwareDetails } from "../live/liveProtocol";

export type FirmwareInfoStatus =
  /** Not connected, or the keyboard is locked. */
  | "idle"
  | "loading"
  | "ready"
  /** The firmware does not have the request: the app does not offer the tab. */
  | "unsupported"
  | "error";

export interface FirmwareInfoState {
  status: FirmwareInfoStatus;
  info: FirmwareDetails | null;
  /** What went wrong when status is "error". */
  error?: string;
}

export const NO_FIRMWARE_INFO: FirmwareInfoState = {
  status: "idle",
  info: null,
};

/**
 * @param connection the connection state of the app. A new object (even with
 *   the same connection) asks again, like the rest of the app does after a
 *   discard or a settings reset.
 */
export function useFirmwareInfo(
  connection: ConnectionState,
  lockState: LockState,
): FirmwareInfoState {
  const [state, setState] = useState<FirmwareInfoState>(NO_FIRMWARE_INFO);

  useEffect(() => {
    const conn = connection.conn;

    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      setState(NO_FIRMWARE_INFO);
      return;
    }

    let ignore = false;
    setState({ status: "loading", info: null });

    fetchFirmwareInfo(conn).then(
      (info) => {
        if (!ignore) {
          setState(
            info === null
              ? { status: "unsupported", info: null }
              : { status: "ready", info },
          );
        }
      },
      (e) => {
        if (!ignore) {
          console.error("Failed to read the firmware information", e);
          setState({
            status: "error",
            info: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      },
    );

    return () => {
      ignore = true;
    };
  }, [connection, lockState]);

  return state;
}
