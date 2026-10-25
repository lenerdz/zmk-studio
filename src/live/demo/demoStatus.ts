/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The live status and the firmware information of the demo keyboard
 * (src/lights/demo/demoDevice.ts): a keyboard that is in use, so the preview of
 * the OLED tab has something to show. Everything follows the clock, which a test
 * can set, so the values are predictable: the layer changes every 4 seconds
 * among the first three, the speed swings between 20 and 80 words per minute and
 * the batteries go down one point a minute.
 *
 * The numbers of the firmware are the ones of the left half of the build of
 * lenerdz/corne-zmk (the FLASH and RAM lines of its log), written here on purpose.
 */
import {
  LiveBleState,
  LiveOutput,
  LiveUsbState,
  type FirmwareInfo,
  type LiveStatus,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";

/** The layers the demo keyboard walks through, as many as it has. */
const LAYERS_WALKED = 3;

/** Seconds the keyboard had run when the demo started. */
const START_UPTIME_S = 754;

export class DemoStatus {
  private readonly clock: () => number;
  private readonly startedAt: number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
    this.startedAt = clock();
  }

  private elapsedS(): number {
    return Math.max(0, Math.floor((this.clock() - this.startedAt) / 1000));
  }

  /**
   * What the keyboard is doing now.
   * @param layerNames the names of the layers of the keymap, in order
   */
  live(layerNames: readonly string[]): LiveStatus {
    const elapsed = this.elapsedS();
    const layers = Math.max(1, Math.min(LAYERS_WALKED, layerNames.length));
    const layerIndex = Math.floor(elapsed / 4) % layers;
    const minutes = Math.floor(elapsed / 60);

    return {
      batteryCentral: Math.max(5, 86 - minutes),
      batteryPeripheral: Math.max(5, 91 - minutes),
      peripheralConnected: true,
      layerIndex,
      layerName: layerNames[layerIndex] ?? "",
      wpm: Math.round(50 + 30 * Math.sin(elapsed / 2.5)),
      output: LiveOutput.LIVE_OUTPUT_USB,
      bleProfile: 1,
      bleState: LiveBleState.LIVE_BLE_CONNECTED,
      usbState: LiveUsbState.LIVE_USB_HID,
      uptimeS: START_UPTIME_S + elapsed,
    };
  }

  /** What the firmware is. */
  firmware(): FirmwareInfo {
    return {
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
  }
}
