/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the screens can show: the widgets this keyboard has (with their size and
 * what the panel shows of each), the widgets its build does not have, and the
 * things zmk-nice-oled has that only a new build adds.
 */
import {
  BUILD_ONLY_FEATURES,
  SCREEN_TITLES,
  type BuildOnlyFeature,
} from "./oledCatalog";
import { describeStatus, type WidgetState } from "./oledLayout";
import { PANEL_COLOR, WidgetArt } from "./PixelArt";

interface Props {
  states: WidgetState[];
  /** Whether the drawings follow the keyboard (Live values is on and has an answer). */
  live: boolean;
  selectedKey: string | null;
  frame: number;
  onSelect: (key: string) => void;
}

const screenOf = (feature: BuildOnlyFeature): string =>
  feature.screen === "both" ? "Both screens" : SCREEN_TITLES[feature.screen];

export const Possibilities = ({
  states,
  live,
  selectedKey,
  frame,
  onSelect,
}: Props) => {
  const present = states.filter((s) => s.present);
  const missing = states.filter((s) => !s.present);

  return (
    <section
      aria-label="What the screens can show"
      className="flex flex-col gap-3 rounded bg-base-200 p-3"
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-semibold">What the screens can show</h3>
        <p className="max-w-4xl opacity-70">
          The widgets of this keyboard are listed with their size and with what
          the panel shows of each one now.{" "}
          {live
            ? "The drawings follow what the keyboard says now (Live values is on)."
            : "The drawings are samples (a battery of 85%, the layer QWERTY, a typing speed of 42); turn on Live values to draw them from what the keyboard says now."}
        </p>
      </header>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
        {present.map((state) => (
          <li key={state.def.key}>
            <button
              type="button"
              aria-pressed={state.def.key === selectedKey}
              className={`flex h-full w-full flex-col gap-1 rounded bg-base-100 p-2 text-left ${
                state.def.key === selectedKey
                  ? "ring-2 ring-primary"
                  : "hover:bg-base-300"
              }`}
              onClick={() => onSelect(state.def.key)}
            >
              <span
                aria-hidden="true"
                className="grid place-items-start self-start overflow-hidden rounded p-1"
                style={{
                  background: PANEL_COLOR,
                  maxWidth: "100%",
                  maxHeight: 76,
                }}
              >
                <WidgetArt
                  parts={state.parts}
                  box={state.box}
                  scale={state.rect.h > 40 ? 1 : 2}
                  frame={frame}
                />
              </span>
              <span className="font-semibold">{state.def.label}</span>
              <span className="opacity-70">
                {SCREEN_TITLES[state.def.screen]}, {state.rect.w} x{" "}
                {state.rect.h} px
              </span>
              <span className="opacity-70">{describeStatus(state)}</span>
            </button>
          </li>
        ))}
      </ul>

      {(missing.length > 0 || BUILD_ONLY_FEATURES.length > 0) && (
        <>
          <h4 className="font-semibold">Only with a new firmware build</h4>
          <p className="max-w-4xl opacity-70">
            These are choices made in the conf files when the firmware is built
            (corne.conf, corne_left.conf, corne_right.conf), so they cannot be
            moved or switched here. The option is the one to turn on.
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
            {missing.map((state) => (
              <li
                key={state.def.key}
                className="flex flex-col gap-1 rounded bg-base-100 p-2"
              >
                <span className="font-semibold">{state.def.label}</span>
                <span className="opacity-70">
                  {SCREEN_TITLES[state.def.screen]}. {state.def.hint}
                </span>
                <span className="break-words font-mono opacity-70">
                  {state.def.needs}
                </span>
              </li>
            ))}
            {BUILD_ONLY_FEATURES.map((feature) => (
              <li
                key={feature.key}
                className="flex flex-col gap-1 rounded bg-base-100 p-2"
              >
                <span className="font-semibold">{feature.label}</span>
                <span className="opacity-70">
                  {screenOf(feature)}. {feature.hint}
                </span>
                <span className="break-words font-mono opacity-70">
                  {feature.option}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
