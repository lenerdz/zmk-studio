/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The editor of one OLED screen: the canvas the widgets are drawn on, upright,
 * with the strip the panel shows lit and the rest dimmed, rulers in pixels, and
 * the widgets of the screen as things to drag. Dragging moves a widget live (the
 * keyboard follows, paced by the display writer); the arrow keys move the
 * selected one by a pixel (by eight with Shift) and Delete hides it. A chip
 * dropped from the tray of hidden widgets shows it where it lands, and a picture
 * dropped from the gallery plays on the right screen where it lands.
 */
import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { DRAG_KIND_MIME, DRAG_WIDGET_MIME } from "./dragTypes";
import { CANVAS, WINDOW } from "./oledGeometry";
import {
  drawOrder,
  valuesAfterMove,
  valuesForCorner,
  type WidgetState,
} from "./oledLayout";
import { LIT_COLOR, PANEL_COLOR, WidgetArt } from "./PixelArt";
import type { ScreenId } from "./oledCatalog";

/** Canvas pixels shown on each side of the canvas, to find widgets that are off it. */
export const MARGIN = 24;

/** A widget keeps at least this many canvas pixels inside the editor while it is dragged. */
const KEEP_INSIDE = 6;

/** Smaller widgets get a hit area of at least this many screen pixels. */
const MIN_HIT = 28;

interface Props {
  screen: ScreenId;
  /** The widgets of the screen that the keyboard has. Only the ones that are shown are drawn. */
  widgets: WidgetState[];
  selectedKey: string | null;
  /** Screen pixels per pixel of the OLED. */
  scale: number;
  grid: boolean;
  /** The frame of the picture of the right screen. */
  frame: number;
  /** A restore is going on. */
  disabled: boolean;
  onSelect: (key: string | null) => void;
  onMove: (state: WidgetState, values: { x: number; y: number }) => void;
  onHide: (state: WidgetState) => void;
  /** A chip of the tray was dropped; the point is on the canvas, upright. */
  onDropChip: (key: string, point: { x: number; y: number }) => void;
  /**
   * A picture of the gallery was dropped. Only the screen that plays the picture
   * takes it: without this the screen does not accept the drop.
   */
  onDropKind?: (kind: number, point: { x: number; y: number }) => void;
}

interface DragState {
  key: string;
  startX: number;
  startY: number;
  /** The widget as it was when the drag began; its box and range do not change. */
  state: WidgetState;
  moved: boolean;
}

function describe(state: WidgetState): string {
  return `${state.def.label}, ${state.rect.w} by ${state.rect.h} pixels, at x ${state.x}, y ${state.y}`;
}

const TICKS_X = [0, 16, 32, 48, 64];
const TICKS_Y = [32, 48, 64, 80, 96, 112, 128, 144, 160];

export const ScreenEditor = ({
  screen,
  widgets,
  selectedKey,
  scale,
  grid,
  frame,
  disabled,
  onSelect,
  onMove,
  onHide,
  onDropChip,
  onDropKind,
}: Props) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);

  const px = (canvasPixels: number) => (canvasPixels + MARGIN) * scale;
  const area = {
    width: (CANVAS.width + 2 * MARGIN) * scale,
    height: (CANVAS.height + 2 * MARGIN) * scale,
  };

  const shown = widgets
    .filter((w) => w.shown)
    .sort((a, b) => drawOrder(a) - drawOrder(b));

  const startDrag = (e: PointerEvent<HTMLDivElement>, state: WidgetState) => {
    if (e.button !== 0 || disabled) {
      return;
    }

    try {
      // The widget keeps getting the moves when the pointer leaves it
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone (a pen that was lifted, a touch that was
      // cancelled): the drag then follows the events of the widget alone.
    }
    dragRef.current = {
      key: state.def.key,
      startX: e.clientX,
      startY: e.clientY,
      state,
      moved: false,
    };
    onSelect(state.def.key);
  };

  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const dx = Math.round((e.clientX - drag.startX) / scale);
    const dy = Math.round((e.clientY - drag.startY) / scale);
    if (dx === 0 && dy === 0 && !drag.moved) {
      return;
    }
    drag.moved = true;
    setDraggingKey(drag.key);

    // Keep a corner of it in the editor, so it can always be grabbed again
    const { rect } = drag.state;
    const corner = {
      x: Math.min(
        Math.max(rect.x + dx, -MARGIN - rect.w + KEEP_INSIDE),
        CANVAS.width + MARGIN - KEEP_INSIDE,
      ),
      y: Math.min(
        Math.max(rect.y + dy, -MARGIN - rect.h + KEEP_INSIDE),
        CANVAS.height + MARGIN - KEEP_INSIDE,
      ),
    };
    onMove(drag.state, valuesForCorner(drag.state, corner));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDraggingKey(null);
  };

  const onItemKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    state: WidgetState,
  ) => {
    if (disabled) {
      return;
    }

    const step = e.shiftKey ? 8 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };

    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      onMove(state, valuesAfterMove(state, dx, dy));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (state.def.ids.show !== undefined) {
        e.preventDefault();
        onHide(state);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(state.def.key);
    } else if (e.key === "Escape") {
      onSelect(null);
    }
  };

  const dragTypes = (e: DragEvent<HTMLDivElement>) =>
    disabled ? [] : Array.from(e.dataTransfer.types);

  /** A chip of the tray, or a picture when this screen is the one that plays it. */
  const takes = (e: DragEvent<HTMLDivElement>) => {
    const types = dragTypes(e);
    return (
      types.includes(DRAG_WIDGET_MIME) ||
      (onDropKind !== undefined && types.includes(DRAG_KIND_MIME))
    );
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (takes(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = dragTypes(e).includes(DRAG_KIND_MIME)
        ? "copy"
        : "move";
      setDropping(true);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    setDropping(false);
    const bounds = areaRef.current?.getBoundingClientRect();
    if (!bounds || !takes(e)) {
      return;
    }

    const point = {
      x: Math.round((e.clientX - bounds.left) / scale - MARGIN),
      y: Math.round((e.clientY - bounds.top) / scale - MARGIN),
    };
    const key = e.dataTransfer.getData(DRAG_WIDGET_MIME);
    const kind = Number(e.dataTransfer.getData(DRAG_KIND_MIME));

    if (key) {
      e.preventDefault();
      onDropChip(key, point);
    } else if (onDropKind && Number.isInteger(kind)) {
      e.preventDefault();
      onDropKind(kind, point);
    }
  };

  const windowStyle = {
    left: px(WINDOW.x),
    top: px(WINDOW.y),
    width: WINDOW.width * scale,
    height: WINDOW.height * scale,
  };

  return (
    <div
      ref={areaRef}
      data-screen={screen}
      className={`relative select-none overflow-hidden rounded ${
        dropping ? "outline outline-2 outline-dashed outline-primary" : ""
      }`}
      style={{ ...area, background: "#0a0f16" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onSelect(null);
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDropping(false);
        }
      }}
      onDrop={onDrop}
    >
      {/* The canvas the widgets are drawn on */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          left: px(0),
          top: px(0),
          width: CANVAS.width * scale,
          height: CANVAS.height * scale,
          background: "#101822",
          outline: "1px dashed rgba(180,200,220,0.35)",
        }}
      />

      {/* What the panel shows */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          ...windowStyle,
          background: PANEL_COLOR,
          boxShadow: "0 0 0 2px #8fb0d0",
          backgroundImage: grid
            ? `linear-gradient(to right, rgba(143,176,208,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,176,208,0.14) 1px, transparent 1px)`
            : undefined,
          backgroundSize: grid ? `${8 * scale}px ${8 * scale}px` : undefined,
        }}
      />

      {/* Rulers, in pixels of the canvas */}
      {TICKS_X.map((x) => (
        <span
          key={`x${x}`}
          aria-hidden="true"
          className="absolute -translate-x-1/2 text-[10px] leading-none tabular-nums opacity-60"
          style={{ left: px(x), top: 4 }}
        >
          {x}
        </span>
      ))}
      {TICKS_Y.map((y) => (
        <span
          key={`y${y}`}
          aria-hidden="true"
          className="absolute -translate-y-1/2 text-[10px] leading-none tabular-nums opacity-60"
          style={{ left: 3, top: px(y) }}
        >
          {y}
        </span>
      ))}

      {/* The widgets */}
      {shown.map((state) => {
        const selected = state.def.key === selectedKey;
        const dragging = state.def.key === draggingKey;
        const w = state.rect.w * scale;
        const h = state.rect.h * scale;
        const padX = Math.max(0, Math.ceil((MIN_HIT - w) / 2));
        const padY = Math.max(0, Math.ceil((MIN_HIT - h) / 2));

        return (
          <div
            key={state.def.key}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={selected}
            aria-label={describe(state)}
            aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown Delete"
            className={`absolute rounded-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected
                ? "ring-2 ring-primary"
                : "ring-1 ring-white/25 hover:bg-white/10"
            }`}
            style={{
              left: px(state.rect.x) - padX,
              top: px(state.rect.y) - padY,
              width: w + 2 * padX,
              height: h + 2 * padY,
              zIndex: drawOrder(state),
              cursor: disabled ? "default" : dragging ? "grabbing" : "grab",
              touchAction: "none",
              opacity: state.muted ? 0.5 : 1,
              background: selected ? "rgba(143,160,255,0.2)" : undefined,
            }}
            onPointerDown={(e) => startDrag(e, state)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(e) => onItemKeyDown(e, state)}
          >
            <div className="absolute" style={{ left: padX, top: padY }}>
              <WidgetArt
                parts={state.parts}
                box={state.box}
                scale={scale}
                frame={frame}
              />
            </div>
            {selected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 whitespace-nowrap rounded bg-primary px-1 text-[10px] leading-4 text-primary-content"
                style={{ top: -18 }}
              >
                {state.rect.w} x {state.rect.h} px
              </span>
            )}
          </div>
        );
      })}

      {/* Dims what the panel does not show; above the widgets, below nothing else */}
      {(
        [
          { left: 0, top: 0, width: area.width, height: px(WINDOW.y) },
          {
            left: 0,
            top: px(WINDOW.y + WINDOW.height),
            width: area.width,
            height: area.height - px(WINDOW.y + WINDOW.height),
          },
          {
            left: 0,
            top: px(WINDOW.y),
            width: px(WINDOW.x),
            height: WINDOW.height * scale,
          },
          {
            left: px(WINDOW.x + WINDOW.width),
            top: px(WINDOW.y),
            width: area.width - px(WINDOW.x + WINDOW.width),
            height: WINDOW.height * scale,
          },
        ] as const
      ).map((style, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            ...style,
            zIndex: 4,
            background:
              "repeating-linear-gradient(135deg, rgba(5,8,13,0.72) 0 6px, rgba(5,8,13,0.58) 6px 12px)",
          }}
        />
      ))}

      {/* A pixel of the border of the window, over the dimming */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          ...windowStyle,
          zIndex: 5,
          boxShadow: `0 0 0 2px ${LIT_COLOR}55`,
        }}
      />
    </div>
  );
};
