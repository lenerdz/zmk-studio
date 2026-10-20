/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The requests of the display (OLED) settings: the display requests of the keymap
 * subsystem in lenerdz/zmk-studio-messages (tags 106 to 108). Firmware without
 * them answers RPC_NOT_FOUND, which fetchDisplayInfo reports as null.
 */
import {
  MetaError,
  type RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import {
  SetDisplaySettingResponse,
  type DisplaySetting,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import { call_rpc_strict } from "../rpc/logging";

/** One setting of the keyboard, with the range the firmware accepts for it. */
export interface DisplaySettingData {
  id: number;
  value: number;
  min: number;
  max: number;
  /** What the firmware was built with: "Restore defaults" puts it back. */
  defaultValue: number;
}

export class DisplayRpcError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DisplayRpcError.prototype);
  }
}

function toData(setting: DisplaySetting): DisplaySettingData {
  return {
    id: setting.id,
    value: setting.value,
    min: setting.min,
    max: setting.max,
    defaultValue: setting.defaultValue,
  };
}

function describeSetResult(
  code: SetDisplaySettingResponse | undefined,
  id: number,
  value: number,
): string {
  switch (code) {
    case SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_INVALID_ID:
      return `the keyboard does not have the setting ${id}`;
    case SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_INVALID_VALUE:
      return `the keyboard does not accept ${value} for the setting ${id}`;
    default:
      return "the keyboard did not answer the request";
  }
}

/**
 * Asks the keyboard for its display settings. Returns null when the firmware
 * does not have them (the app then does not offer the Display tab).
 */
export async function fetchDisplayInfo(
  conn: RpcConnection,
): Promise<DisplaySettingData[] | null> {
  try {
    const response = await call_rpc_strict(conn, {
      keymap: { getDisplayInfo: true },
    });
    const info = response.keymap?.getDisplayInfo;
    if (!info) {
      return null;
    }

    return info.settings.map(toData);
  } catch (e) {
    if (
      e instanceof MetaError &&
      e.condition === ErrorConditions.RPC_NOT_FOUND
    ) {
      return null;
    }
    throw e;
  }
}

/**
 * Changes a setting. The keyboard applies it at once and keeps it in its own
 * memory a few seconds later (there is nothing to save).
 */
export async function sendDisplaySetting(
  conn: RpcConnection,
  id: number,
  value: number,
): Promise<void> {
  const response = await call_rpc_strict(conn, {
    keymap: { setDisplaySetting: { id, value } },
  });
  const code = response.keymap?.setDisplaySetting;

  if (code !== SetDisplaySettingResponse.SET_DISPLAY_SETTING_RESP_OK) {
    throw new DisplayRpcError(
      `Could not change the setting ${id}: ${describeSetResult(code, id, value)}`,
    );
  }
}

/**
 * Puts every setting back to what the firmware was built with. Returns the
 * settings the keyboard has now.
 */
export async function restoreDisplayDefaults(
  conn: RpcConnection,
): Promise<DisplaySettingData[]> {
  const response = await call_rpc_strict(conn, {
    keymap: { restoreDisplayDefaults: true },
  });
  const info = response.keymap?.restoreDisplayDefaults;
  if (!info) {
    throw new DisplayRpcError("Could not restore the default screen settings");
  }

  return info.settings.map(toData);
}
