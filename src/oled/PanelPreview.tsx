/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The screen as it looks on the keyboard: 32 x 128 pixels, standing up, the way
 * it is read. The panel itself is 128 x 32 and is mounted so that it is read
 * upright, so this is the strip of the canvas that the editor lights, as it is.
 * The view can be turned by quarter turns (to look at it the way the panel is
 * wired, for instance); that turns only the drawing, never the widgets. The
 * widgets that are hidden, and the toast while it is turned off, are not drawn.
 */
import { ScreenArt } from "./ArtLayers";
import { WINDOW } from "./oledGeometry";
import type { WidgetState } from "./oledLayout";
import { normalizeTurn, turnTransform } from "./pictureView";
import { PANEL_COLOR } from "./PixelArt";

interface Props {
  widgets: WidgetState[];
  /** Screen pixels per pixel of the OLED. */
  scale: number;
  /** The frame of the picture of the right screen. */
  frame: number;
  /** Quarter turns clockwise of the view; the widgets are not turned by it. */
  turn: number;
}

export const PanelPreview = ({ widgets, scale, frame, turn }: Props) => {
  const drawn = widgets.filter((w) => w.shown && !w.muted);
  const quarter = normalizeTurn(turn);
  const width = WINDOW.width * scale;
  const height = WINDOW.height * scale;
  const sideways = quarter % 2 === 1;
  const box = sideways ? { w: height, h: width } : { w: width, h: height };
  const pixels = sideways
    ? `${WINDOW.height} by ${WINDOW.width}`
    : `${WINDOW.width} by ${WINDOW.height}`;

  return (
    <div
      role="img"
      aria-label={`The screen as it looks on the keyboard, ${pixels} pixels${
        quarter === 0 ? "" : `, the view turned ${quarter * 90} degrees clockwise`
      }`}
      className="relative shrink-0 overflow-hidden rounded"
      style={{
        width: box.w,
        height: box.h,
        background: PANEL_COLOR,
        boxShadow: "0 0 0 2px #8fb0d0",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 origin-top-left"
        style={{ width, height, transform: turnTransform(quarter, width, height) }}
      >
        <ScreenArt
          widgets={drawn}
          scale={scale}
          frame={frame}
          origin={{ x: WINDOW.x, y: WINDOW.y }}
          size={{ w: WINDOW.width, h: WINDOW.height }}
          variant="preview"
        />
      </div>
    </div>
  );
};
