/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import type { FirmwareDetails } from "../live/liveProtocol";
import type { LiveReading } from "../live/liveStatusPoller";
import {
  buildReport,
  describeBattery,
  describeBuild,
  describeLayer,
  describeOutput,
  describePeripheral,
  formatBytes,
  formatUptime,
  memoryUse,
  NOT_KNOWN,
} from "./diagnosticsModel";

const INFO: FirmwareDetails = {
  keyboard: "Corne",
  board: "nice_nano",
  zephyr: "4.1.0",
  buildId: "5940fcd",
  buildBranch: "main",
  buildNumber: 123,
  buildDate: "2026-10-25",
  flashTotal: 811008,
  flashUsed: 438604,
  ramTotal: 262144,
  ramUsed: 153752,
};

const LIVE: LiveReading = {
  batteryCentral: 61,
  batteryPeripheral: null,
  peripheralConnected: false,
  layerIndex: 3,
  layerName: "Nav",
  wpm: 42,
  output: "usb",
  bleProfile: 2,
  bleState: "open",
  usbState: "hid",
  uptimeS: 3725,
  wpmHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 42],
};

describe("formatBytes", () => {
  it("writes the bytes with thousands, and the KiB beside them from one KiB up", () => {
    expect(formatBytes(438604)).toBe("438,604 B (428.3 KiB)");
    expect(formatBytes(1024)).toBe("1,024 B (1.0 KiB)");
    expect(formatBytes(811008)).toBe("811,008 B (792.0 KiB)");
  });

  it("writes only the bytes under one KiB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1,023 B");
  });

  it("never writes a negative size", () => {
    expect(formatBytes(-5)).toBe("0 B");
  });
});

describe("memoryUse", () => {
  it("gives the free memory and the percent used, with one decimal", () => {
    expect(memoryUse(438604, 811008)).toEqual({
      used: 438604,
      total: 811008,
      free: 372404,
      percentUsed: 54.1,
      level: "ok",
    });
    expect(memoryUse(153752, 262144)).toMatchObject({
      free: 108392,
      percentUsed: 58.7,
      level: "ok",
    });
  });

  it("says tight under 15 percent free and full under 3 percent", () => {
    expect(memoryUse(86, 100)?.level).toBe("tight");
    expect(memoryUse(85, 100)?.level).toBe("ok");
    expect(memoryUse(98, 100)?.level).toBe("full");
    expect(memoryUse(97, 100)?.level).toBe("tight");
  });

  it("holds a use beyond the total at the total", () => {
    expect(memoryUse(150, 100)).toMatchObject({
      used: 100,
      free: 0,
      percentUsed: 100,
      level: "full",
    });
    expect(memoryUse(-3, 100)).toMatchObject({ used: 0, free: 100 });
  });

  it("is null when the total is not known", () => {
    expect(memoryUse(10, 0)).toBeNull();
    expect(memoryUse(10, -1)).toBeNull();
    expect(memoryUse(10, Number.NaN)).toBeNull();
  });
});

describe("formatUptime", () => {
  it("writes seconds, minutes, hours and days", () => {
    expect(formatUptime(0)).toBe("0 s");
    expect(formatUptime(45)).toBe("45 s");
    expect(formatUptime(185)).toBe("3 min 05 s");
    expect(formatUptime(3725)).toBe("1 h 02 min");
    expect(formatUptime(93600)).toBe("1 d 2 h");
  });

  it("rounds down, and never writes a negative time", () => {
    expect(formatUptime(59.9)).toBe("59 s");
    expect(formatUptime(-4)).toBe("0 s");
  });
});

describe("the words for the state", () => {
  it("writes a battery, or that there is no reading", () => {
    expect(describeBattery(61)).toBe("61%");
    expect(describeBattery(0)).toBe("0%");
    expect(describeBattery(null)).toBe("No reading");
  });

  it("says where the keys go", () => {
    expect(describeOutput(LIVE)).toBe("USB (the computer uses the keyboard)");
    expect(describeOutput({ ...LIVE, usbState: "powered" })).toBe(
      "USB (only power)",
    );
    expect(describeOutput({ ...LIVE, output: "none" })).toBe(
      "Nothing (no USB and no Bluetooth host)",
    );
  });

  it("numbers the Bluetooth profiles from 1, like the screen", () => {
    const ble = { ...LIVE, output: "ble" as const };

    expect(describeOutput({ ...ble, bleState: "connected" })).toBe(
      "Bluetooth, profile 3 (connected)",
    );
    expect(describeOutput({ ...ble, bleState: "paired" })).toBe(
      "Bluetooth, profile 3 (paired, not connected)",
    );
    expect(describeOutput({ ...ble, bleState: "open" })).toBe(
      "Bluetooth, profile 3 (open, waiting for a host)",
    );
  });

  it("says whether the other half is there", () => {
    expect(describePeripheral(LIVE)).toBe("Not connected");
    expect(describePeripheral({ ...LIVE, peripheralConnected: true })).toBe(
      "Connected",
    );
  });

  it("writes the layer with its name, or says it has none", () => {
    expect(describeLayer(LIVE)).toBe("Nav (layer 3)");
    expect(describeLayer({ ...LIVE, layerName: "", layerIndex: 0 })).toBe(
      "No name (layer 0)",
    );
  });
});

describe("describeBuild", () => {
  it("joins what the firmware knows of the build", () => {
    expect(describeBuild(INFO)).toBe("main, commit 5940fcd, run 123, 2026-10-25");
  });

  it("leaves out what is not known", () => {
    expect(describeBuild({ ...INFO, buildBranch: "", buildNumber: null })).toBe(
      "commit 5940fcd, 2026-10-25",
    );
  });

  it("says so when nothing is known (a build made on a computer)", () => {
    expect(
      describeBuild({
        ...INFO,
        buildBranch: "",
        buildId: "",
        buildNumber: null,
        buildDate: "",
      }),
    ).toBe(NOT_KNOWN);
  });
});

describe("buildReport", () => {
  const now = new Date("2026-10-25T12:30:00.000Z");

  it("has the firmware, the memory and the state, one fact per line", () => {
    expect(
      buildReport({ info: INFO, live: LIVE, keyboardName: "Corne", now }),
    ).toBe(
      [
        "Report of ZMK Studio, 2026-10-25T12:30:00.000Z",
        "Keyboard name: Corne",
        "",
        "Firmware (left half, the one connected to the app)",
        "Keyboard: Corne",
        "Board: nice_nano",
        "Zephyr: 4.1.0",
        "Build: main, commit 5940fcd, run 123, 2026-10-25",
        "Flash: 438,604 B (428.3 KiB) used of 811,008 B (792.0 KiB), 372,404 B (363.7 KiB) free (54.1% used)",
        "RAM: 153,752 B (150.1 KiB) used of 262,144 B (256.0 KiB), 108,392 B (105.9 KiB) free (58.7% used)",
        "",
        "State when the report was made",
        "Left battery: 61%",
        "Right half: Not connected",
        "Right battery: No reading",
        "Layer: Nav (layer 3)",
        "Typing speed: 42 WPM",
        "Output: USB (the computer uses the keyboard)",
        "Up for: 1 h 02 min",
        "",
      ].join("\n"),
    );
  });

  it("leaves out the sections it has nothing for", () => {
    const text = buildReport({ info: null, live: null, now });

    expect(text).toBe("Report of ZMK Studio, 2026-10-25T12:30:00.000Z\n");
  });

  it("says Not known for a memory the firmware gave no size for", () => {
    const text = buildReport({
      info: { ...INFO, flashTotal: 0, ramTotal: 0, board: "" },
      live: null,
      now,
    });

    expect(text).toContain("Flash: Not known");
    expect(text).toContain("RAM: Not known");
    expect(text).toContain("Board: Not known");
  });
});
