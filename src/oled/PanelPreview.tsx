/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The panel as it looks on the keyboard: 128 x 32 pixels, landscape. The widgets
 * are drawn upright on the canvas and the panel shows the strip of it that the
 * editor lights, turned a quarter of a turn clockwise, so what the editor calls
 * the top of the screen is on the right here. The widgets that are hidden, and
 * the toast while it is turned off, are not drawn.
 */
import { PANEL, WINDOW } from "./oledGeometry";
import { drawOrder, type WidgetState } from "./oledLayout";
import { PANEL_COLOR, WidgetArt } from "./PixelArt";

interface Props {
  widgets: WidgetState[];
  /** Screen pixels per pixel of the OLED. */
  scale: number;
  /** The frame of the picture of the right screen. */
  frame: number;
}

export const PanelPreview = ({ widgets, scale, frame }: Props) => {
  const drawn = widgets
    .filter((w) => w.shown && !w.muted)
    .sort((a, b) => drawOrder(a) - drawOrder(b));

  return (
    <div
      role="img"
      aria-label="The panel as it looks on the keyboard, 128 by 32 pixels, turned sideways"
      className="relative shrink-0 overflow-hidden rounded"
      style={{
        width: PANEL.width * scale,
        height: PANEL.height * scale,
        background: PANEL_COLOR,
        boxShadow: "0 0 0 2px #8fb0d0",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: WINDOW.width * scale,
          height: WINDOW.height * scale,
          transform: `translateX(${PANEL.width * scale}px) rotate(90deg)`,
        }}
      >
        {drawn.map((state) => (
          <div
            key={state.def.key}
            className="absolute"
            style={{
              left: (state.rect.x - WINDOW.x) * scale,
              top: (state.rect.y - WINDOW.y) * scale,
              // The toast only shows for a moment
              opacity: state.def.key === "r_toast" ? 0.6 : 1,
            }}
          >
            <WidgetArt
              parts={state.parts}
              box={state.box}
              scale={scale}
              frame={frame}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
