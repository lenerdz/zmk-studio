/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The live status and the firmware information against the demo keyboard,
 * through the same framing and message encoding the app uses with a real keyboard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LiveBleState,
  LiveOutput,
  LiveUsbState,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { connectDemo } from "../lights/testUtils";
import {
  fetchFirmwareInfo,
  fetchLiveStatus,
  toFirmwareDetails,
  toLiveStatus,
} from "./liveProtocol";

beforeEach(() => {
  // The app logs every request and answer.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const message = {
  batteryCentral: 80,
  batteryPeripheral: 255,
  peripheralConnected: false,
  layerIndex: 2,
  layerName: "Nav",
  wpm: 61,
  output: LiveOutput.LIVE_OUTPUT_BLE,
  bleProfile: 3,
  bleState: LiveBleState.LIVE_BLE_PAIRED,
  usbState: LiveUsbState.LIVE_USB_POWERED,
  uptimeS: 99,
};

describe("toLiveStatus", () => {
  it("takes the 255 of a battery that was not read for null", () => {
    const status = toLiveStatus(message);

    expect(status.batteryCentral).toBe(80);
    expect(status.batteryPeripheral).toBeNull();
    expect(toLiveStatus({ ...message, batteryCentral: 255 }).batteryCentral)
      .toBeNull();
  });

  it("keeps 0 and 100 as readings, and holds a stray number inside them", () => {
    expect(toLiveStatus({ ...message, batteryCentral: 0 }).batteryCentral).toBe(
      0,
    );
    expect(
      toLiveStatus({ ...message, batteryCentral: 100 }).batteryCentral,
    ).toBe(100);
    expect(
      toLiveStatus({ ...message, batteryCentral: 200 }).batteryCentral,
    ).toBe(100);
  });

  it("names the output, the Bluetooth state and the USB state", () => {
    expect(toLiveStatus(message)).toMatchObject({
      output: "ble",
      bleState: "paired",
      usbState: "powered",
    });
    expect(
      toLiveStatus({
        ...message,
        output: LiveOutput.LIVE_OUTPUT_USB,
        bleState: LiveBleState.LIVE_BLE_CONNECTED,
        usbState: LiveUsbState.LIVE_USB_HID,
      }),
    ).toMatchObject({ output: "usb", bleState: "connected", usbState: "hid" });
    expect(
      toLiveStatus({
        ...message,
        output: LiveOutput.LIVE_OUTPUT_NONE,
        bleState: LiveBleState.LIVE_BLE_OPEN,
        usbState: LiveUsbState.LIVE_USB_NONE,
      }),
    ).toMatchObject({ output: "none", bleState: "open", usbState: "none" });
  });

  it("copies the rest as it is", () => {
    expect(toLiveStatus(message)).toMatchObject({
      peripheralConnected: false,
      layerIndex: 2,
      layerName: "Nav",
      wpm: 61,
      bleProfile: 3,
      uptimeS: 99,
    });
  });
});

describe("toFirmwareDetails", () => {
  const info = {
    keyboard: "Corne",
    board: "nice_nano",
    zephyr: "4.1.0",
    buildId: "abc1234",
    buildBranch: "main",
    buildNumber: 77,
    buildDate: "2026-10-25",
    flashTotal: 811008,
    flashUsed: 1000,
    ramTotal: 262144,
    ramUsed: 2000,
  };

  it("copies what the firmware says", () => {
    expect(toFirmwareDetails(info)).toEqual(info);
  });

  it("takes the 0 of a run number nobody knows for null", () => {
    expect(toFirmwareDetails({ ...info, buildNumber: 0 }).buildNumber).toBeNull();
  });
});

describe("fetchLiveStatus", () => {
  it("reads what the keyboard is doing", async () => {
    const { conn } = connectDemo({ clock: () => 5000 });

    const status = await fetchLiveStatus(conn);

    expect(status).toMatchObject({
      batteryCentral: 86,
      batteryPeripheral: 91,
      peripheralConnected: true,
      layerIndex: 0,
      output: "usb",
      usbState: "hid",
      bleState: "connected",
    });
    expect(status?.layerName).not.toBe("");
  });

  it("follows the clock of the keyboard", async () => {
    let now = 1_000_000;
    const { conn } = connectDemo({ clock: () => now });

    const first = await fetchLiveStatus(conn);
    now += 4000;
    const second = await fetchLiveStatus(conn);

    expect(first?.layerIndex).toBe(0);
    expect(second?.layerIndex).toBe(1);
    expect((second?.uptimeS ?? 0) - (first?.uptimeS ?? 0)).toBe(4);
  });

  it("gives null for a keyboard without the request", async () => {
    const { conn } = connectDemo({ status: false });

    expect(await fetchLiveStatus(conn)).toBeNull();
  });
});

describe("fetchFirmwareInfo", () => {
  it("tells the firmware and how much memory it takes", async () => {
    const { conn } = connectDemo();

    const info = await fetchFirmwareInfo(conn);

    expect(info).toMatchObject({
      keyboard: "Corne",
      board: "nice_nano",
      flashTotal: 811008,
      flashUsed: 438604,
      ramTotal: 262144,
      ramUsed: 153752,
    });
    expect(info?.buildNumber).toBe(123);
  });

  it("gives null for a keyboard without the request", async () => {
    const { conn } = connectDemo({ status: false });

    expect(await fetchFirmwareInfo(conn)).toBeNull();
  });
});
