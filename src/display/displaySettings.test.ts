/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { isOledLayoutId } from "../oled/oledIds";
import { DEMO_DISPLAY_SETTINGS } from "./demo/demoDisplay";
import type { DisplaySettingData } from "./displayProtocol";
import {
  allDefault,
  clampSetting,
  describeRange,
  describeSetting,
  DISPLAY_SETTING,
  formatMilliseconds,
  formatSeconds,
  formatSetting,
  formatSettingValue,
  groupSettings,
  isKnownSetting,
  isSettingEnabled,
  OTHER_GROUP_TITLE,
  planChange,
  withValue,
} from "./displaySettings";

const demo = (): DisplaySettingData[] =>
  DEMO_DISPLAY_SETTINGS.map((s) => ({ ...s }));

// The settings of this tab: the demo keyboard also has the OLED layout (the
// ids from 16 on), which the OLED tab edits.
const tabSettings = (): DisplaySettingData[] =>
  demo().filter((s) => !isOledLayoutId(s.id));

const setting = (id: number): DisplaySettingData =>
  demo().find((s) => s.id === id)!;

describe("the settings the app knows", () => {
  it("knows every setting of the tab (the demo has its ids)", () => {
    for (const s of tabSettings()) {
      expect(isKnownSetting(s.id)).toBe(true);
    }
  });

  it("gives each one its kind of control", () => {
    expect(describeSetting(DISPLAY_SETTING.LEFT_CONTRAST).kind).toBe("slider");
    expect(describeSetting(DISPLAY_SETTING.RIGHT_CONTRAST).kind).toBe("slider");
    expect(describeSetting(DISPLAY_SETTING.OFF_MODE).kind).toBe("choice");
    expect(describeSetting(DISPLAY_SETTING.OFF_AFTER_S).kind).toBe("slider");
    expect(describeSetting(DISPLAY_SETTING.TOAST).kind).toBe("toggle");
    expect(describeSetting(DISPLAY_SETTING.TOAST_MS).kind).toBe("slider");
  });

  it("makes up a slider for an id it does not know", () => {
    expect(isKnownSetting(9)).toBe(false);
    expect(describeSetting(9)).toMatchObject({
      id: 9,
      label: "Setting 9",
      kind: "slider",
      step: 1,
    });
  });

  it("offers the three ways to turn the screen off, in order", () => {
    const choices = describeSetting(DISPLAY_SETTING.OFF_MODE).choices;

    expect(choices).toEqual([
      { value: 0, label: "Never" },
      { value: 1, label: "Only on battery" },
      { value: 2, label: "Always" },
    ]);
  });

  it("keeps every step inside the range the firmware gives", () => {
    // From the minimum, in steps, the slider reaches the maximum and the
    // default, so no value of the firmware is out of reach.
    for (const s of tabSettings()) {
      const step = describeSetting(s.id).step ?? 1;
      if (describeSetting(s.id).kind === "slider") {
        expect((s.max - s.min) % step).toBe(0);
        expect((s.defaultValue - s.min) % step).toBe(0);
      }
    }
  });
});

describe("writing values", () => {
  it("writes seconds", () => {
    expect(formatSeconds(30)).toBe("30 s");
    expect(formatSeconds(59)).toBe("59 s");
    expect(formatSeconds(60)).toBe("1 min");
    expect(formatSeconds(90)).toBe("1 min 30 s");
    expect(formatSeconds(600)).toBe("10 min");
    expect(formatSeconds(3600)).toBe("1 h");
    expect(formatSeconds(3661)).toBe("1 h 1 min 1 s");
  });

  it("writes milliseconds as seconds", () => {
    expect(formatMilliseconds(500)).toBe("0.5 s");
    expect(formatMilliseconds(1500)).toBe("1.5 s");
    expect(formatMilliseconds(2000)).toBe("2 s");
    expect(formatMilliseconds(1234)).toBe("1.23 s");
  });

  it("writes each kind of setting its own way", () => {
    expect(formatSettingValue(DISPLAY_SETTING.LEFT_CONTRAST, 128)).toBe("128");
    expect(formatSettingValue(DISPLAY_SETTING.OFF_MODE, 1)).toBe(
      "Only on battery",
    );
    expect(formatSettingValue(DISPLAY_SETTING.OFF_AFTER_S, 90)).toBe(
      "1 min 30 s",
    );
    expect(formatSettingValue(DISPLAY_SETTING.TOAST, 1)).toBe("On");
    expect(formatSettingValue(DISPLAY_SETTING.TOAST, 0)).toBe("Off");
    expect(formatSettingValue(DISPLAY_SETTING.TOAST_MS, 1500)).toBe("1.5 s");
  });

  it("writes a value of a choice it does not know as the number", () => {
    expect(formatSettingValue(DISPLAY_SETTING.OFF_MODE, 7)).toBe("7");
  });

  it("writes a setting it does not know as the number", () => {
    expect(formatSettingValue(9, 42)).toBe("42");
  });

  it("writes the value a setting has now", () => {
    expect(
      formatSetting({ ...setting(DISPLAY_SETTING.OFF_AFTER_S), value: 120 }),
    ).toBe("2 min");
  });

  it("describes the range and what the firmware was built with", () => {
    expect(describeRange(setting(DISPLAY_SETTING.LEFT_CONTRAST))).toBe(
      "From 0 to 255. Built with 128.",
    );
    expect(describeRange(setting(DISPLAY_SETTING.OFF_AFTER_S))).toBe(
      "From 30 s to 1 h. Built with 1 min.",
    );
    expect(describeRange(setting(DISPLAY_SETTING.TOAST_MS))).toBe(
      "From 0.5 s to 5 s. Built with 1.5 s.",
    );
    // A choice or a toggle has no range to tell.
    expect(describeRange(setting(DISPLAY_SETTING.OFF_MODE))).toBe(
      "Built with Never.",
    );
    expect(describeRange(setting(DISPLAY_SETTING.TOAST))).toBe(
      "Built with On.",
    );
  });
});

describe("groupSettings", () => {
  it("puts the settings of the keyboard in the three groups of the tab", () => {
    const groups = groupSettings(demo());

    expect(groups.map((g) => g.title)).toEqual([
      "Contrast",
      "Screen off",
      "Light toast",
    ]);
    expect(groups.map((g) => g.settings.map((s) => s.id))).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it("keeps the order of the group, whatever order the keyboard lists", () => {
    const shuffled = demo().reverse();

    expect(
      groupSettings(shuffled).map((g) => g.settings.map((s) => s.id)),
    ).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it("leaves out a group the keyboard has nothing for", () => {
    const withoutToast = demo().filter((s) => s.id < 5);

    expect(groupSettings(withoutToast).map((g) => g.title)).toEqual([
      "Contrast",
      "Screen off",
    ]);
  });

  it("lists a setting it does not know in a group of its own, at the end", () => {
    const settings = [
      ...demo(),
      { id: 9, value: 3, min: 0, max: 10, defaultValue: 3 },
    ];

    const groups = groupSettings(settings);
    expect(groups.map((g) => g.title)).toEqual([
      "Contrast",
      "Screen off",
      "Light toast",
      OTHER_GROUP_TITLE,
    ]);
    expect(groups[3].settings.map((s) => s.id)).toEqual([9]);
  });

  it("leaves the OLED layout to the OLED tab", () => {
    const groups = groupSettings(demo());

    expect(demo().some((s) => isOledLayoutId(s.id))).toBe(true);
    expect(groups.flatMap((g) => g.settings.map((s) => s.id))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(groups.map((g) => g.title)).not.toContain(OTHER_GROUP_TITLE);
  });

  it("lists a setting it does not know below the layout's ids", () => {
    const groups = groupSettings([
      { id: 15, value: 3, min: 0, max: 10, defaultValue: 3 },
      { id: 16, value: 1, min: 0, max: 1, defaultValue: 1 },
    ]);

    expect(groups.map((g) => g.title)).toEqual([OTHER_GROUP_TITLE]);
    expect(groups[0].settings.map((s) => s.id)).toEqual([15]);
  });

  it("gives no groups for no settings", () => {
    expect(groupSettings([])).toEqual([]);
  });
});

describe("isSettingEnabled", () => {
  it("waits for the screen to be set to turn off", () => {
    const never = demo();
    expect(isSettingEnabled(setting(DISPLAY_SETTING.OFF_AFTER_S), never)).toBe(
      false,
    );

    for (const mode of [1, 2]) {
      const on = withValue(demo(), DISPLAY_SETTING.OFF_MODE, mode);
      expect(isSettingEnabled(setting(DISPLAY_SETTING.OFF_AFTER_S), on)).toBe(
        true,
      );
    }
  });

  it("waits for the toast to be on", () => {
    const off = withValue(demo(), DISPLAY_SETTING.TOAST, 0);
    expect(isSettingEnabled(setting(DISPLAY_SETTING.TOAST_MS), off)).toBe(
      false,
    );
    expect(isSettingEnabled(setting(DISPLAY_SETTING.TOAST_MS), demo())).toBe(
      true,
    );
  });

  it("leaves the other settings always enabled", () => {
    const settings = withValue(
      withValue(demo(), DISPLAY_SETTING.TOAST, 0),
      DISPLAY_SETTING.OFF_MODE,
      0,
    );

    for (const id of [1, 2, 3, 5]) {
      expect(isSettingEnabled(setting(id), settings)).toBe(true);
    }
  });

  it("does not turn a setting off when the keyboard has no setting to wait for", () => {
    const onlyTime = [setting(DISPLAY_SETTING.OFF_AFTER_S)];

    expect(isSettingEnabled(onlyTime[0], onlyTime)).toBe(true);
  });
});

describe("clampSetting", () => {
  const range = { min: 0, max: 255 };

  it("keeps a value that is inside the range", () => {
    expect(clampSetting(range, 100)).toBe(100);
    expect(clampSetting(range, 0)).toBe(0);
    expect(clampSetting(range, 255)).toBe(255);
  });

  it("holds a value inside the range", () => {
    expect(clampSetting(range, -5)).toBe(0);
    expect(clampSetting(range, 300)).toBe(255);
    expect(clampSetting({ min: 30, max: 3600 }, 10)).toBe(30);
  });

  it("rounds to a whole number", () => {
    expect(clampSetting(range, 99.6)).toBe(100);
    expect(clampSetting(range, 99.4)).toBe(99);
  });

  it("falls back to the minimum for what is not a number", () => {
    expect(clampSetting({ min: 30, max: 3600 }, Number.NaN)).toBe(30);
  });
});

describe("planChange", () => {
  it("gives the settings as they will be and the value to send", () => {
    const before = demo();

    const plan = planChange(before, DISPLAY_SETTING.LEFT_CONTRAST, 200);

    expect(plan?.value).toBe(200);
    expect(plan?.settings.find((s) => s.id === 1)?.value).toBe(200);
    // The settings it was given stay as they were.
    expect(before.find((s) => s.id === 1)?.value).toBe(128);
  });

  it("shares the settings it does not change", () => {
    const before = demo();

    const plan = planChange(before, 1, 200);

    expect(plan?.settings[1]).toBe(before[1]);
    expect(plan?.settings[0]).not.toBe(before[0]);
  });

  it("holds the value inside the range of the keyboard", () => {
    expect(planChange(demo(), 1, 999)?.value).toBe(255);
    expect(planChange(demo(), 4, 5)?.value).toBe(30);
  });

  it("does nothing for the value the setting already has", () => {
    expect(planChange(demo(), 1, 128)).toBeNull();
    // Nor when the clamped value is the one it has.
    const full = withValue(demo(), 1, 255);
    expect(planChange(full, 1, 1000)).toBeNull();
  });

  it("does nothing for a setting the keyboard does not have", () => {
    expect(planChange(demo(), 99, 1)).toBeNull();
  });
});

describe("allDefault", () => {
  it("is true while every setting has the value it was built with", () => {
    expect(allDefault(demo())).toBe(true);
    expect(allDefault([])).toBe(true);
  });

  it("is false when one setting differs", () => {
    expect(allDefault(withValue(demo(), 6, 2000))).toBe(false);
  });
});
