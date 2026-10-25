/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Connects the rules of keyDrag.ts to the page: it follows the pointer from the
 * press on a key until the button is let go, and reports what was dropped on
 * which key, which layer of the list the key is held over (the keyboard opens it)
 * and a drag that ended without a drop. A press that does not move is left alone,
 * so a click selects the key as before.
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

/**
 * The id of the layer of the list under a point of the screen, if there is one.
 * LayerPicker marks its list with `data-layer-picker`, and react-aria gives each
 * item of the list a `data-key` with the id of its layer.
 */
function layerIdAt(x: number, y: number): number | undefined {
  const item = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-layer-picker] [role='option']");
  const id = item?.dataset.key;

  return id !== undefined && id !== "" && Number.isFinite(Number(id))
    ? Number(id)
    : undefined;
}

/** The layer the key of a gesture was picked up from. */
function layerOf(state: DragState): number | undefined {
  switch (state.phase) {
    case "pressed":
      return state.layer;
    case "dragging":
    case "cancelled":
      return state.fromLayer;
    default:
      return undefined;
  }
}

export interface KeyDragOptions {
  /** A key was dropped on another. Dragging is off when this is not given. */
  onDrop?: (drop: Drop) => void;
  /** The id of the layer the keys on the screen belong to, if they do. */
  layerId?: number;
  /**
   * The layer of the list under the dragged key changed: its id, or undefined
   * when the key is over no layer (and when the drag is over).
   */
  onLayerOver?: (layerId: number | undefined) => void;
  /**
   * A drag ended without a drop: Escape, or the button let go over no key.
   * `fromLayer` is the layer the key was picked up from.
   */
  onAbort?: (fromLayer: number | undefined) => void;
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

export function useKeyDrag(options: KeyDragOptions): KeyDrag {
  // The state lives in a ref as well as in React: the handlers below run between
  // renders (a release right after a move) and must see the latest state.
  const current = useRef<DragState>(IDLE);
  const [state, setState] = useState<DragState>(IDLE);
  const handlers = useRef(options);
  const stopListening = useRef<(() => void) | null>(null);
  const swallowClick = useRef(false);

  handlers.current = options;

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
      const fromLayer = handlers.current.layerId;
      send({
        type: "press",
        from: position,
        layer: fromLayer,
        pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      // `wasDrag`: the click that follows the release must not select a key.
      const finish = (wasDrag: boolean) => {
        stop();
        if (wasDrag) {
          swallowClick.current = true;
          window.setTimeout(() => {
            swallowClick.current = false;
          }, 50);
        }
        send({ type: "end", pointerId });
      };

      // The drag was going on and ends without a drop.
      const abort = (was: DragState) => {
        if (was.phase === "dragging") {
          handlers.current.onAbort?.(layerOf(was));
        }
      };

      // Escape, or the window losing the focus.
      const cancelGesture = () => {
        const was = current.current;

        send({ type: "cancel" });
        abort(was);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        // The button was let go where the page could not see it, outside the
        // window: the gesture is over, and nothing is dropped.
        if (ev.pointerType === "mouse" && ev.buttons === 0) {
          const was = current.current;

          finish(was.phase === "dragging");
          abort(was);
          return;
        }

        const over = keyPositionAt(ev.clientX, ev.clientY);
        // The dragged key is not a target of its own drag, but the same position
        // of another layer is another key.
        const itself = over === position && handlers.current.layerId === fromLayer;

        send({
          type: "move",
          pointerId,
          x: ev.clientX,
          y: ev.clientY,
          over: itself ? undefined : over,
          overLayer: layerIdAt(ev.clientX, ev.clientY),
          mode: dropModeFor(ev),
        });
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        const was = current.current;
        const over =
          was.phase === "dragging"
            ? keyPositionAt(ev.clientX, ev.clientY)
            : undefined;
        const drop = dropOnRelease(
          was,
          over,
          dropModeFor(ev),
          handlers.current.layerId,
        );

        finish(was.phase === "dragging" || was.phase === "cancelled");
        if (drop) {
          handlers.current.onDrop?.(drop);
        } else {
          abort(was);
        }
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) {
          const was = current.current;

          finish(was.phase === "dragging");
          abort(was);
        }
      };

      // Escape ends the drag (the rest of the gesture does nothing); Ctrl and
      // Alt switch between swapping and copying while the pointer is held.
      const onKey = (ev: KeyboardEvent) => {
        if (ev.type === "keydown" && ev.key === "Escape") {
          cancelGesture();
        } else if (ev.key === "Control" || ev.key === "Alt") {
          send({ type: "mode", mode: dropModeFor(ev) });
        }
      };

      const onBlur = () => cancelGesture();

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

  // The layer of the list under the dragged key, for whoever opens it.
  const overLayer = state.phase === "dragging" ? state.overLayer : undefined;
  useEffect(() => {
    handlers.current.onLayerOver?.(overLayer);
  }, [overLayer]);

  // A drag cannot outlive the keyboard view.
  useEffect(() => () => stopListening.current?.(), []);

  return { state, press, consumeClick };
}
