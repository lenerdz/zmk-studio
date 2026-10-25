/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The OLED tab: what each OLED screen of the keyboard shows and where. The two
 * screens are drawn upright with the strip the panel shows lit, every widget of
 * zmk-nice-oled that the firmware lets the app move is a thing to drag, the
 * hidden ones wait in a tray, the right screen has a gallery of pictures (that
 * can be turned, cut to a piece and mixed with the widgets), and
 * what only a new build adds is listed. Like the Display tab, every change goes
 * to the keyboard at once and the keyboard keeps it by itself: nothing to save, and
 * Undo and Redo of the header go to the history of the Display and OLED tabs. With
 * "Live values" the drawings follow what the keyboard says now (the batteries, the
 * link, the output, the profile, the layer and the typing speed), asked about twice a
 * second while the tab is open.
 */
import { useContext, useMemo, useState, type ReactNode } from "react";
import { DisplayContext } from "../display/DisplayContext";
import { useLiveStatus } from "../live/useLiveStatus";
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
  type WidgetIds,
} from "./oledCatalog";
import { OLED_ID } from "./oledIds";
import {
  hasOledLayout,
  pictureOf,
  resetChanges,
  selectableKinds,
  valuesForCenter,
  valuesForKindChange,
  valuesForPicture,
  valuesForShowing,
  valuesForTurn,
  valuesForWindowCenter,
  widgetStates,
  widgetsAreDefault,
  type PictureValues,
  type WidgetState,
} from "./oledLayout";
import { writeCrop, type Crop } from "./pictureView";
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
  const { settings, busy, setValue, setValues } = display;

  const [scale, setScale] = useState<number>(3);
  const [grid, setGrid] = useState(true);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // The drawings are samples until this is on: then the keyboard is asked what the
  // screens draw from (battery, link, output, profile, layer and speed), about twice
  // a second, and only while this tab is open.
  const [live, setLive] = useState(false);
  const liveState = useLiveStatus(live);
  const reading = live ? (liveState.reading ?? undefined) : undefined;

  const states = useMemo(
    () => widgetStates(settings, reading),
    [settings, reading],
  );
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

  // Moving is one gesture however it is done (a drag, the arrow keys, the fields):
  // the moves of the same widget that follow each other closely are one step of
  // Undo, even when one of them changes only x and the next only y.
  const move = (state: WidgetState, values: { x: number; y: number }) => {
    setValues(
      [
        [state.def.ids.x, values.x],
        [state.def.ids.y, values.y],
      ],
      `move:${state.def.key}`,
    );
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

    // Where it was, or where the panel shows it when it was outside: one step
    const values = valuesForShowing(state);
    setValues([
      [x, values.x],
      [y, values.y],
      [showId, 1],
    ]);
    setSelectedKey(state.def.key);
  };

  const dropChip = (key: string, point: { x: number; y: number }) => {
    const state = states.find((s) => s.def.key === key && s.present);
    const showId = state?.def.ids.show;
    if (!state || showId === undefined) {
      return;
    }

    const values = valuesForCenter(state, point);
    setValues([
      [state.def.ids.x, values.x],
      [state.def.ids.y, values.y],
      [showId, 1],
    ]);
    setSelectedKey(key);
  };

  /**
   * What a set of values stands for, in the settings of the picture: the picture,
   * its turn and its crop first, then where it is (an id the keyboard does not
   * have is skipped by setValues). They are one step of Undo, with `also`, other
   * settings that go with them (the switch that shows the picture), and `group`
   * names a gesture that goes on, like dragging the frame of the crop.
   */
  const sendPicture = (
    ids: WidgetIds,
    values: Partial<PictureValues>,
    options: {
      group?: string;
      also?: ReadonlyArray<readonly [id: number, value: number]>;
    } = {},
  ) => {
    const candidates: Array<[number | undefined, number | undefined]> = [
      [ids.kind, values.kind],
      [ids.rot, values.rot],
      [ids.cropXY, values.cropXY],
      [ids.cropWH, values.cropWH],
      [ids.x, values.x],
      [ids.y, values.y],
    ];

    const pairs: Array<readonly [number, number]> = [];
    for (const [id, value] of candidates) {
      if (id !== undefined && value !== undefined) {
        pairs.push([id, value]);
      }
    }

    setValues([...pairs, ...(options.also ?? [])], options.group);
  };

  const pictureTarget = states.find(
    (s) => s.def.placement === "picture" && s.present,
  );

  const dropKind = (kind: number, point: { x: number; y: number }) => {
    const values = valuesForPicture(settings, kind, point);
    if (!pictureTarget || !values) {
      return;
    }

    // The picture lands upright and whole, centered on the drop, whatever size it has
    const showId = pictureTarget.def.ids.show;
    sendPicture(pictureTarget.def.ids, values, {
      also: showId !== undefined && !pictureTarget.shown ? [[showId, 1]] : [],
    });
    setSelectedKey(pictureTarget.def.key);
  };

  // A click in the gallery or a choice in the list: upright and whole, centered
  // where the old picture was and inside the strip the panel shows when it fits
  const pickKind = (kind: number) => {
    const values = valuesForKindChange(settings, kind);
    if (!pictureTarget || !values) {
      return;
    }

    sendPicture(pictureTarget.def.ids, values);
    setSelectedKey(pictureTarget.def.key);
  };

  const turnPicture = (state: WidgetState, turn: number) => {
    const values = valuesForTurn(state, turn);
    if (values) {
      sendPicture(state.def.ids, values);
    }
  };

  const mixPicture = (state: WidgetState, mix: number) => {
    if (state.def.ids.mix !== undefined) {
      setValue(state.def.ids.mix, mix);
    }
  };

  const cropPicture = (state: WidgetState, crop: Crop | null) => {
    if (!state.picture) {
      return;
    }

    // Dragging the frame of the crop is one step of Undo, even when a move of the
    // pointer changes only where it starts and the next only how big it is
    const written = writeCrop(crop, state.picture.shape);
    sendPicture(
      state.def.ids,
      { cropXY: written.xy, cropWH: written.wh },
      { group: `crop:${state.def.key}` },
    );
  };

  const centerPicture = (state: WidgetState) =>
    sendPicture(state.def.ids, valuesForWindowCenter(state));

  const setShown = (state: WidgetState, shown: boolean) =>
    shown ? show(state) : hide(state);

  // Putting a screen back as built is one step of Undo
  const reset = (defs: WidgetDef[]) => {
    setValues(
      resetChanges(settings, defs).map(({ id, value }) => [id, value] as const),
    );
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
            Undo and Redo in the header (Ctrl+Z and Ctrl+Y) take back and redo
            what you changed here and in the Display tab. The right screen
            receives its settings from the left half, which can
            take a few seconds after it connects.{" "}
            {reading
              ? "The drawings follow what the keyboard says now: the batteries, the link, the output, the profile, the layer and the typing speed."
              : "The drawings are samples. Turn on Live values to draw them from what the keyboard says now."}
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={live}
                onChange={(e) => setLive(e.currentTarget.checked)}
              />
              Live values
            </label>
          </div>
          {live && (
            <p
              role={liveState.status === "error" ? "alert" : "status"}
              className={`max-w-4xl ${
                liveState.status === "error" ? "text-red-600" : "opacity-70"
              }`}
            >
              {liveState.status === "loading" &&
                "Reading the keyboard..."}
              {liveState.status === "ready" &&
                "Live from the left half, which asks the other one for its battery and link. While this is on, the keyboard is asked a few times a second, which also keeps ZMK Studio unlocked."}
              {liveState.status === "unsupported" &&
                "This firmware cannot tell its state (it needs CONFIG_KEYPAW_DEVICE_STATUS_STUDIO, in the zmk-rgb-matrix of lenerdz). The drawings stay samples."}
              {liveState.status === "error" &&
                `The keyboard could not be read${liveState.error ? `: ${liveState.error}` : "."} Turn Live values off and on to try again.`}
            </p>
          )}
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
              onPickKind={pickKind}
              onTurn={turnPicture}
              onMix={mixPicture}
              onCrop={cropPicture}
              onCenter={centerPicture}
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
            onPick={pickKind}
          />
        )}

        <Possibilities
          states={states}
          live={reading !== undefined}
          selectedKey={selected?.def.key ?? null}
          frame={frame}
          onSelect={setSelectedKey}
        />
      </div>
    </div>
  );
};
