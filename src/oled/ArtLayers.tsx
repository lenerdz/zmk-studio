/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The widgets of a screen drawn together, the way the firmware puts them on the
 * canvas: the picture of the right screen is cut to its piece, and when it mixes
 * with the widgets in reverse (the setting 113), a lit pixel of the picture flips
 * what is under it, so a widget over the picture shows in reverse. The browser
 * does that with a "difference" blend, which flips a pixel between two colors:
 * the layers of one screen are siblings in a group of their own (isolate), so the
 * blend sees the layers and nothing else.
 */
import type { CSSProperties } from "react";
import type { WidgetState } from "./oledLayout";
import { MIX_INVERT } from "./pictureView";
import { WidgetArt } from "./PixelArt";

/**
 * The order the layers are painted in: the widgets (the toast too: the firmware
 * writes it on the canvas like the others), then the picture, which the firmware
 * puts on the canvas last and which can reverse what is under it, so it has to
 * come after what it reverses. The widgets keep the order of the catalog (the
 * sort is stable).
 */
function paintOrder(widgets: WidgetState[]): WidgetState[] {
  const rank = (state: WidgetState) =>
    state.def.placement === "picture" ? 1 : 0;

  return [...widgets].sort((a, b) => rank(a) - rank(b));
}

interface PieceProps {
  state: WidgetState;
  scale: number;
  frame: number;
}

/**
 * A widget as it shows: its parts, and for a picture that is cut only the piece
 * of it that shows.
 */
export const WidgetPiece = ({ state, scale, frame }: PieceProps) => {
  const art = (
    <WidgetArt
      parts={state.parts}
      box={state.box}
      scale={scale}
      frame={frame}
    />
  );
  const crop = state.picture?.crop ?? null;

  if (!crop) {
    return art;
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: crop.w * scale, height: crop.h * scale }}
    >
      <div
        className="absolute"
        style={{ left: -crop.x * scale, top: -crop.y * scale }}
      >
        {art}
      </div>
    </div>
  );
};

interface LayerProps extends PieceProps {
  /** The point of the canvas that is the top left corner of the group. */
  origin: { x: number; y: number };
  opacity?: number;
  /** Draw the whole picture, not only the piece: the ghost of what the crop hides. */
  ghost?: boolean;
}

/** One widget of the screen, in its place, with the mix of the picture. */
export const ArtLayer = ({
  state,
  scale,
  frame,
  origin,
  opacity,
  ghost = false,
}: LayerProps) => {
  const { picture } = state;
  const rect = ghost && picture ? picture.whole : state.rect;
  const style: CSSProperties = {
    left: (rect.x - origin.x) * scale,
    top: (rect.y - origin.y) * scale,
    opacity,
  };

  if (!ghost && picture?.mix === MIX_INVERT) {
    style.mixBlendMode = "difference";
  }

  return (
    <div className="absolute" style={style}>
      {ghost ? (
        <WidgetArt
          parts={state.parts}
          box={state.box}
          scale={scale}
          frame={frame}
        />
      ) : (
        <WidgetPiece state={state} scale={scale} frame={frame} />
      )}
    </div>
  );
};

interface Props {
  /** The widgets to draw (the ones the screen shows). */
  widgets: WidgetState[];
  scale: number;
  frame: number;
  /** The point of the canvas that is the top left corner of the group. */
  origin: { x: number; y: number };
  /** The size of the group, in pixels of the canvas. */
  size: { w: number; h: number };
  /**
   * The editor dims a toast that is turned off; the preview draws the toast a
   * little pale, as it only shows for a moment.
   */
  variant: "editor" | "preview";
  /** The widget whose picture is also drawn whole and dim, under the piece that shows. */
  ghostKey?: string | null;
}

/** The widgets of a screen, painted in order inside a group that blends only among them. */
export const ScreenArt = ({
  widgets,
  scale,
  frame,
  origin,
  size,
  variant,
  ghostKey = null,
}: Props) => {
  const ghosts = widgets.filter(
    (state) => state.def.key === ghostKey && state.picture?.crop,
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 isolate overflow-hidden"
      style={{ width: size.w * scale, height: size.h * scale, zIndex: 1 }}
    >
      {ghosts.map((state) => (
        <ArtLayer
          key={`ghost-${state.def.key}`}
          state={state}
          scale={scale}
          frame={frame}
          origin={origin}
          opacity={0.3}
          ghost
        />
      ))}
      {paintOrder(widgets).map((state) => {
        const toast = state.def.key === "r_toast";
        const opacity =
          variant === "preview"
            ? toast
              ? 0.6
              : 1
            : state.muted
              ? 0.5
              : 1;

        return (
          <ArtLayer
            key={state.def.key}
            state={state}
            scale={scale}
            frame={frame}
            origin={origin}
            opacity={opacity}
          />
        );
      })}
    </div>
  );
};
