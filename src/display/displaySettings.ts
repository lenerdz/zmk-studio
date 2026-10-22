/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the app knows about the display settings of the keyboard: a name, a kind
 * of control and the rules between them for the ids of the protocol
 * (lenerdz/zmk-studio-messages), and the plain functions the Display tab is
 * built from. The range of every setting comes from the keyboard, never from
 * here; an id this file does not know is still shown, as a number. The ids from
 * 16 on belong to the OLED tab (the layout of the screens, src/oled) and are not
 * listed here.
 */
import { isOledLayoutId } from "../oled/oledIds";
import type { DisplaySettingData } from "./displayProtocol";

export type SettingKind = "slider" | "choice" | "toggle";

export interface SettingChoice {
  value: number;
  label: string;
}

export interface KnownSetting {
  id: number;
  label: string;
  kind: SettingKind;
  /** What the setting does, in a sentence. */
  hint: string;
  /** Distance between the values of a slider. */
  step?: number;
  /** For sliders: how the value is written next to the label. */
  format?: (value: number) => string;
  /** For choices: the values, in the order they are offered. */
  choices?: SettingChoice[];
  /**
   * The setting only matters while another one has a value: the control is
   * disabled otherwise (the value is kept).
   */
  dependsOn?: { id: number; note: string; isOn: (value: number) => boolean };
}

/** The settings of the same part of the screen, drawn together. */
export interface SettingGroup {
  title: string;
  /** The settings of the group that the keyboard has, in the order of the group. */
  settings: DisplaySettingData[];
}

/** The ids of the settings, as the firmware (zmk-rgb-matrix) numbers them. */
export const DISPLAY_SETTING = {
  LEFT_CONTRAST: 1,
  RIGHT_CONTRAST: 2,
  OFF_MODE: 3,
  OFF_AFTER_S: 4,
  TOAST: 5,
  TOAST_MS: 6,
} as const;

export const OFF_MODE_NEVER = 0;

/** "45 s", "1 min 30 s", "1 h". */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return [
    hours > 0 ? `${hours} h` : "",
    minutes > 0 ? `${minutes} min` : "",
    rest > 0 ? `${rest} s` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** "0.5 s", "1.5 s", "2 s". */
export function formatMilliseconds(milliseconds: number): string {
  return `${Number((milliseconds / 1000).toFixed(2))} s`;
}

const KNOWN: Record<number, KnownSetting> = {
  [DISPLAY_SETTING.LEFT_CONTRAST]: {
    id: DISPLAY_SETTING.LEFT_CONTRAST,
    label: "Left screen contrast",
    kind: "slider",
    hint: "How bright the screen of the left half is. The lowest value is the dimmest.",
    step: 1,
  },
  [DISPLAY_SETTING.RIGHT_CONTRAST]: {
    id: DISPLAY_SETTING.RIGHT_CONTRAST,
    label: "Right screen contrast",
    kind: "slider",
    hint: "How bright the screen of the right half is. The right half receives the value from the left one, so it can take a few seconds after it connects.",
    step: 1,
  },
  [DISPLAY_SETTING.OFF_MODE]: {
    id: DISPLAY_SETTING.OFF_MODE,
    label: "Turn the screen off",
    kind: "choice",
    hint: "When the screen goes off after the keyboard is left alone. Any key turns it back on. Only on battery means while USB is not connected to that half.",
    choices: [
      { value: 0, label: "Never" },
      { value: 1, label: "Only on battery" },
      { value: 2, label: "Always" },
    ],
  },
  [DISPLAY_SETTING.OFF_AFTER_S]: {
    id: DISPLAY_SETTING.OFF_AFTER_S,
    label: "Time without activity before it goes off",
    kind: "slider",
    hint: "Not shorter than the idle time the firmware was built with.",
    step: 10,
    format: formatSeconds,
    dependsOn: {
      id: DISPLAY_SETTING.OFF_MODE,
      note: "Used only while the screen is set to turn off.",
      isOn: (value) => value !== OFF_MODE_NEVER,
    },
  },
  [DISPLAY_SETTING.TOAST]: {
    id: DISPLAY_SETTING.TOAST,
    label: "Light toast on the right screen",
    kind: "toggle",
    hint: "A short notice on the right screen when the lights change (effect, brightness, on and off).",
  },
  [DISPLAY_SETTING.TOAST_MS]: {
    id: DISPLAY_SETTING.TOAST_MS,
    label: "Toast duration",
    kind: "slider",
    hint: "How long the notice stays on the screen.",
    step: 100,
    format: formatMilliseconds,
    dependsOn: {
      id: DISPLAY_SETTING.TOAST,
      note: "Used only while the light toast is on.",
      isOn: (value) => value !== 0,
    },
  },
};

/** The groups of the tab, in the order they are drawn. */
const GROUPS: Array<{ title: string; ids: number[] }> = [
  {
    title: "Contrast",
    ids: [DISPLAY_SETTING.LEFT_CONTRAST, DISPLAY_SETTING.RIGHT_CONTRAST],
  },
  {
    title: "Screen off",
    ids: [DISPLAY_SETTING.OFF_MODE, DISPLAY_SETTING.OFF_AFTER_S],
  },
  {
    title: "Light toast",
    ids: [DISPLAY_SETTING.TOAST, DISPLAY_SETTING.TOAST_MS],
  },
];

export const OTHER_GROUP_TITLE = "Other settings";

/** What the app knows about a setting: a made-up description for an unknown id. */
export function describeSetting(id: number): KnownSetting {
  return (
    KNOWN[id] ?? {
      id,
      label: `Setting ${id}`,
      kind: "slider",
      hint: "A setting this version of the app does not know; the range comes from the keyboard.",
      step: 1,
    }
  );
}

export function isKnownSetting(id: number): boolean {
  return KNOWN[id] !== undefined;
}

/**
 * The settings of the keyboard split in the groups of the tab. The ids of the
 * OLED layout (16 and up) are left out: the OLED tab edits them.
 */
export function groupSettings(settings: DisplaySettingData[]): SettingGroup[] {
  const byId = new Map(settings.map((s) => [s.id, s]));
  const used = new Set<number>();
  const groups: SettingGroup[] = [];

  for (const { title, ids } of GROUPS) {
    const present = ids.flatMap((id) => {
      const setting = byId.get(id);
      return setting ? [setting] : [];
    });
    present.forEach((s) => used.add(s.id));
    if (present.length > 0) {
      groups.push({ title, settings: present });
    }
  }

  const others = settings.filter(
    (s) => !used.has(s.id) && !isOledLayoutId(s.id),
  );
  if (others.length > 0) {
    groups.push({ title: OTHER_GROUP_TITLE, settings: others });
  }

  return groups;
}

/**
 * Whether the control of a setting can be used: false while the setting it
 * depends on has a value that turns it off.
 */
export function isSettingEnabled(
  setting: DisplaySettingData,
  settings: DisplaySettingData[],
): boolean {
  const dependsOn = describeSetting(setting.id).dependsOn;
  if (!dependsOn) {
    return true;
  }

  const master = settings.find((s) => s.id === dependsOn.id);
  // The keyboard has no such master (another firmware): nothing turns it off.
  return master === undefined || dependsOn.isOn(master.value);
}

/** The value rounded to a whole number and held inside the range of the keyboard. */
export function clampSetting(
  setting: Pick<DisplaySettingData, "min" | "max">,
  value: number,
): number {
  const whole = Math.round(value);
  if (Number.isNaN(whole)) {
    return setting.min;
  }
  return Math.min(Math.max(whole, setting.min), setting.max);
}

/** A value as the tab writes it: "128", "1 min 30 s", "On", "Only on battery". */
export function formatSettingValue(id: number, value: number): string {
  const known = describeSetting(id);

  switch (known.kind) {
    case "toggle":
      return value !== 0 ? "On" : "Off";
    case "choice":
      return (
        known.choices?.find((c) => c.value === value)?.label ?? String(value)
      );
    default:
      return known.format ? known.format(value) : String(value);
  }
}

/** The value a setting has now, as the tab writes it. */
export function formatSetting(setting: DisplaySettingData): string {
  return formatSettingValue(setting.id, setting.value);
}

/**
 * What the keyboard accepts and what it was built with, in one line: "From 0
 * to 255. Built with 128." (for a choice or a toggle, only the second part).
 */
export function describeRange(setting: DisplaySettingData): string {
  const write = (value: number) => formatSettingValue(setting.id, value);
  const builtWith = `Built with ${write(setting.defaultValue)}.`;

  return describeSetting(setting.id).kind === "slider"
    ? `From ${write(setting.min)} to ${write(setting.max)}. ${builtWith}`
    : builtWith;
}

/** Whether every setting has the value the firmware was built with. */
export function allDefault(settings: DisplaySettingData[]): boolean {
  return settings.every((s) => s.value === s.defaultValue);
}

/** Replaces the value of one setting; the other ones are the same objects. */
export function withValue(
  settings: DisplaySettingData[],
  id: number,
  value: number,
): DisplaySettingData[] {
  return settings.map((s) => (s.id === id ? { ...s, value } : s));
}

/**
 * What a change of the tab does: the settings as they will be and the value to
 * send, or null when there is nothing to do (a setting the keyboard does not
 * have, or the value it already has once held inside its range).
 */
export function planChange(
  settings: DisplaySettingData[],
  id: number,
  value: number,
): { settings: DisplaySettingData[]; value: number } | null {
  const current = settings.find((s) => s.id === id);
  if (!current) {
    return null;
  }

  const wanted = clampSetting(current, value);
  if (wanted === current.value) {
    return null;
  }

  return { settings: withValue(settings, id, wanted), value: wanted };
}
