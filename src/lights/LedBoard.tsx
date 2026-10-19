/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Draws the LEDs of a light map on the keyboard: each key LED on its key, the
 * other LEDs (the underglow) as round cells, every cell filled with the color
 * the LED has. Dragging with the pointer across the cells reports the slots it
 * went over, so a whole stroke can be applied as one edit.
 */
import {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { LayoutZoom } from "../keyboard/PhysicalLayout";
import { contrastColor, paletteName, rgbToHex } from "./ledColors";
import type { LedSlotView } from "./ledLayout";

export interface LedBoardProps {
  slots: LedSlotView[];
  /** The color (0xRRGGBB) of every slot, as shown. */
  colors: number[];
  /** What to draw inside a cell (the label of the key), by slot. */
  labels?: Record<number, ReactNode>;
  oneU?: number;
  zoom: LayoutZoom;
  /** The pointer picks colors instead of painting; only changes the cursor. */
  picking?: boolean;
  /** The first cell of a stroke was pressed. */
  onStrokeStart: (slot: number) => void;
  /** The pointer went over another cell during the stroke. */
  onStrokeMove: (slot: number) => void;
  /** The stroke ended; `slots` are the cells it went over, in order. */
  onStrokeEnd: (slots: number[]) => void;
}

function cellStyle(slot: LedSlotView, oneU: number): CSSProperties {
  const style: CSSProperties = {
    left: slot.x * oneU,
    top: slot.y * oneU,
    width: slot.width * oneU - 2,
    height: slot.height * oneU - 2,
  };

  if (slot.r) {
    // The same rotation the keys of the Keys tab have: around (rx, ry), which are
    // positions in the layout, so relative to the cell they are rx - x, ry - y.
    const originX = ((slot.rx ?? slot.x) - slot.x) * oneU;
    const originY = ((slot.ry ?? slot.y) - slot.y) * oneU;
    style.transformOrigin = `${originX}px ${originY}px`;
    style.transform = `rotate(${slot.r}deg)`;
  }

  return style;
}

/** The slot of the cell under a point of the screen, if there is one. */
function slotAt(clientX: number, clientY: number): number | undefined {
  const cell = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>("[data-led-slot]");

  return cell ? Number(cell.dataset.ledSlot) : undefined;
}

export const LedBoard = ({
  slots,
  colors,
  labels,
  oneU = 48,
  zoom,
  picking = false,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: LedBoardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const stroke = useRef<number[] | null>(null);

  // Same scaling as the keyboard of the Keys tab.
  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;

    const calculateScale = () => {
      if (zoom === "auto") {
        const padding = Math.min(window.innerWidth, window.innerHeight) * 0.05;
        setScale(
          Math.min(
            parent.clientWidth / (element.clientWidth + 2 * padding),
            parent.clientHeight / (element.clientHeight + 2 * padding),
          ),
        );
      } else {
        setScale(zoom || 1);
      }
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(element);
    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, [zoom]);

  const width = Math.max(0, ...slots.map((s) => s.x + s.width)) * oneU;
  const height = Math.max(0, ...slots.map((s) => s.y + s.height)) * oneU;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const slot = slotAt(e.clientX, e.clientY);
    if (slot === undefined) return;

    // Keep receiving the moves when the pointer leaves the board. Not every
    // pointer can be captured; the stroke works without it, inside the board.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignored on purpose
    }
    stroke.current = [slot];
    onStrokeStart(slot);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!stroke.current) return;

    const slot = slotAt(e.clientX, e.clientY);
    if (slot === undefined || stroke.current.includes(slot)) return;

    stroke.current = [...stroke.current, slot];
    onStrokeMove(slot);
  };

  const endStroke = (e: PointerEvent<HTMLDivElement>) => {
    const slotsOfStroke = stroke.current;
    if (!slotsOfStroke) return;

    stroke.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignored on purpose
    }
    onStrokeEnd(slotsOfStroke);
  };

  // From the keyboard: Enter or Space acts on the focused cell like a click.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;

    const slot = (e.target as HTMLElement).dataset.ledSlot;
    if (slot === undefined) return;

    e.preventDefault();
    onStrokeStart(Number(slot));
    onStrokeEnd([Number(slot)]);
  };

  return (
    <div
      ref={ref}
      className={`absolute left-1/2 top-1/2 select-none touch-none ${
        picking ? "cursor-cell" : "cursor-crosshair"
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        // Centered in the area whatever its size: the drawing is scaled around
        // its own center, so it stays centered when it is scaled down to fit.
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onKeyDown={onKeyDown}
    >
      {slots.map((slot) => {
        const rgb = colors[slot.slot] ?? 0;

        return (
          <div
            key={slot.slot}
            role="button"
            tabIndex={0}
            data-led-slot={slot.slot}
            aria-label={`${slot.label}: ${paletteName(rgb) ?? rgbToHex(rgb)}`}
            title={`${slot.label}: ${paletteName(rgb) ?? rgbToHex(rgb)}`}
            className={`absolute flex items-center justify-center overflow-hidden ring-1 ring-inset ring-gray-500 hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary outline-none ${
              slot.kind === "extra" ? "rounded-full" : "rounded"
            }`}
            style={{
              ...cellStyle(slot, oneU),
              backgroundColor: rgbToHex(rgb),
              color: contrastColor(rgb),
            }}
          >
            {slot.kind === "extra" ? (
              <span className="text-[0.6rem] opacity-80 pointer-events-none">
                {slot.short}
              </span>
            ) : (
              // BindingLabel leaves room for the header the Keys tab writes
              // above the label; there is none here.
              <div className="pointer-events-none flex items-center justify-center w-full h-full [&>div]:!mt-0">
                {labels?.[slot.slot]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
