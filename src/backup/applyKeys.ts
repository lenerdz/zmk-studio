/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Writes the keys of a file to the keyboard (or puts them back): the layer names
 * and the keys of backupPlan.keyOps, one request each. If the keyboard refuses
 * one, everything written before is put back, so a file is applied whole or not
 * at all.
 */
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import {
  SetLayerBindingResponse,
  SetLayerPropsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { call_rpc_strict } from "../rpc/logging";
import type { KeyOp } from "./backupPlan";

async function write(
  conn: RpcConnection,
  op: KeyOp,
  side: "to" | "from",
): Promise<string | null> {
  if (op.kind === "name") {
    const response = await call_rpc_strict(conn, {
      keymap: { setLayerProps: { layerId: op.layerId, name: op[side] } },
    });
    return response.keymap?.setLayerProps ===
      SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK
      ? null
      : `the keyboard did not accept the name "${op[side]}" for the layer ${op.layerId}`;
  }

  const response = await call_rpc_strict(conn, {
    keymap: {
      setLayerBinding: {
        layerId: op.layerId,
        keyPosition: op.keyPosition,
        binding: op[side],
      },
    },
  });
  return response.keymap?.setLayerBinding ===
    SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
    ? null
    : `the keyboard did not accept the key ${op.keyPosition} of the layer ${op.layerId}`;
}

/**
 * Writes `ops` ("apply") or puts them back, last first ("revert"). When one is
 * refused, the ones already written go back and the error says which one failed.
 */
export async function writeKeyOps(
  conn: RpcConnection,
  ops: readonly KeyOp[],
  direction: "apply" | "revert",
): Promise<void> {
  const ordered = direction === "apply" ? [...ops] : [...ops].reverse();
  const side = direction === "apply" ? "to" : "from";
  const back = direction === "apply" ? "from" : "to";
  const written: KeyOp[] = [];

  for (const op of ordered) {
    let problem: string | null;
    try {
      problem = await write(conn, op, side);
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    }

    if (problem !== null) {
      for (const done of written.reverse()) {
        try {
          await write(conn, done, back);
        } catch (e) {
          console.error("Failed to put a key back", e);
        }
      }
      throw new Error(
        `Could not write the keys: ${problem}. Nothing was changed.`,
      );
    }
    written.push(op);
  }
}
