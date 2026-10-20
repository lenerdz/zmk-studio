/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The Display tab: the settings of the OLED screens of the keyboard (contrast,
 * when they turn off, the toast of the lights on the right screen). Every
 * change is applied by the keyboard at once and kept by it a few seconds later,
 * so there is no Save here.
 */
import { useContext, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { DisplayContext } from "./DisplayContext";
import type { DisplaySettingData } from "./displayProtocol";
import {
  allDefault,
  describeRange,
  describeSetting,
  formatSetting,
  groupSettings,
  isSettingEnabled,
} from "./displaySettings";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

const Notice = ({ children }: { children: ReactNode }) => (
  <div className="grid place-items-center bg-base-300 min-h-0 min-w-0 p-6 text-center">
    <div className="max-w-prose">{children}</div>
  </div>
);

interface RowProps {
  setting: DisplaySettingData;
  /** False while the setting it depends on turns it off. */
  enabled: boolean;
  /** A restore is going on. */
  busy: boolean;
  onChange: (value: number) => void;
}

/** The sentence under a control: what it does, its range and why it waits. */
const Hint = ({
  id,
  setting,
  enabled,
}: {
  id: string;
  setting: DisplaySettingData;
  enabled: boolean;
}) => {
  const known = describeSetting(setting.id);

  return (
    <p id={id} className="opacity-70">
      {known.hint} {describeRange(setting)}
      {!enabled && known.dependsOn ? ` ${known.dependsOn.note}` : ""}
    </p>
  );
};

const SliderRow = ({ setting, enabled, busy, onChange }: RowProps) => {
  const known = describeSetting(setting.id);
  const inputId = `display-setting-${setting.id}`;
  const hintId = `${inputId}-hint`;
  const text = formatSetting(setting);

  return (
    <div className={`flex flex-col gap-1 ${enabled ? "" : "opacity-50"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId}>{known.label}</label>
        <output htmlFor={inputId} className="font-mono">
          {text}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        className="w-full accent-primary"
        min={setting.min}
        max={setting.max}
        step={known.step ?? 1}
        value={setting.value}
        disabled={busy || !enabled}
        aria-describedby={hintId}
        aria-valuetext={text}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
      />
      <Hint id={hintId} setting={setting} enabled={enabled} />
    </div>
  );
};

const ChoiceRow = ({ setting, enabled, busy, onChange }: RowProps) => {
  const known = describeSetting(setting.id);
  const labelId = `display-setting-${setting.id}-label`;
  const hintId = `display-setting-${setting.id}-hint`;

  // Only the values the keyboard accepts.
  const choices = (known.choices ?? []).filter(
    (c) => c.value >= setting.min && c.value <= setting.max,
  );
  const hasKnownValue = choices.some((c) => c.value === setting.value);

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hintId}
      className={`flex flex-col gap-1 ${enabled ? "" : "opacity-50"}`}
    >
      <span id={labelId}>{known.label}</span>
      <div className="flex flex-wrap gap-1">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={choice.value === setting.value}
            disabled={busy || !enabled}
            className={`rounded px-2 py-1 disabled:opacity-50 ${
              choice.value === setting.value
                ? "bg-primary text-primary-content"
                : "bg-base-100 hover:bg-base-300"
            }`}
            onClick={() => onChange(choice.value)}
          >
            {choice.label}
          </button>
        ))}
        {!hasKnownValue && (
          <span className="rounded px-2 py-1 bg-base-100 opacity-70">
            Value {setting.value}
          </span>
        )}
      </div>
      <Hint id={hintId} setting={setting} enabled={enabled} />
    </div>
  );
};

const ToggleRow = ({ setting, enabled, busy, onChange }: RowProps) => {
  const known = describeSetting(setting.id);
  const hintId = `display-setting-${setting.id}-hint`;

  return (
    <div className={`flex flex-col gap-1 ${enabled ? "" : "opacity-50"}`}>
      <label className="flex items-center justify-between gap-3">
        <span>{known.label}</span>
        <input
          type="checkbox"
          role="switch"
          className="size-5 accent-primary"
          checked={setting.value !== 0}
          disabled={busy || !enabled}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.currentTarget.checked ? 1 : 0)}
        />
      </label>
      <Hint id={hintId} setting={setting} enabled={enabled} />
    </div>
  );
};

export const DisplayTab = () => {
  const display = useContext(DisplayContext);
  const { settings, busy, setValue, restoreDefaults } = display;

  if (display.status === "idle") {
    return <Notice>Unlock the keyboard to change its screens.</Notice>;
  }

  if (display.status === "loading") {
    return <Notice>Reading the screen settings from the keyboard...</Notice>;
  }

  if (display.status === "unsupported") {
    return (
      <Notice>
        This firmware does not have screen settings. They come with the
        zmk-rgb-matrix module of lenerdz (option CONFIG_KEYPAW_DISPLAY_SETTINGS)
        and the zmk-studio-messages fork (see the README of this app).
      </Notice>
    );
  }

  if (display.status === "error") {
    return (
      <Notice>
        The screen settings could not be read from the keyboard: {display.error}
      </Notice>
    );
  }

  return (
    <div className="bg-base-300 min-h-0 min-w-0 overflow-y-auto p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="font-semibold">Screens</h2>
          <p className="opacity-70">
            Every change is applied by the keyboard at once and kept by it a few
            seconds later, so there is nothing to save here (Save and Discard in
            the header are for the keys and the lights). A change turns the
            screens on for a while, so you can see it. The right screen receives
            its settings from the left half, which can take a few seconds after
            it connects.
          </p>
        </header>

        {display.problem && (
          <p role="alert" className="text-red-600">
            {display.problem}
          </p>
        )}

        {groupSettings(settings).map((group) => (
          <section
            key={group.title}
            aria-label={group.title}
            className="flex flex-col gap-4 rounded bg-base-200 p-3"
          >
            <h3 className="font-semibold">{group.title}</h3>
            {group.settings.map((setting) => {
              const props: RowProps = {
                setting,
                enabled: isSettingEnabled(setting, settings),
                busy,
                onChange: (value) => setValue(setting.id, value),
              };
              const kind = describeSetting(setting.id).kind;

              return kind === "choice" ? (
                <ChoiceRow key={setting.id} {...props} />
              ) : kind === "toggle" ? (
                <ToggleRow key={setting.id} {...props} />
              ) : (
                <SliderRow key={setting.id} {...props} />
              );
            })}
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={BUTTON}
            disabled={busy || allDefault(settings)}
            onClick={() => void restoreDefaults()}
          >
            <RotateCcw className="w-4" aria-hidden="true" />
            Restore defaults
          </button>
          <span className="opacity-70">
            Puts every setting back to what the firmware was built with. Restore
            Stock Settings in the header does it too.
          </span>
        </div>
      </div>
    </div>
  );
};
