/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The panel of the widget that is selected on a screen: how big it is, where it
 * is, whether the panel shows it, and the controls that the drag does not give:
 * the switch, the position as numbers and arrows, and for the picture of the right
 * screen the choice of the picture and its speed.
 */
import { useId, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  LocateFixed,
  RotateCcw,
} from "lucide-react";
import type { DisplaySettingData } from "../display/displayProtocol";
import { ANIMATION_KINDS, SCREEN_TITLES } from "./oledCatalog";
import {
  describeVisibility,
  idsOfWidget,
  pictureOf,
  selectableKinds,
  valuesAfterMove,
  valuesForCorner,
  widgetsAreDefault,
  type WidgetState,
} from "./oledLayout";
import { WINDOW_RECT } from "./oledGeometry";
import { PANEL_COLOR, WidgetArt } from "./PixelArt";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

interface NumberFieldProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}

/**
 * A whole number the keyboard accepts. What is typed goes to the keyboard as soon
 * as it is a number; the field shows what the keyboard has again when it loses
 * the focus (a value out of the range is held inside it). Without a draft the
 * field always shows the value it is given, so a drag, the arrows or another
 * widget never leave an old number in it.
 */
const NumberField = ({
  label,
  hint,
  value,
  min,
  max,
  disabled,
  onCommit,
}: NumberFieldProps) => {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="opacity-70" title={hint}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className="w-20 rounded bg-base-100 px-2 py-1 tabular-nums"
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        disabled={disabled}
        aria-describedby={`${id}-range`}
        onChange={(e) => {
          setDraft(e.currentTarget.value);
          const wanted = e.currentTarget.valueAsNumber;
          if (Number.isFinite(wanted)) {
            onCommit(Math.round(wanted));
          }
        }}
        onBlur={() => setDraft(null)}
      />
      <span id={`${id}-range`} className="sr-only">
        From {min} to {max}
      </span>
    </div>
  );
};

interface NudgeProps {
  disabled: boolean;
  onNudge: (dx: number, dy: number) => void;
}

/** Four arrows that move the widget by a pixel, or by eight with Shift. */
const Nudge = ({ disabled, onNudge }: NudgeProps) => {
  const arrow = (
    Icon: typeof ArrowUp,
    label: string,
    dx: number,
    dy: number,
  ) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid size-7 place-items-center rounded bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100"
      onClick={(e) => {
        const step = e.shiftKey ? 8 : 1;
        onNudge(dx * step, dy * step);
      }}
    >
      <Icon className="w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Move by one pixel (hold Shift for eight)"
      title="Move by one pixel (hold Shift for eight)"
      className="grid w-fit grid-cols-3 gap-0.5"
    >
      <span />
      {arrow(ArrowUp, "Up", 0, -1)}
      <span />
      {arrow(ArrowLeft, "Left", -1, 0)}
      <span />
      {arrow(ArrowRight, "Right", 1, 0)}
      <span />
      {arrow(ArrowDown, "Down", 0, 1)}
      <span />
    </div>
  );
};

interface PictureControlsProps {
  state: WidgetState;
  settings: DisplaySettingData[];
  disabled: boolean;
  onSetValue: (id: number, value: number) => void;
}

/** Which picture the right screen plays, and how fast. */
const PictureControls = ({
  state,
  settings,
  disabled,
  onSetValue,
}: PictureControlsProps) => {
  const selectId = useId();
  const sliderId = useId();
  const kindId = state.def.ids.kind;
  const msId = state.def.ids.ms;
  const msSetting = settings.find((s) => s.id === msId);
  const kinds = selectableKinds(settings, ANIMATION_KINDS);
  const picture = pictureOf(settings);
  const cycle = picture.cycleMs;
  const own = (msSetting?.value ?? 0) === 0;

  if (kindId === undefined || kinds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={selectId} className="opacity-70">
          Picture
        </label>
        <select
          id={selectId}
          className="rounded bg-base-100 px-2 py-1"
          value={picture.kind.value}
          disabled={disabled}
          onChange={(e) => onSetValue(kindId, Number(e.currentTarget.value))}
        >
          {kinds.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
              {kind.cycleMs === null ? " (still image)" : ""}
            </option>
          ))}
        </select>
        <span className="opacity-70">{picture.kind.hint}</span>
      </div>

      {msId !== undefined && msSetting && cycle !== null && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center justify-between gap-3">
            <span>Speed of the animation itself</span>
            <input
              type="checkbox"
              role="switch"
              className="size-5 accent-primary"
              checked={own}
              disabled={disabled}
              onChange={(e) =>
                // Leaving the speed of the animation starts from that speed
                onSetValue(
                  msId,
                  e.currentTarget.checked ? 0 : picture.kind.cycleMs ?? 960,
                )
              }
            />
          </label>
          <div className={`flex flex-col gap-1 ${own ? "opacity-50" : ""}`}>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={sliderId}>Time of one cycle</label>
              <output htmlFor={sliderId} className="font-mono">
                {Number((cycle / 1000).toFixed(2))} s
              </output>
            </div>
            <input
              id={sliderId}
              type="range"
              className="w-full accent-primary"
              min={100}
              max={Math.max(Math.min(msSetting.max, 30000), cycle)}
              step={100}
              value={cycle}
              disabled={disabled || own}
              onChange={(e) =>
                onSetValue(msId, Math.round(e.currentTarget.valueAsNumber))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-3">
    <dt className="opacity-70">{label}</dt>
    <dd className="text-right tabular-nums">{children}</dd>
  </div>
);

interface Props {
  state: WidgetState | null;
  settings: DisplaySettingData[];
  /** A restore is going on. */
  busy: boolean;
  frame: number;
  onSetValue: (id: number, value: number) => void;
  onShown: (state: WidgetState, shown: boolean) => void;
  onReset: (state: WidgetState) => void;
}

export const OledInspector = ({
  state,
  settings,
  busy,
  frame,
  onSetValue,
  onShown,
  onReset,
}: Props) => {
  if (!state) {
    return (
      <aside
        aria-label="Selected widget"
        className="flex flex-col gap-2 rounded bg-base-200 p-3"
      >
        <h3 className="font-semibold">Selected widget</h3>
        <p className="opacity-70">
          Click a widget on one of the screens to see how big it is, where it is
          and what the panel shows of it, and to change it. Drag a widget to
          move it. The arrow keys move the selected one by a pixel (by eight
          with Shift), and Delete hides it.
        </p>
      </aside>
    );
  }

  const { def } = state;
  const isPicture = def.placement === "picture";
  const nowhere = state.shown && state.visibility === "none";
  const defaults = widgetsAreDefault(settings, [def]);

  const setXY = (x: number, y: number) => {
    onSetValue(def.ids.x, x);
    onSetValue(def.ids.y, y);
  };

  const built = `x ${state.defaultX}, y ${state.defaultY}${
    def.ids.show === undefined
      ? ""
      : state.defaultShown
        ? ", shown"
        : ", hidden"
  }`;

  return (
    <aside
      aria-label="Selected widget"
      className="flex flex-col gap-3 rounded bg-base-200 p-3"
    >
      <header className="flex flex-col gap-0.5">
        <h3 className="font-semibold">{def.label}</h3>
        <p className="opacity-70">
          {SCREEN_TITLES[def.screen]}, {state.rect.w} x {state.rect.h} px
        </p>
      </header>

      <div
        aria-hidden="true"
        className="grid max-h-56 place-items-start overflow-hidden self-start rounded p-1"
        style={{ background: PANEL_COLOR }}
      >
        <WidgetArt
          parts={state.parts}
          box={state.box}
          scale={isPicture && state.rect.h > 100 ? 1 : 3}
          frame={frame}
        />
      </div>

      <p className="opacity-70">{def.hint}</p>

      {def.ids.show !== undefined ? (
        <label className="flex items-center justify-between gap-3">
          <span>Show on the screen</span>
          <input
            type="checkbox"
            role="switch"
            className="size-5 accent-primary"
            checked={state.shown}
            disabled={busy}
            onChange={(e) => onShown(state, e.currentTarget.checked)}
          />
        </label>
      ) : (
        <p className="opacity-70">
          {state.muted
            ? "The light toast is turned off in the Display tab, so it never shows."
            : "It shows for a moment when the lights change. Turn it on and off, and choose how long it stays, in the Display tab."}
        </p>
      )}

      {def.ids.kind !== undefined && (
        <PictureControls
          state={state}
          settings={settings}
          disabled={busy}
          onSetValue={onSetValue}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label={isPicture ? "X" : "x"}
          hint={
            isPicture
              ? "X of the picture on the landscape canvas of the panel: a larger X moves it up on the screens of this editor."
              : "x of the widget, in pixels, going right"
          }
          value={state.x}
          min={state.min}
          max={state.max}
          disabled={busy}
          onCommit={(x) => onSetValue(def.ids.x, x)}
        />
        <NumberField
          label={isPicture ? "Y" : "y"}
          hint={
            isPicture
              ? "Y of the picture on the landscape canvas of the panel: a larger Y moves it right on the screens of this editor."
              : "y of the widget, in pixels, going down"
          }
          value={state.y}
          min={state.min}
          max={state.max}
          disabled={busy}
          onCommit={(y) => onSetValue(def.ids.y, y)}
        />
        <Nudge
          disabled={busy}
          onNudge={(dx, dy) => {
            const next = valuesAfterMove(state, dx, dy);
            setXY(next.x, next.y);
          }}
        />
      </div>
      <p className="opacity-70">
        {isPicture
          ? "X and Y are the numbers of the nice!oled options for the picture: they place it on the landscape canvas of the panel, so a larger X moves it up and a larger Y moves it right on the screens here."
          : "x goes right and y goes down, in pixels of the canvas. They are the numbers of the nice!oled options for the widget."}
      </p>

      <dl className="flex flex-col gap-1">
        <Row label="Size">
          {state.rect.w} x {state.rect.h} px
        </Row>
        <Row label="On the canvas">
          x {state.rect.x} to {state.rect.x + state.rect.w - 1}, y{" "}
          {state.rect.y} to {state.rect.y + state.rect.h - 1}
        </Row>
        <Row label="Built with">{built}</Row>
      </dl>

      {state.shown && (
        <p className={nowhere ? "text-red-600" : "opacity-70"}>
          {describeVisibility(state)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {nowhere && (
          <button
            type="button"
            className={BUTTON}
            disabled={busy}
            onClick={() => {
              const next = valuesForCorner(state, {
                x: WINDOW_RECT.x,
                y: WINDOW_RECT.y,
              });
              setXY(next.x, next.y);
            }}
          >
            <LocateFixed className="w-4" aria-hidden="true" />
            Bring it onto the screen
          </button>
        )}
        <button
          type="button"
          className={BUTTON}
          disabled={busy || defaults}
          onClick={() => onReset(state)}
        >
          <RotateCcw className="w-4" aria-hidden="true" />
          Put it back as built
        </button>
      </div>

      <details>
        <summary className="cursor-pointer opacity-70">
          What the build needs
        </summary>
        <p className="mt-1 break-words opacity-70">
          {def.needs}. Settings {idsOfWidget(def).join(", ")}.
        </p>
      </details>
    </aside>
  );
};
