/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The requests of the per-layer light maps (the LED requests of the keymap
 * subsystem in lenerdz/zmk-studio-messages). Firmware without them answers
 * RPC_NOT_FOUND, which fetchLedInfo reports as null.
 */
import {
  MetaError,
  type RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import {
  SaveChangesErrorCode,
  SetLedColorsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import { call_rpc_strict } from "../rpc/logging";
import { LED_MAX_ENTRIES_PER_REQUEST, LED_PROTOCOL_SLOTS } from "./ledColors";

export interface LedInfoData {
  /** How many entries of a map the keyboard uses (key positions + extra LEDs). */
  slotCount: number;
  /** Ids of the layers that have a map. These are the ids of the keymap layers. */
  layerIds: number[];
  /** The keyboard has light changes that are not saved yet. */
  unsavedChanges: boolean;
}

export interface LedEntry {
  slot: number;
  /** 0xRRGGBB */
  rgb: number;
}

export class LedRpcError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, LedRpcError.prototype);
  }
}

const BUSY_RETRIES = 5;
const BUSY_RETRY_DELAY_MS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeSetResult(code: SetLedColorsResponse | undefined): string {
  switch (code) {
    case SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_LAYER:
      return "the keyboard has no color map for this layer";
    case SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_SLOT:
      return "the keyboard rejected a LED number";
    case SetLedColorsResponse.SET_LED_COLORS_RESP_BUSY:
      return "the keyboard is busy";
    default:
      return "the keyboard did not answer the request";
  }
}

function toColors(colors: number[] | undefined): number[] {
  const result = new Array<number>(LED_PROTOCOL_SLOTS).fill(0);
  (colors ?? []).slice(0, LED_PROTOCOL_SLOTS).forEach((c, i) => {
    result[i] = c & 0xffffff;
  });
  return result;
}

/**
 * Asks the keyboard about its light maps. Returns null when the firmware does
 * not have them (the app then behaves like the original ZMK Studio).
 */
export async function fetchLedInfo(
  conn: RpcConnection,
): Promise<LedInfoData | null> {
  try {
    const response = await call_rpc_strict(conn, {
      keymap: { getLedInfo: true },
    });
    const info = response.keymap?.getLedInfo;
    if (!info) {
      return null;
    }

    return {
      slotCount: info.slotCount,
      layerIds: [...info.layerIds],
      unsavedChanges: info.unsavedChanges,
    };
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

/** The colors (0xRRGGBB) of a layer, LED_PROTOCOL_SLOTS entries. */
export async function fetchLedMap(
  conn: RpcConnection,
  layerId: number,
): Promise<number[]> {
  const response = await call_rpc_strict(conn, {
    keymap: { getLedMap: layerId },
  });
  const map = response.keymap?.getLedMap;
  if (!map) {
    throw new LedRpcError(`the keyboard did not send the colors of layer ${layerId}`);
  }

  return toColors(map.colors);
}

async function sendChunk(
  conn: RpcConnection,
  layerId: number,
  entries: LedEntry[],
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const response = await call_rpc_strict(conn, {
      keymap: { setLedColors: { layerId, entries } },
    });
    const code = response.keymap?.setLedColors;

    if (code === SetLedColorsResponse.SET_LED_COLORS_RESP_OK) {
      return;
    }

    if (
      code === SetLedColorsResponse.SET_LED_COLORS_RESP_BUSY &&
      attempt < BUSY_RETRIES
    ) {
      await sleep(BUSY_RETRY_DELAY_MS);
      continue;
    }

    throw new LedRpcError(
      `Could not change the colors of layer ${layerId}: ${describeSetResult(code)}`,
    );
  }
}

/**
 * Changes colors of a layer on the keyboard (live, not saved). The firmware takes
 * a limited number of entries per request, so a long list is sent in several.
 */
export async function sendLedColors(
  conn: RpcConnection,
  layerId: number,
  entries: LedEntry[],
): Promise<void> {
  for (let i = 0; i < entries.length; i += LED_MAX_ENTRIES_PER_REQUEST) {
    await sendChunk(
      conn,
      layerId,
      entries.slice(i, i + LED_MAX_ENTRIES_PER_REQUEST),
    );
  }
}

/** Saves the light changes in the keyboard memory. */
export async function saveLedChanges(conn: RpcConnection): Promise<void> {
  const response = await call_rpc_strict(conn, {
    keymap: { saveLedChanges: true },
  });
  const result = response.keymap?.saveLedChanges;

  if (!result?.ok) {
    const code =
      result?.err !== undefined
        ? SaveChangesErrorCode[result.err] ?? String(result.err)
        : "no answer";
    throw new LedRpcError(`Could not save the colors: ${code}`);
  }
}

/** Throws away the light changes that were not saved. */
export async function discardLedChanges(conn: RpcConnection): Promise<void> {
  const response = await call_rpc_strict(conn, {
    keymap: { discardLedChanges: true },
  });

  if (!response.keymap?.discardLedChanges) {
    throw new LedRpcError("Could not discard the color changes");
  }
}

/**
 * Puts the colors of a layer back to the defaults the firmware was built with
 * (live, not saved). Returns the colors the layer has now.
 */
export async function restoreLedDefaults(
  conn: RpcConnection,
  layerId: number,
): Promise<number[]> {
  const response = await call_rpc_strict(conn, {
    keymap: { restoreLedDefaults: layerId },
  });
  const map = response.keymap?.restoreLedDefaults;
  if (!map) {
    throw new LedRpcError(`Could not restore the default colors of layer ${layerId}`);
  }

  return toColors(map.colors);
}
