/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Connects the rules of keyDrag.ts to the page: it follows the pointer from the
 * press on a key until the button is let go, and reports what was dropped on
 * which key. A press that does not move is left alone, so a click selects the key
 * as before.
 */
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DragAction,
  DragState,
  Drop,
  IDLE,
  dragReducer,
  dropModeFor,
  dropOnRelease,
} from "./keyDrag";

/** The position of the key under a point of the screen, if there is one. */
function keyPositionAt(x: number, y: number): number | undefined {
  const key = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-key-position]");

  return key ? Number(key.dataset.keyPosition) : undefined;
}

export interface KeyDrag {
  state: DragState;
  /** Call from the pointerdown of the key at `position`. */
  press: (position: number, event: ReactPointerEvent) => void;
  /**
   * Call from the click of a key: true when that click is the end of a drag and
   * must not select the key.
   */
  consumeClick: () => boolean;
}

export function useKeyDrag(onDrop: ((drop: Drop) => void) | undefined): KeyDrag {
  // The state lives in a ref as well as in React: the handlers below run between
  // renders (a release right after a move) and must see the latest state.
  const current = useRef<DragState>(IDLE);
  const [state, setState] = useState<DragState>(IDLE);
  const handlers = useRef({ onDrop });
  const stopListening = useRef<(() => void) | null>(null);
  const swallowClick = useRef(false);

  handlers.current = { onDrop };

  const send = useCallback((action: DragAction) => {
    const next = dragReducer(current.current, action);
    if (next !== current.current) {
      current.current = next;
      setState(next);
    }
  }, []);

  const press = useCallback(
    (position: number, e: ReactPointerEvent) => {
      if (!handlers.current.onDrop || current.current.phase !== "idle") return;
      if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;

      const pointerId = e.pointerId;
      send({
        type: "press",
        from: position,
        pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      const finish = (dropped: boolean) => {
        stop();
        // The click that follows the release must not select a key after a drag.
        if (dropped) {
          swallowClick.current = true;
          window.setTimeout(() => {
            swallowClick.current = false;
          }, 50);
        }
        send({ type: "end", pointerId });
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        // The button was let go where the page could not see it, outside the
        // window: the gesture is over, and nothing is dropped.
        if (ev.pointerType === "mouse" && ev.buttons === 0) {
          finish(current.current.phase === "dragging");
          return;
        }

        const over = keyPositionAt(ev.clientX, ev.clientY);
        send({
          type: "move",
          pointerId,
          x: ev.clientX,
          y: ev.clientY,
          over: over === position ? undefined : over,
          mode: dropModeFor(ev),
        });
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        const phase = current.current.phase;
        const over = phase === "dragging" ? keyPositionAt(ev.clientX, ev.clientY) : undefined;
        const drop = dropOnRelease(current.current, over, dropModeFor(ev));

        finish(phase === "dragging" || phase === "cancelled");
        if (drop) {
          handlers.current.onDrop?.(drop);
        }
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) {
          finish(current.current.phase === "dragging");
        }
      };

      // Escape ends the drag (the rest of the gesture does nothing); Ctrl and
      // Alt switch between swapping and copying while the pointer is held.
      const onKey = (ev: KeyboardEvent) => {
        if (ev.type === "keydown" && ev.key === "Escape") {
          send({ type: "cancel" });
        } else if (ev.key === "Control" || ev.key === "Alt") {
          send({ type: "mode", mode: dropModeFor(ev) });
        }
      };

      const onBlur = () => send({ type: "cancel" });

      const stop = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("blur", onBlur);
        stopListening.current = null;
      };

      // Registered here and not in an effect: a press and release in the same
      // frame must not slip between the render and the effect and leave the
      // gesture open.
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      window.addEventListener("blur", onBlur);
      stopListening.current = stop;
    },
    [send],
  );

  const consumeClick = useCallback(() => {
    if (!swallowClick.current) return false;

    swallowClick.current = false;
    return true;
  }, []);

  // While a key is being dragged, the cursor shows it wherever the pointer is
  // and the page does not select text.
  const dragging = state.phase === "dragging";
  useEffect(() => {
    if (!dragging) return;

    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging]);

  // A drag cannot outlive the keyboard view.
  useEffect(() => () => stopListening.current?.(), []);

  return { state, press, consumeClick };
}
