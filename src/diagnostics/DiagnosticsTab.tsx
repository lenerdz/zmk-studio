/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The Diagnostics tab: what firmware the left half runs (the one connected to
 * this app), how much of its flash and RAM the program takes, and what the
 * keyboard is doing now (batteries, link, layer, speed, output). Nothing here
 * changes anything on the keyboard: it only reads. The numbers come from the
 * requests get_firmware_info and get_live_status of zmk-studio-messages.
 */
import { useState, type ReactNode } from "react";
import { ClipboardCopy } from "lucide-react";
import { useLiveStatus } from "../live/useLiveStatus";
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
  type MemoryLevel,
} from "./diagnosticsModel";
import type { FirmwareInfoState } from "./useFirmwareInfo";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

const Notice = ({ children }: { children: ReactNode }) => (
  <div className="grid place-items-center bg-base-300 min-h-0 min-w-0 p-6 text-center">
    <div className="max-w-prose">{children}</div>
  </div>
);

const BAR_COLOR: Record<MemoryLevel, string> = {
  ok: "bg-primary",
  tight: "bg-amber-500",
  full: "bg-red-600",
};

const LEVEL_TEXT: Record<MemoryLevel, string> = {
  ok: "Plenty left.",
  tight: "Getting tight: less than 15% is free.",
  full: "Almost full: less than 3% is free.",
};

/** How much of a memory the program takes: a bar and the numbers. */
const MemoryBar = ({
  label,
  used,
  total,
  hint,
}: {
  label: string;
  used: number;
  total: number;
  hint: string;
}) => {
  const use = memoryUse(used, total);

  if (use === null) {
    return (
      <div className="flex flex-col gap-1">
        <span>{label}</span>
        <span className="opacity-70">
          {NOT_KNOWN}: this firmware did not say the size.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono">{use.percentUsed}% used</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={use.percentUsed}
        className="h-3 overflow-hidden rounded bg-base-100"
      >
        <div
          className={`h-full ${BAR_COLOR[use.level]}`}
          style={{ width: `${use.percentUsed}%` }}
        />
      </div>
      <p>
        {formatBytes(use.used)} used of {formatBytes(use.total)}.{" "}
        <strong>{formatBytes(use.free)} free.</strong> {LEVEL_TEXT[use.level]}
      </p>
      <p className="opacity-70">{hint}</p>
    </div>
  );
};

/** One line of a list of facts: a name and its value. */
const Fact = ({ name, children }: { name: string; children: ReactNode }) => (
  <>
    <dt className="opacity-70">{name}</dt>
    <dd className="font-mono break-words">{children}</dd>
  </>
);

export interface DiagnosticsTabProps {
  firmware: FirmwareInfoState;
  /** The name the keyboard gave itself to the app. */
  keyboardName?: string;
}

export const DiagnosticsTab = ({
  firmware,
  keyboardName,
}: DiagnosticsTabProps) => {
  // The state of the keyboard is asked once a second while this tab is open.
  const live = useLiveStatus(firmware.status === "ready", 1000);
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");

  if (firmware.status === "idle") {
    return <Notice>Unlock the keyboard to read its firmware.</Notice>;
  }

  if (firmware.status === "loading") {
    return <Notice>Reading the firmware information from the keyboard...</Notice>;
  }

  if (firmware.status === "unsupported" || firmware.info === null) {
    return (
      <Notice>
        {firmware.status === "error"
          ? `The firmware information could not be read from the keyboard: ${firmware.error}`
          : "This firmware cannot tell what it is. That comes with the zmk-rgb-matrix module of lenerdz (option CONFIG_KEYPAW_DEVICE_STATUS_STUDIO) and the zmk-studio-messages fork (see the README of this app)."}
      </Notice>
    );
  }

  const info = firmware.info;
  const reading = live.reading;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        buildReport({ info, live: reading, keyboardName, now: new Date() }),
      );
      setCopied("yes");
    } catch (e) {
      console.error("Failed to copy the report", e);
      setCopied("failed");
    }
  };

  return (
    <div className="bg-base-300 min-h-0 min-w-0 overflow-y-auto p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="font-semibold">Diagnostics</h2>
          <p className="opacity-70">
            What the left half, the one connected to this app, says about its
            firmware and its memory, and what the keyboard is doing now. This tab
            only reads: nothing here changes the keyboard. The right half runs a
            firmware of its own; from here only its battery and its connection
            are known.
          </p>
        </header>

        <section
          aria-label="Firmware"
          className="flex flex-col gap-2 rounded bg-base-200 p-3"
        >
          <h3 className="font-semibold">Firmware</h3>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            <Fact name="Keyboard">{info.keyboard || NOT_KNOWN}</Fact>
            <Fact name="Board">{info.board || NOT_KNOWN}</Fact>
            <Fact name="Zephyr">{info.zephyr || NOT_KNOWN}</Fact>
            <Fact name="Build">{describeBuild(info)}</Fact>
          </dl>
          {info.buildId === "" &&
            info.buildBranch === "" &&
            info.buildNumber === null && (
              <p className="opacity-70">
                A firmware built on a computer (and not by the workflow of the
                repository) does not know its commit, branch and run.
              </p>
            )}
        </section>

        <section
          aria-label="Memory"
          className="flex flex-col gap-4 rounded bg-base-200 p-3"
        >
          <h3 className="font-semibold">Memory of the left half</h3>
          <MemoryBar
            label="Flash"
            used={info.flashUsed}
            total={info.flashTotal}
            hint="The code partition: the part of the chip reserved for the program. The storage of the settings and the bootloader are outside it."
          />
          <MemoryBar
            label="RAM"
            used={info.ramUsed}
            total={info.ramTotal}
            hint="What the program reserves when it starts. The stacks and the buffers that grow while it runs come out of what is free."
          />
        </section>

        <section
          aria-label="Now"
          className="flex flex-col gap-2 rounded bg-base-200 p-3"
        >
          <h3 className="font-semibold">Now</h3>
          {reading ? (
            <>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                <Fact name="Left battery">
                  {describeBattery(reading.batteryCentral)}
                </Fact>
                <Fact name="Right half">{describePeripheral(reading)}</Fact>
                <Fact name="Right battery">
                  {describeBattery(reading.batteryPeripheral)}
                </Fact>
                <Fact name="Layer">{describeLayer(reading)}</Fact>
                <Fact name="Typing speed">{reading.wpm} WPM</Fact>
                <Fact name="Output">{describeOutput(reading)}</Fact>
                <Fact name="Up for">{formatUptime(reading.uptimeS)}</Fact>
              </dl>
              <p className="opacity-70">
                Asked of the keyboard once a second while this tab is open, which
                also keeps ZMK Studio unlocked. The Bluetooth profiles are
                numbered from 1, like on the screen; the Keys tab counts from 0.
              </p>
            </>
          ) : live.status === "unsupported" ? (
            <p className="opacity-70">This firmware cannot tell its state.</p>
          ) : live.status === "error" ? (
            <p role="alert" className="text-red-600">
              The state of the keyboard could not be read
              {live.error ? `: ${live.error}` : "."}
            </p>
          ) : (
            <p className="opacity-70">Reading the state of the keyboard...</p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BUTTON} onClick={() => void copy()}>
            <ClipboardCopy className="w-4" aria-hidden="true" />
            Copy the report
          </button>
          <span role="status" className="opacity-70">
            {copied === "yes"
              ? "Copied. Paste it into a message or an issue."
              : copied === "failed"
                ? "The browser did not let the app copy. Select the text above instead."
                : "Plain text with everything on this tab, to paste into a message or an issue."}
          </span>
        </div>
      </div>
    </div>
  );
};
