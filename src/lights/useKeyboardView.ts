/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the Lights tab needs to draw the keyboard: the active physical layout, the
 * keymap (layer names and the key on each position) and the behaviors (to
 * label the keys). It asks the keyboard again each time the tab is shown, so it
 * has the changes made in the Keys tab.
 */
import { useContext, useEffect, useState } from "react";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type {
  Keymap,
  PhysicalLayout,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { LockStateContext } from "../rpc/LockStateContext";
import { call_rpc_strict } from "../rpc/logging";

export type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface KeyboardView {
  layout?: PhysicalLayout;
  keymap?: Keymap;
  behaviors: BehaviorMap;
}

export function useKeyboardView(): KeyboardView {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [view, setView] = useState<KeyboardView>({ behaviors: {} });

  useEffect(() => {
    const conn = connection.conn;

    if (!conn || lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
      setView({ behaviors: {} });
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const layouts = await call_rpc_strict(conn!, {
          keymap: { getPhysicalLayouts: true },
        });
        const keymap = await call_rpc_strict(conn!, {
          keymap: { getKeymap: true },
        });
        if (ignore) {
          return;
        }

        const physical = layouts.keymap?.getPhysicalLayouts;
        setView({
          layout: physical?.layouts[physical.activeLayoutIndex],
          keymap: keymap.keymap?.getKeymap,
          behaviors: {},
        });

        // The labels of the keys need the behaviors; they arrive after the keys.
        const list = await call_rpc_strict(conn!, {
          behaviors: { listAllBehaviors: true },
        });
        const behaviors: BehaviorMap = {};
        for (const behaviorId of list.behaviors?.listAllBehaviors?.behaviors ??
          []) {
          const details = await call_rpc_strict(conn!, {
            behaviors: { getBehaviorDetails: { behaviorId } },
          });
          const behavior = details.behaviors?.getBehaviorDetails;
          if (behavior) {
            behaviors[behavior.id] = behavior;
          }
          if (ignore) {
            return;
          }
        }

        setView((v) => ({ ...v, behaviors }));
      } catch (e) {
        console.error("Failed to load the keyboard for the Lights tab", e);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [connection, lockState]);

  return view;
}
