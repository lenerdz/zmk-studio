/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The two read only requests that tell what the keyboard is doing and what
 * firmware it runs: get_live_status (109) and get_firmware_info (110) of the keymap
 * subsystem in lenerdz/zmk-studio-messages. Firmware without them answers
 * RPC_NOT_FOUND, which the fetch functions report as null.
 */
import {
  MetaError,
  type RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import {
  LiveBleState,
  LiveOutput,
  LiveUsbState,
  type FirmwareInfo as FirmwareInfoMessage,
  type LiveStatus as LiveStatusMessage,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import { call_rpc_strict } from "../rpc/logging";

/** Where the keys go. */
export type LiveOutputName = "none" | "usb" | "ble";

/**
 * The state of the selected Bluetooth profile: open (no host paired, the
 * keyboard advertises), paired (a host is paired but not connected) or connected.
 */
export type LiveBleStateName = "open" | "paired" | "connected";

/** The USB connector: nothing, power only, or a host that uses the keyboard. */
export type LiveUsbStateName = "none" | "powered" | "hid";

/** What the screens draw right now, as the central half knows it. */
export interface LiveStatus {
  /** Percent from 0 to 100; null when the half has no reading. */
  batteryCentral: number | null;
  /** Percent from 0 to 100; null when the other half has not reported. */
  batteryPeripheral: number | null;
  peripheralConnected: boolean;
  /** The highest active layer: its index in the keymap order. */
  layerIndex: number;
  /** The name of that layer; empty when it has none. */
  layerName: string;
  /** Words per minute now. */
  wpm: number;
  output: LiveOutputName;
  /** The selected Bluetooth profile, from 0. */
  bleProfile: number;
  bleState: LiveBleStateName;
  usbState: LiveUsbStateName;
  /** Seconds since the keyboard started. */
  uptimeS: number;
}

/** What the firmware is. It does not change while the keyboard runs. */
export interface FirmwareDetails {
  keyboard: string;
  board: string;
  zephyr: string;
  /** The commit that was built, short; empty when it is not known. */
  buildId: string;
  /** The branch of that commit; empty when it is not known. */
  buildBranch: string;
  /** The number of the CI run that built it; null when it is not known. */
  buildNumber: number | null;
  /** The day of the build (UTC), like 2026-10-25; empty when it is not known. */
  buildDate: string;
  /** The bytes of the code partition, and the bytes of it the program takes. */
  flashTotal: number;
  flashUsed: number;
  /** The bytes of the RAM, and the bytes of it the program takes as it starts. */
  ramTotal: number;
  ramUsed: number;
}

/** What the firmware sends for a battery it has no reading of. */
const NO_BATTERY = 255;

function battery(raw: number): number | null {
  return raw === NO_BATTERY ? null : Math.min(Math.max(raw, 0), 100);
}

function output(raw: LiveOutput): LiveOutputName {
  switch (raw) {
    case LiveOutput.LIVE_OUTPUT_USB:
      return "usb";
    case LiveOutput.LIVE_OUTPUT_BLE:
      return "ble";
    default:
      return "none";
  }
}

function bleState(raw: LiveBleState): LiveBleStateName {
  switch (raw) {
    case LiveBleState.LIVE_BLE_CONNECTED:
      return "connected";
    case LiveBleState.LIVE_BLE_PAIRED:
      return "paired";
    default:
      return "open";
  }
}

function usbState(raw: LiveUsbState): LiveUsbStateName {
  switch (raw) {
    case LiveUsbState.LIVE_USB_HID:
      return "hid";
    case LiveUsbState.LIVE_USB_POWERED:
      return "powered";
    default:
      return "none";
  }
}

/** The message of the keyboard, as the app uses it. */
export function toLiveStatus(message: LiveStatusMessage): LiveStatus {
  return {
    batteryCentral: battery(message.batteryCentral),
    batteryPeripheral: battery(message.batteryPeripheral),
    peripheralConnected: message.peripheralConnected,
    layerIndex: message.layerIndex,
    layerName: message.layerName,
    wpm: message.wpm,
    output: output(message.output),
    bleProfile: message.bleProfile,
    bleState: bleState(message.bleState),
    usbState: usbState(message.usbState),
    uptimeS: message.uptimeS,
  };
}

/** The message of the keyboard, as the app uses it. */
export function toFirmwareDetails(
  message: FirmwareInfoMessage,
): FirmwareDetails {
  return {
    keyboard: message.keyboard,
    board: message.board,
    zephyr: message.zephyr,
    buildId: message.buildId,
    buildBranch: message.buildBranch,
    buildNumber: message.buildNumber === 0 ? null : message.buildNumber,
    buildDate: message.buildDate,
    flashTotal: message.flashTotal,
    flashUsed: message.flashUsed,
    ramTotal: message.ramTotal,
    ramUsed: message.ramUsed,
  };
}

function notFound(e: unknown): boolean {
  return (
    e instanceof MetaError && e.condition === ErrorConditions.RPC_NOT_FOUND
  );
}

/**
 * Asks the keyboard what it is doing. Returns null when the firmware does not
 * have the request (the app then does not offer the live values).
 */
export async function fetchLiveStatus(
  conn: RpcConnection,
): Promise<LiveStatus | null> {
  try {
    const response = await call_rpc_strict(conn, {
      keymap: { getLiveStatus: true },
    });
    const status = response.keymap?.getLiveStatus;
    return status ? toLiveStatus(status) : null;
  } catch (e) {
    if (notFound(e)) {
      return null;
    }
    throw e;
  }
}

/**
 * Asks the keyboard what firmware it runs. Returns null when the firmware does
 * not have the request (the app then does not offer the Diagnostics tab).
 */
export async function fetchFirmwareInfo(
  conn: RpcConnection,
): Promise<FirmwareDetails | null> {
  try {
    const response = await call_rpc_strict(conn, {
      keymap: { getFirmwareInfo: true },
    });
    const info = response.keymap?.getFirmwareInfo;
    return info ? toFirmwareDetails(info) : null;
  } catch (e) {
    if (notFound(e)) {
      return null;
    }
    throw e;
  }
}
