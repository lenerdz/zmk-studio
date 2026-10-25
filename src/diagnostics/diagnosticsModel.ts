/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What the Diagnostics tab says, as plain functions: the sizes, the memory that
 * is left, the words for the state of the keyboard and the text of the report
 * that can be copied. The tab (DiagnosticsTab.tsx) only lays them out.
 */
import type { FirmwareDetails } from "../live/liveProtocol";
import type { LiveReading } from "../live/liveStatusPoller";

/** What is written where the keyboard did not say. */
export const NOT_KNOWN = "Not known";

/** A size as "438,604 B (428.3 KiB)"; under one KiB only the bytes. */
export function formatBytes(bytes: number): string {
  const whole = Math.max(Math.round(bytes), 0);
  const written = `${whole.toLocaleString("en-US")} B`;

  return whole < 1024
    ? written
    : `${written} (${(whole / 1024).toFixed(1)} KiB)`;
}

/** How full a memory is: plenty left, getting tight, or practically full. */
export type MemoryLevel = "ok" | "tight" | "full";

export interface MemoryUse {
  used: number;
  total: number;
  free: number;
  /** From 0 to 100, with one decimal. */
  percentUsed: number;
  level: MemoryLevel;
}

/** Less than this share free is "tight". */
export const TIGHT_FREE_SHARE = 0.15;
/** Less than this share free is "full". */
export const FULL_FREE_SHARE = 0.03;

/**
 * The use of a memory of `total` bytes of which the program takes `used`. Null
 * when the total is not known (zero), so nothing wrong is drawn.
 */
export function memoryUse(used: number, total: number): MemoryUse | null {
  if (!(total > 0)) {
    return null;
  }

  const taken = Math.min(Math.max(used, 0), total);
  const free = total - taken;
  const freeShare = free / total;

  return {
    used: taken,
    total,
    free,
    percentUsed: Math.round((taken / total) * 1000) / 10,
    level:
      freeShare < FULL_FREE_SHARE
        ? "full"
        : freeShare < TIGHT_FREE_SHARE
          ? "tight"
          : "ok",
  };
}

const two = (n: number) => String(n).padStart(2, "0");

/** Time since the keyboard started: "45 s", "3 min 05 s", "2 h 07 min", "1 d 3 h". */
export function formatUptime(seconds: number): string {
  const total = Math.max(Math.floor(seconds), 0);

  if (total < 60) {
    return `${total} s`;
  }

  if (total < 3600) {
    return `${Math.floor(total / 60)} min ${two(total % 60)} s`;
  }

  if (total < 86400) {
    return `${Math.floor(total / 3600)} h ${two(Math.floor((total % 3600) / 60))} min`;
  }

  return `${Math.floor(total / 86400)} d ${Math.floor((total % 86400) / 3600)} h`;
}

/** A battery level: "61%", or that there is no reading. */
export function describeBattery(level: number | null): string {
  return level === null ? "No reading" : `${level}%`;
}

/** Where the keys go, in a sentence the user can use. */
export function describeOutput(live: LiveReading): string {
  switch (live.output) {
    case "usb":
      return live.usbState === "hid"
        ? "USB (the computer uses the keyboard)"
        : "USB (only power)";
    case "ble": {
      const state =
        live.bleState === "connected"
          ? "connected"
          : live.bleState === "paired"
            ? "paired, not connected"
            : "open, waiting for a host";
      return `Bluetooth, profile ${live.bleProfile + 1} (${state})`;
    }
    default:
      return "Nothing (no USB and no Bluetooth host)";
  }
}

/** The other half, as the left one sees it. */
export function describePeripheral(live: LiveReading): string {
  return live.peripheralConnected ? "Connected" : "Not connected";
}

/** The layer as the screen writes it: its name, or its number when it has none. */
export function describeLayer(live: LiveReading): string {
  const name = live.layerName === "" ? "No name" : live.layerName;
  return `${name} (layer ${live.layerIndex})`;
}

/** The build, in one line, from what the firmware knows of it. */
export function describeBuild(info: FirmwareDetails): string {
  const parts: string[] = [];

  if (info.buildBranch !== "") {
    parts.push(info.buildBranch);
  }
  if (info.buildId !== "") {
    parts.push(`commit ${info.buildId}`);
  }
  if (info.buildNumber !== null) {
    parts.push(`run ${info.buildNumber}`);
  }
  if (info.buildDate !== "") {
    parts.push(info.buildDate);
  }

  return parts.length > 0 ? parts.join(", ") : NOT_KNOWN;
}

function memoryLine(label: string, used: number, total: number): string {
  const use = memoryUse(used, total);

  return use === null
    ? `${label}: ${NOT_KNOWN}`
    : `${label}: ${formatBytes(use.used)} used of ${formatBytes(use.total)}, ` +
        `${formatBytes(use.free)} free (${use.percentUsed}% used)`;
}

export interface ReportInput {
  info: FirmwareDetails | null;
  live: LiveReading | null;
  /** The name the keyboard gave itself to the app. */
  keyboardName?: string;
  /** When the report was made. */
  now: Date;
}

/**
 * The text of the report to paste into an issue or a message: the firmware
 * and the memory of the left half and, when it is known, what the keyboard was
 * doing. Plain text, one fact per line.
 */
export function buildReport({
  info,
  live,
  keyboardName,
  now,
}: ReportInput): string {
  const lines = [`Report of ZMK Studio, ${now.toISOString()}`];

  if (keyboardName) {
    lines.push(`Keyboard name: ${keyboardName}`);
  }

  if (info) {
    lines.push(
      "",
      "Firmware (left half, the one connected to the app)",
      `Keyboard: ${info.keyboard === "" ? NOT_KNOWN : info.keyboard}`,
      `Board: ${info.board === "" ? NOT_KNOWN : info.board}`,
      `Zephyr: ${info.zephyr === "" ? NOT_KNOWN : info.zephyr}`,
      `Build: ${describeBuild(info)}`,
      memoryLine("Flash", info.flashUsed, info.flashTotal),
      memoryLine("RAM", info.ramUsed, info.ramTotal),
    );
  }

  if (live) {
    lines.push(
      "",
      "State when the report was made",
      `Left battery: ${describeBattery(live.batteryCentral)}`,
      `Right half: ${describePeripheral(live)}`,
      `Right battery: ${describeBattery(live.batteryPeripheral)}`,
      `Layer: ${describeLayer(live)}`,
      `Typing speed: ${live.wpm} WPM`,
      `Output: ${describeOutput(live)}`,
      `Up for: ${formatUptime(live.uptimeS)}`,
    );
  }

  return `${lines.join("\n")}\n`;
}
