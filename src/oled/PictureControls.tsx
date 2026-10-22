/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The controls of the picture of the right screen, in the panel of the selected
 * widget: which picture and how fast it plays, which way it is turned, how the
 * widgets over it mix with it, and which piece of it shows.
 */
import { useId } from "react";
import { RotateCcwSquare, RotateCwSquare } from "lucide-react";
import type { DisplaySettingData } from "../display/displayProtocol";
import { ANIMATION_KINDS } from "./oledCatalog";
import { pictureOf, selectableKinds, type WidgetState } from "./oledLayout";
import { PictureCrop } from "./PictureCrop";
import {
  MIX_ADD,
  MIX_INVERT,
  nextTurn,
  type Crop,
} from "./pictureView";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

const TURN_TEXT = [
  "Not turned.",
  "Turned a quarter to the right (90 degrees clockwise).",
  "Upside down (180 degrees).",
  "Turned a quarter to the left (90 degrees counterclockwise).",
];

interface Props {
  state: WidgetState;
  settings: DisplaySettingData[];
  disabled: boolean;
  frame: number;
  /** A plain setting of the picture (the time of a cycle). */
  onSetValue: (id: number, value: number) => void;
  /** Another picture: the settings it needs (see valuesForKindChange). */
  onPickKind: (kind: number) => void;
  /** Turn the picture to a number of quarter turns clockwise. */
  onTurn: (turn: number) => void;
  onMix: (mix: number) => void;
  /** Show a piece of the picture; null for all of it. */
  onCrop: (crop: Crop | null) => void;
  onCenter: () => void;
}

/** Which picture the right screen plays, how fast, how it is turned, mixed and cut. */
export const PictureControls = ({
  state,
  settings,
  disabled,
  frame,
  onSetValue,
  onPickKind,
  onTurn,
  onMix,
  onCrop,
  onCenter,
}: Props) => {
  const selectId = useId();
  const sliderId = useId();
  const mixId = useId();
  const kindId = state.def.ids.kind;
  const msId = state.def.ids.ms;
  const msSetting = settings.find((s) => s.id === msId);
  const kinds = selectableKinds(settings, ANIMATION_KINDS);
  const picture = pictureOf(settings);
  const cycle = picture.cycleMs;
  const own = (msSetting?.value ?? 0) === 0;
  const view = state.picture;

  if (kindId === undefined || kinds.length === 0) {
    return null;
  }

  const animations = kinds.filter((kind) => kind.cycleMs !== null);
  const stills = kinds.filter((kind) => kind.cycleMs === null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={selectId} className="opacity-70">
          Picture
        </label>
        <select
          id={selectId}
          className="rounded bg-base-100 px-2 py-1"
          value={picture.kind.value}
          disabled={disabled}
          onChange={(e) => onPickKind(Number(e.currentTarget.value))}
        >
          <optgroup label="Animations">
            {animations.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Still images">
            {stills.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </optgroup>
        </select>
        <span className="opacity-70">{picture.kind.hint}</span>
        <span className="opacity-70">
          A new picture starts upright and whole, centered where the old one
          was.
        </span>
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

      {view?.canTurn && (
        <div
          role="group"
          aria-label="Turn the picture"
          className="flex flex-col gap-1"
        >
          <span className="opacity-70">Turn the picture</span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={BUTTON}
              disabled={disabled}
              onClick={() => onTurn(nextTurn(view.turn, -1))}
            >
              <RotateCcwSquare className="w-4" aria-hidden="true" />
              Turn left
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={disabled}
              onClick={() => onTurn(nextTurn(view.turn, 1))}
            >
              <RotateCwSquare className="w-4" aria-hidden="true" />
              Turn right
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={disabled || view.turn === 0}
              onClick={() => onTurn(0)}
            >
              Upright
            </button>
          </div>
          <span className="opacity-70">
            {TURN_TEXT[view.turn]} The picture turns on its own center, and the
            piece that shows turns with it. The text widgets cannot be turned.
          </span>
        </div>
      )}

      {view?.canMix && (
        <div className="flex flex-col gap-0.5">
          <label htmlFor={mixId} className="opacity-70">
            Widgets over the picture
          </label>
          <select
            id={mixId}
            className="rounded bg-base-100 px-2 py-1"
            value={view.mix === MIX_ADD ? MIX_ADD : MIX_INVERT}
            disabled={disabled}
            onChange={(e) => onMix(Number(e.currentTarget.value))}
          >
            <option value={MIX_INVERT}>Shown in reverse, to stay readable</option>
            <option value={MIX_ADD}>Added to the picture</option>
          </select>
          <span className="opacity-70">
            {view.mix === MIX_ADD
              ? "A lit pixel of the picture is lit whatever is under it, so a widget over a bright part of the picture gets lost in it."
              : "A lit pixel of the picture flips what is under it: where a widget is over a bright part of the picture, the widget shows dark on light."}
          </span>
        </div>
      )}

      {view?.canCrop && (
        <div className="flex flex-col gap-1">
          <span className="opacity-70">Show only a piece of the picture</span>
          <PictureCrop
            state={state}
            frame={frame}
            disabled={disabled}
            onCrop={onCrop}
            onCenter={onCenter}
          />
        </div>
      )}
    </div>
  );
};
