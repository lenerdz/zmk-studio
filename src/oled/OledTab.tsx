/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The OLED tab: what each OLED screen of the keyboard shows and where. The two
 * screens are drawn upright with the strip the panel shows lit, every widget of
 * zmk-nice-oled that the firmware lets the app move is a thing to drag, the
 * hidden ones wait in a tray, the right screen has a gallery of pictures, and
 * what only a new build adds is listed. Like the Display tab, every change goes
 * to the keyboard at once and the keyboard keeps it by itself: nothing to save.
 */
import { useContext, useMemo, useState, type ReactNode } from "react";
import { DisplayContext } from "../display/DisplayContext";
import { SPRITES } from "./assets/sprites";
import { AnimationGallery } from "./AnimationGallery";
import { OledInspector } from "./OledInspector";
import { prefersReducedMotion, useFrame } from "./useFrame";
import { ScreenPanel } from "./ScreenPanel";
import {
  ANIMATION_KINDS,
  widgetsOf,
  type ScreenId,
  type WidgetDef,
} from "./oledCatalog";
import { OLED_ID } from "./oledIds";
import {
  hasOledLayout,
  pictureOf,
  resetChanges,
  selectableKinds,
  valuesForCenter,
  valuesForPicture,
  valuesForShowing,
  widgetStates,
  widgetsAreDefault,
  type WidgetState,
} from "./oledLayout";
import { Possibilities } from "./Possibilities";

const ZOOMS = [2, 3, 4, 5] as const;

/** The left half is the one on the left of the keyboard, so its screen comes first. */
const SCREENS: ScreenId[] = ["left", "right"];

const Notice = ({ children }: { children: ReactNode }) => (
  <div className="grid place-items-center bg-base-300 min-h-0 min-w-0 p-6 text-center">
    <div className="max-w-prose">{children}</div>
  </div>
);

export const OledTab = () => {
  const display = useContext(DisplayContext);
  const { settings, busy, setValue } = display;

  const [scale, setScale] = useState<number>(3);
  const [grid, setGrid] = useState(true);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const states = useMemo(() => widgetStates(settings), [settings]);
  const picture = pictureOf(settings);
  const frame = useFrame(
    SPRITES[picture.kind.sprite].frames,
    picture.cycleMs,
    playing,
  );
  const selected =
    states.find((s) => s.def.key === selectedKey && s.present) ?? null;

  if (display.status === "idle") {
    return <Notice>Unlock the keyboard to see and change its screens.</Notice>;
  }

  if (display.status === "loading") {
    return <Notice>Reading the screens from the keyboard...</Notice>;
  }

  if (display.status === "unsupported" || display.status === "error") {
    return (
      <Notice>
        The OLED layout could not be read from the keyboard
        {display.error ? `: ${display.error}` : "."}
      </Notice>
    );
  }

  if (!hasOledLayout(settings)) {
    return (
      <Notice>
        This firmware has screen settings but not the OLED layout. It comes with
        the zmk-rgb-matrix module of lenerdz (option CONFIG_KEYPAW_OLED_LAYOUT)
        and the zmk-nice-oled fork, built into both halves (see the README of
        this app).
      </Notice>
    );
  }

  const move = (state: WidgetState, values: { x: number; y: number }) => {
    setValue(state.def.ids.x, values.x);
    setValue(state.def.ids.y, values.y);
  };

  const hide = (state: WidgetState) => {
    if (state.def.ids.show !== undefined) {
      setValue(state.def.ids.show, 0);
    }
  };

  const show = (state: WidgetState) => {
    const { show: showId, x, y } = state.def.ids;
    if (showId === undefined) {
      return;
    }

    // Where it was, or where the panel shows it when it was outside
    const values = valuesForShowing(state);
    setValue(x, values.x);
    setValue(y, values.y);
    setValue(showId, 1);
    setSelectedKey(state.def.key);
  };

  const dropChip = (key: string, point: { x: number; y: number }) => {
    const state = states.find((s) => s.def.key === key && s.present);
    const showId = state?.def.ids.show;
    if (!state || showId === undefined) {
      return;
    }

    const values = valuesForCenter(state, point);
    setValue(state.def.ids.x, values.x);
    setValue(state.def.ids.y, values.y);
    setValue(showId, 1);
    setSelectedKey(key);
  };

  const dropKind = (kind: number, point: { x: number; y: number }) => {
    const target = states.find(
      (s) => s.def.placement === "picture" && s.present,
    );
    const values = valuesForPicture(settings, kind, point);
    const kindId = target?.def.ids.kind;
    if (!target || !values || kindId === undefined) {
      return;
    }

    // The picture lands centered on the drop, whatever size it has
    setValue(kindId, values.kind);
    setValue(target.def.ids.x, values.x);
    setValue(target.def.ids.y, values.y);
    if (target.def.ids.show !== undefined && !target.shown) {
      setValue(target.def.ids.show, 1);
    }
    setSelectedKey(target.def.key);
  };

  const setShown = (state: WidgetState, shown: boolean) =>
    shown ? show(state) : hide(state);

  const reset = (defs: WidgetDef[]) => {
    for (const { id, value } of resetChanges(settings, defs)) {
      setValue(id, value);
    }
  };

  const defsOf = (screen: ScreenId) =>
    widgetsOf(screen).filter((def) =>
      settings.some((setting) => setting.id === def.ids.x),
    );

  const selectable = selectableKinds(settings, ANIMATION_KINDS).map(
    (kind) => kind.value,
  );
  const msSetting = settings.find((s) => s.id === OLED_ID.R_ANIM_MS);

  return (
    <div className="bg-base-300 min-h-0 min-w-0 overflow-y-auto p-4">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h2 className="font-semibold">OLED screens</h2>
          <p className="max-w-4xl opacity-70">
            Each screen is drawn upright, the way you read it, with the strip
            the panel shows lit. Drag a widget to move it, drop one from the
            hidden widgets to show it, and pick the picture of the right screen
            in the gallery. Every change is applied by the keyboard at once and
            kept by it a few seconds later, so there is nothing to save here
            (Save and Discard in the header are for the keys and the lights).
            The right screen receives its settings from the left half, which can
            take a few seconds after it connects. The drawings are samples, not
            the live state of the screens.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              role="group"
              aria-label="Zoom"
              className="flex items-center gap-0.5 rounded bg-base-200 p-0.5"
            >
              <span className="px-2 opacity-70">Zoom</span>
              {ZOOMS.map((zoom) => (
                <button
                  key={zoom}
                  type="button"
                  aria-pressed={scale === zoom}
                  className={`rounded px-2 py-0.5 ${
                    scale === zoom
                      ? "bg-primary text-primary-content"
                      : "hover:bg-base-300"
                  }`}
                  onClick={() => setScale(zoom)}
                >
                  {zoom}x
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={grid}
                onChange={(e) => setGrid(e.currentTarget.checked)}
              />
              Grid of 8 pixels
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={playing}
                onChange={(e) => setPlaying(e.currentTarget.checked)}
              />
              Play the animations
            </label>
          </div>
        </header>

        {display.problem && (
          <p role="alert" className="text-red-600">
            {display.problem}
          </p>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* The screens go side by side while they fit, one under the other when the zoom is too big */}
          <div className="flex min-w-0 flex-wrap items-start gap-4">
            {SCREENS.map((screen) => (
              <ScreenPanel
                key={screen}
                screen={screen}
                states={states}
                selectedKey={selected?.def.key ?? null}
                scale={scale}
                grid={grid}
                frame={frame}
                busy={busy}
                atDefaults={widgetsAreDefault(settings, defsOf(screen))}
                onSelect={setSelectedKey}
                onMove={move}
                onHide={hide}
                onShow={show}
                onDropChip={dropChip}
                onDropKind={dropKind}
                onReset={(which) => reset(defsOf(which))}
              />
            ))}
          </div>

          {/* Stays in sight beside the screens while the page scrolls */}
          <div className="w-full lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:w-auto lg:min-w-[22rem] lg:max-w-lg lg:flex-1 lg:overflow-y-auto">
            <OledInspector
              state={selected}
              settings={settings}
              busy={busy}
              frame={frame}
              onSetValue={setValue}
              onShown={setShown}
              onReset={(state) => reset([state.def])}
            />
          </div>
        </div>

        {selectable.length > 0 && (
          <AnimationGallery
            selectable={selectable}
            kind={picture.kind.value}
            ms={msSetting?.value ?? 0}
            playing={playing}
            busy={busy}
            onPick={(value) => setValue(OLED_ID.R_ANIM_KIND, value)}
          />
        )}

        <Possibilities
          states={states}
          selectedKey={selected?.def.key ?? null}
          frame={frame}
          onSelect={setSelectedKey}
        />
      </div>
    </div>
  );
};
