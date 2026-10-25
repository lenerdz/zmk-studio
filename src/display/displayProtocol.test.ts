/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The requests of the display settings against the demo keyboard, through the
 * same framing and message encoding the app uses with a real keyboard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDemo } from "../lights/testUtils";
import { DEMO_DISPLAY_SETTINGS } from "./demo/demoDisplay";
import {
  DisplayRpcError,
  fetchDisplayInfo,
  restoreDisplayDefaults,
  sendDisplaySetting,
} from "./displayProtocol";

beforeEach(() => {
  // The app logs every request and answer.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchDisplayInfo", () => {
  it("lists the settings with their ranges and defaults", async () => {
    const { conn } = connectDemo();

    expect(await fetchDisplayInfo(conn)).toEqual([...DEMO_DISPLAY_SETTINGS]);
  });

  it("gives the fifteen display settings first, then the OLED layout, by id", async () => {
    const { conn } = connectDemo();

    const ids = (await fetchDisplayInfo(conn))?.map((s) => s.id) ?? [];
    expect(ids.slice(0, 15)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    // 17 settings of the right screen (the picture has nine) and 24 of the left one
    expect(ids.slice(15)).toHaveLength(41);
    expect(ids.slice(15).every((id) => id >= 16)).toBe(true);
  });

  it("gives null for a keyboard without the display settings", async () => {
    const { conn } = connectDemo({ display: false });

    expect(await fetchDisplayInfo(conn)).toBeNull();
  });
});

describe("sendDisplaySetting", () => {
  it("changes a setting and the keyboard keeps the value", async () => {
    const { conn, device } = connectDemo();

    await sendDisplaySetting(conn, 1, 200);

    expect(device.displayValue(1)).toBe(200);
    const settings = await fetchDisplayInfo(conn);
    expect(settings?.find((s) => s.id === 1)?.value).toBe(200);
    // The other ones stay as they were.
    expect(settings?.find((s) => s.id === 2)?.value).toBe(128);
  });

  it("accepts the ends of the range", async () => {
    const { conn, device } = connectDemo();

    await sendDisplaySetting(conn, 1, 0);
    expect(device.displayValue(1)).toBe(0);
    await sendDisplaySetting(conn, 1, 255);
    expect(device.displayValue(1)).toBe(255);
  });

  it("fails for a setting the keyboard does not have", async () => {
    const { conn } = connectDemo();

    const failure = sendDisplaySetting(conn, 99, 1);
    await expect(failure).rejects.toBeInstanceOf(DisplayRpcError);
    await expect(failure).rejects.toThrow(/does not have the setting 99/);
  });

  it("fails for a value outside the range and keeps the old one", async () => {
    const { conn, device } = connectDemo();

    const failure = sendDisplaySetting(conn, 1, 300);
    await expect(failure).rejects.toBeInstanceOf(DisplayRpcError);
    await expect(failure).rejects.toThrow(
      /does not accept 300 for the setting 1/,
    );
    expect(device.displayValue(1)).toBe(128);
  });

  it("fails when the firmware has no display settings", async () => {
    const { conn } = connectDemo({ display: false });

    await expect(sendDisplaySetting(conn, 1, 100)).rejects.toThrow();
  });
});

describe("restoreDisplayDefaults", () => {
  it("puts every setting back and says what the keyboard has now", async () => {
    const { conn, device } = connectDemo();
    await sendDisplaySetting(conn, 1, 10);
    await sendDisplaySetting(conn, 3, 2);
    await sendDisplaySetting(conn, 6, 5000);

    const settings = await restoreDisplayDefaults(conn);

    expect(settings).toEqual([...DEMO_DISPLAY_SETTINGS]);
    expect(device.displayValue(1)).toBe(128);
    expect(device.displayValue(3)).toBe(0);
    expect(device.displayValue(6)).toBe(1500);
  });
});
