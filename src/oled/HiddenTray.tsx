/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The widgets of a screen that are not drawn, as chips: click one to show it, or
 * drag it onto the screen to show it where it is dropped (ScreenEditor takes the
 * drop).
 */
import { DRAG_WIDGET_MIME } from "./dragTypes";
import type { WidgetState } from "./oledLayout";
import { WidgetArt } from "./PixelArt";

interface Props {
  widgets: WidgetState[];
  /** A restore is going on. */
  disabled: boolean;
  frame: number;
  onShow: (state: WidgetState) => void;
}

export const HiddenTray = ({ widgets, disabled, frame, onShow }: Props) => (
  <div className="flex flex-col gap-1">
    <h4 className="font-semibold">Hidden widgets</h4>
    {widgets.length === 0 ? (
      <p className="max-w-[22rem] opacity-70">
        Every widget of this screen is on it. Press Delete on a selected widget,
        or turn its switch off, to put it here.
      </p>
    ) : (
      <ul className="flex flex-wrap gap-2">
        {widgets.map((state) => (
          <li key={state.def.key}>
            <button
              type="button"
              draggable={!disabled}
              disabled={disabled}
              title="Click to show it, or drag it onto the screen"
              className="flex items-center gap-2 rounded bg-base-100 p-1 pr-2 text-left hover:bg-base-300 disabled:opacity-50"
              onClick={() => onShow(state)}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_WIDGET_MIME, state.def.key);
                e.dataTransfer.setData("text/plain", state.def.label);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <span
                aria-hidden="true"
                className="grid shrink-0 place-items-start overflow-hidden rounded"
                style={{
                  width: Math.min(state.box.w, 48),
                  height: Math.min(state.box.h, 24),
                  background: "#04070c",
                }}
              >
                <WidgetArt
                  parts={state.parts}
                  box={state.box}
                  scale={1}
                  frame={frame}
                />
              </span>
              <span>{state.def.label}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
