/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The editor of the piece of the picture that shows: the picture as it is turned,
 * with a frame around the piece. Drag inside the frame to move it, drag an edge
 * or a corner to resize it, drag outside it to draw a new one. The four numbers
 * do the same with the keyboard. The picture does not move when the piece does:
 * the screen shows the pixels inside the frame where they are, and the rest is
 * hidden.
 */
import { useRef, useState, type PointerEvent } from "react";
import { LocateFixed, Maximize } from "lucide-react";
import { NumberField } from "./NumberField";
import type { WidgetState } from "./oledLayout";
import {
  clampCrop,
  cropBetween,
  cropHandleAt,
  dragCrop,
  type Crop,
  type CropHandle,
} from "./pictureView";
import { PANEL_COLOR, WidgetArt } from "./PixelArt";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

/** The widest and the tallest the editor draws the picture, in screen pixels. */
const MAX_WIDTH = 300;
const MAX_HEIGHT = 340;

/** How close to an edge, in screen pixels, a pointer takes hold of it. */
const GRAB = 7;

const CURSORS: Record<CropHandle, string> = {
  move: "move",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

type Drag =
  | { type: "handle"; handle: CropHandle; start: Crop; x: number; y: number }
  | { type: "new"; anchor: { x: number; y: number }; started: boolean };

interface Props {
  /** The picture of the right screen. */
  state: WidgetState;
  frame: number;
  disabled: boolean;
  /** A piece to show; null for the whole picture. */
  onCrop: (crop: Crop | null) => void;
  /** Put the piece in the middle of the strip the panel shows. */
  onCenter: () => void;
}

export const PictureCrop = ({
  state,
  frame,
  disabled,
  onCrop,
  onCenter,
}: Props) => {
  const { picture } = state;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hover, setHover] = useState<CropHandle | null>(null);

  if (!picture) {
    return null;
  }

  const { shape, piece, crop } = picture;
  const zoom = Math.max(
    1,
    Math.min(6, Math.floor(MAX_WIDTH / shape.w), Math.floor(MAX_HEIGHT / shape.h)),
  );
  const slop = Math.max(0.75, GRAB / zoom);

  /** The pointer in pixels of the picture, fractions included. */
  const pointOf = (e: PointerEvent<HTMLDivElement>) => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    return {
      x: bounds ? (e.clientX - bounds.left) / zoom : 0,
      y: bounds ? (e.clientY - bounds.top) / zoom : 0,
    };
  };

  /** What the pointer would take hold of; a picture that is whole has no piece to move. */
  const handleAt = (p: { x: number; y: number }): CropHandle | null => {
    const handle = cropHandleAt(piece, p.x, p.y, slop);
    return handle === "move" && !crop ? null : handle;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || disabled) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone: the drag follows the events of the editor alone
    }

    const p = pointOf(e);
    const handle = handleAt(p);
    dragRef.current = handle
      ? { type: "handle", handle, start: piece, x: p.x, y: p.y }
      : {
          type: "new",
          anchor: {
            x: Math.min(Math.max(Math.floor(p.x), 0), shape.w - 1),
            y: Math.min(Math.max(Math.floor(p.y), 0), shape.h - 1),
          },
          started: false,
        };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointOf(e);
    const drag = dragRef.current;
    if (!drag) {
      setHover(disabled ? null : handleAt(p));
      return;
    }

    if (drag.type === "handle") {
      onCrop(
        dragCrop(
          drag.handle,
          drag.start,
          Math.round(p.x - drag.x),
          Math.round(p.y - drag.y),
          shape,
        ),
      );
      return;
    }

    const at = {
      x: Math.min(Math.max(Math.floor(p.x), 0), shape.w - 1),
      y: Math.min(Math.max(Math.floor(p.y), 0), shape.h - 1),
    };
    // A click outside the piece does not start a new one: the pointer has to move
    if (!drag.started && at.x === drag.anchor.x && at.y === drag.anchor.y) {
      return;
    }
    drag.started = true;
    onCrop(cropBetween(drag.anchor, at, shape));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const commit = (field: keyof Crop, value: number) =>
    onCrop(clampCrop({ ...piece, [field]: value }, shape));

  const hx = [piece.x, piece.x + piece.w / 2, piece.x + piece.w];
  const hy = [piece.y, piece.y + piece.h / 2, piece.y + piece.h];

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={surfaceRef}
        role="group"
        aria-label={`The picture, ${shape.w} by ${shape.h} pixels, with a frame around the piece that shows`}
        className="relative select-none self-start overflow-hidden rounded"
        style={{
          width: shape.w * zoom,
          height: shape.h * zoom,
          background: PANEL_COLOR,
          outline: "1px solid rgba(143,176,208,0.4)",
          touchAction: "none",
          cursor: disabled ? "default" : hover ? CURSORS[hover] : "crosshair",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHover(null)}
      >
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0">
          <WidgetArt
            parts={state.parts}
            box={state.box}
            scale={zoom}
            frame={frame}
          />
        </div>

        {/* The frame; what is outside it is dimmed when the picture is cut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: piece.x * zoom,
            top: piece.y * zoom,
            width: piece.w * zoom,
            height: piece.h * zoom,
            boxShadow: crop ? "0 0 0 9999px rgba(5,8,13,0.72)" : undefined,
            outline: `2px ${crop ? "solid" : "dashed"} #8fa0ff`,
            outlineOffset: -1,
          }}
        />

        {crop &&
          hy.flatMap((y, row) =>
            hx.map((x, column) =>
              row === 1 && column === 1 ? null : (
                <span
                  key={`${row}${column}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-[1px] bg-white"
                  style={{
                    left: x * zoom - 3,
                    top: y * zoom - 3,
                    width: 6,
                    height: 6,
                    boxShadow: "0 0 0 1px #8fa0ff",
                  }}
                />
              ),
            ),
          )}
      </div>

      <p className="opacity-70">
        Drag inside the frame to move it, drag an edge or a corner to resize it,
        and drag outside it to draw a new one. The picture stays where it is on
        the screen: only what is inside the frame shows.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label="X"
          hint="Left edge of the piece, in pixels of the picture as it is turned"
          value={piece.x}
          min={0}
          max={Math.max(shape.w - 1, 0)}
          disabled={disabled}
          onCommit={(value) => commit("x", value)}
        />
        <NumberField
          label="Y"
          hint="Top edge of the piece, in pixels of the picture as it is turned"
          value={piece.y}
          min={0}
          max={Math.max(shape.h - 1, 0)}
          disabled={disabled}
          onCommit={(value) => commit("y", value)}
        />
        <NumberField
          label="Width"
          hint="Width of the piece, in pixels"
          value={piece.w}
          min={1}
          max={Math.max(shape.w - piece.x, 1)}
          disabled={disabled}
          onCommit={(value) => commit("w", value)}
        />
        <NumberField
          label="Height"
          hint="Height of the piece, in pixels"
          value={piece.h}
          min={1}
          max={Math.max(shape.h - piece.y, 1)}
          disabled={disabled}
          onCommit={(value) => commit("h", value)}
        />
      </div>

      <p className="opacity-70 tabular-nums">
        {crop
          ? `Piece of ${piece.w} x ${piece.h} px, out of ${shape.w} x ${shape.h}.`
          : `The whole picture shows: ${shape.w} x ${shape.h} px.`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={BUTTON}
          disabled={disabled || !crop}
          onClick={() => onCrop(null)}
        >
          <Maximize className="w-4" aria-hidden="true" />
          Whole picture
        </button>
        <button
          type="button"
          className={BUTTON}
          disabled={disabled}
          onClick={onCenter}
        >
          <LocateFixed className="w-4" aria-hidden="true" />
          Center on the screen
        </button>
      </div>
    </div>
  );
};
