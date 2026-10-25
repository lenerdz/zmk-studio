/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The pictures the right screen can play, each one playing in its card: the
 * animations first and then the still images (the seven of zmk-nice-oled and the
 * 19 that the lenerdz fork adds). Click a card to put the picture on the screen,
 * or drag it onto the right screen to play it where it is dropped. The firmware
 * has them all (the build of this repository with the OLED layout on), so
 * choosing one is a setting, not a new build.
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
  // As big as the card holds (164 pixels tall, about 170 wide), in whole pixels
  const scale = Math.max(
    1,
    Math.min(Math.floor(164 / info.height), Math.floor(168 / info.width), 5),
  );

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
}: Props) => {
  const group = (title: string, hint: string, kinds: AnimationKind[]) => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h4 className="font-semibold">{title}</h4>
        <p className="max-w-4xl opacity-70">{hint}</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        {kinds.map((entry) => (
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
    </div>
  );

  return (
    <section
      aria-label="Pictures of the right screen"
      className="flex flex-col gap-4 rounded bg-base-200 p-3"
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-semibold">Pictures of the right screen</h3>
        <p className="max-w-4xl opacity-70">
          Click one to play it on the right screen, or drag one onto the
          screen to play it where you drop it. A new picture starts upright
          and whole, with its center where the center of the old one was,
          and inside the strip the panel shows when it fits there. Every
          picture is in the firmware, so choosing one does not need a new
          build. Turn it, cut it to a piece and choose how the widgets mix
          with it in the panel of the selected widget.
        </p>
      </header>
      {group(
        "Animations",
        "They play all the time. The ones 32 pixels wide fit the screen, and the ones that are 128 pixels tall fill it. The time of one cycle is a setting of the picture.",
        ANIMATION_KINDS.filter((entry) => entry.cycleMs !== null),
      )}
      {group(
        "Still images",
        "They do not move. They are 32 pixels wide, as wide as the screen. The other still images of the shield and of the fork were taken out of the firmware.",
        ANIMATION_KINDS.filter((entry) => entry.cycleMs === null),
      )}
    </section>
  );
};
