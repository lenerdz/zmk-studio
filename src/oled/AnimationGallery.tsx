/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The pictures the right screen can play, each one playing in its card: the five
 * animations and the two still images of zmk-nice-oled. Click a card to put the
 * picture on the screen, or drag it onto the right screen to play it where it is
 * dropped. The firmware has them all (the build of this repository
 * with the OLED layout on), so choosing one is a setting, not a new build.
 */
import { SPRITES } from "./assets/sprites";
import { DRAG_KIND_MIME } from "./dragTypes";
import { ANIMATION_KINDS, cycleMsOf, type AnimationKind } from "./oledCatalog";
import { PANEL_COLOR, PixelSprite } from "./PixelArt";
import { useFrame } from "./useFrame";

interface CardProps {
  kind: AnimationKind;
  selected: boolean;
  /** The keyboard does not take this kind, or a restore is going on. */
  disabled: boolean;
  playing: boolean;
  /** The time of a cycle the setting asks for (0: the one of the animation). */
  ms: number;
  onPick: () => void;
}

const KindCard = ({
  kind,
  selected,
  disabled,
  playing,
  ms,
  onPick,
}: CardProps) => {
  const info = SPRITES[kind.sprite];
  // The card that is on the screen plays at the speed of the setting
  const cycle = cycleMsOf(kind, selected ? ms : 0);
  const frame = useFrame(info.frames, cycle, playing);
  // The still images are as tall as the canvas: show them at their size
  const scale = info.height > 100 ? 1 : 2;

  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        draggable={!disabled}
        title="Click to play it, or drag it onto the right screen"
        onClick={onPick}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_KIND_MIME, String(kind.value));
          e.dataTransfer.setData("text/plain", kind.label);
          e.dataTransfer.effectAllowed = "copy";
        }}
        className={`flex h-full w-full flex-col gap-1 rounded bg-base-100 p-2 text-left disabled:opacity-50 ${
          selected ? "ring-2 ring-primary" : "hover:bg-base-300"
        }`}
      >
        <span
          className="grid place-items-center overflow-hidden rounded"
          style={{ background: PANEL_COLOR, height: 164 }}
        >
          <PixelSprite sprite={kind.sprite} scale={scale} frame={frame} />
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold">{kind.label}</span>
          {selected && (
            <span className="rounded bg-primary px-1 text-primary-content">
              On the screen
            </span>
          )}
        </span>
        <span className="opacity-70">{kind.hint}</span>
        <span className="opacity-70 tabular-nums">
          {info.width} x {info.height} px,{" "}
          {kind.cycleMs === null
            ? "still image"
            : `${info.frames} frames, ${Number((kind.cycleMs / 1000).toFixed(2))} s a cycle`}
        </span>
      </button>
    </li>
  );
};

interface Props {
  /** The kinds the keyboard accepts, by value. */
  selectable: number[];
  kind: number;
  ms: number;
  playing: boolean;
  /** A restore is going on. */
  busy: boolean;
  onPick: (value: number) => void;
}

export const AnimationGallery = ({
  selectable,
  kind,
  ms,
  playing,
  busy,
  onPick,
}: Props) => (
  <section
    aria-label="Pictures of the right screen"
    className="flex flex-col gap-3 rounded bg-base-200 p-3"
  >
    <header className="flex flex-col gap-1">
      <h3 className="font-semibold">Pictures of the right screen</h3>
      <p className="max-w-4xl opacity-70">
        Click one to play it on the right screen, or drag one onto the screen to
        play it where you drop it. A click keeps the place of the Animation or
        image widget, so a picture of another size may need a new place: drag it
        on the screen. Every picture is in the firmware, so choosing one does
        not need a new build. The still images are as tall as the whole canvas
        (160 and 140 pixels), and the screen shows 32 columns of them.
      </p>
    </header>
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
      {ANIMATION_KINDS.map((entry) => (
        <KindCard
          key={entry.value}
          kind={entry}
          selected={entry.value === kind}
          disabled={busy || !selectable.includes(entry.value)}
          playing={playing}
          ms={ms}
          onPick={() => onPick(entry.value)}
        />
      ))}
    </ul>
  </section>
);
