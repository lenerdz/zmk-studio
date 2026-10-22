/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * One screen in the OLED tab: its name, the panel as it looks on the keyboard
 * (first, so it stays in sight while a widget is dragged in the editor below it),
 * the editor, and the widgets that are hidden.
 */
import { RotateCcw } from "lucide-react";
import { HiddenTray } from "./HiddenTray";
import { PanelPreview } from "./PanelPreview";
import { ScreenEditor } from "./ScreenEditor";
import { SCREEN_ROLES, SCREEN_TITLES, type ScreenId } from "./oledCatalog";
import { WINDOW } from "./oledGeometry";
import { widgetsOfScreen, type WidgetState } from "./oledLayout";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

interface Props {
  screen: ScreenId;
  /** Every widget of the catalog, with what the keyboard says about it. */
  states: WidgetState[];
  selectedKey: string | null;
  scale: number;
  grid: boolean;
  frame: number;
  /** A restore is going on. */
  busy: boolean;
  /** Every widget of the screen is as the build had it. */
  atDefaults: boolean;
  onSelect: (key: string | null) => void;
  onMove: (state: WidgetState, values: { x: number; y: number }) => void;
  onHide: (state: WidgetState) => void;
  onShow: (state: WidgetState) => void;
  onDropChip: (key: string, point: { x: number; y: number }) => void;
  onDropKind: (kind: number, point: { x: number; y: number }) => void;
  onReset: (screen: ScreenId) => void;
}

export const ScreenPanel = ({
  screen,
  states,
  selectedKey,
  scale,
  grid,
  frame,
  busy,
  atDefaults,
  onSelect,
  onMove,
  onHide,
  onShow,
  onDropChip,
  onDropKind,
  onReset,
}: Props) => {
  const widgets = widgetsOfScreen(states, screen);
  const hidden = widgets.filter(
    (w) => !w.shown && w.def.ids.show !== undefined,
  );
  const title = SCREEN_TITLES[screen];

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded bg-base-200 p-3"
    >
      <header className="flex flex-col">
        <h3 className="font-semibold">{title}</h3>
        <p className="opacity-70">{SCREEN_ROLES[screen]}</p>
      </header>

      {widgets.length === 0 ? (
        <p className="max-w-xs opacity-70">
          This firmware has no widget with a place of its own on this screen.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold">As it looks on the keyboard</h4>
            <PanelPreview
              widgets={widgets}
              scale={scale >= 4 ? 3 : 2}
              frame={frame}
            />
            <p className="max-w-[22rem] opacity-70">
              128 x 32 px, the panel as it is mounted: the screen below, turned
              a quarter of a turn clockwise.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="font-semibold">The screen, upright</h4>
            <ScreenEditor
              screen={screen}
              widgets={widgets}
              selectedKey={selectedKey}
              scale={scale}
              grid={grid}
              frame={frame}
              disabled={busy}
              onSelect={onSelect}
              onMove={onMove}
              onHide={onHide}
              onDropChip={onDropChip}
              onDropKind={
                widgets.some((w) => w.def.placement === "picture")
                  ? onDropKind
                  : undefined
              }
            />
            <p className="max-w-[22rem] opacity-70">
              The lit strip is what the panel shows: {WINDOW.width} x{" "}
              {WINDOW.height} px, from the row {WINDOW.y} of the canvas down.
              The dimmed part is on the canvas only. The numbers on the edges
              are pixels of the canvas.
            </p>
          </div>

          <HiddenTray
            widgets={hidden}
            disabled={busy}
            frame={frame}
            onShow={onShow}
          />

          <div>
            <button
              type="button"
              className={BUTTON}
              disabled={busy || atDefaults}
              onClick={() => onReset(screen)}
            >
              <RotateCcw className="w-4" aria-hidden="true" />
              Put this screen back as built
            </button>
          </div>
        </>
      )}
    </section>
  );
};
