# Diagnostics tab

A page that tells what firmware the keyboard runs, how much of its flash and RAM the program
takes (and how much is left), and what the keyboard is doing now. It only reads: nothing in
this tab changes the keyboard. Its text can be copied as a report to paste into a message or
an issue.

It needs a firmware that answers the firmware information request: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`; the option `CONFIG_KEYPAW_DEVICE_STATUS_STUDIO`, on by default with the
Studio RPC) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). With any other firmware the keyboard
answers "RPC not found" and the tab is not offered.

The requests, and the polling of the part called **Now**, are in
[`../live`](../live/README.md).

## What it shows

The header has a view **Diagnostics**, the last one after **Files**. It shows what the **left
half** says, the one connected to the app: the right half runs a firmware of its own, and
from the app only its battery and whether it is connected are known.

- **Firmware**: the keyboard, the board, the Zephyr version and the build (the branch, the
  commit, the number of the run of the workflow and the day, UTC). The build is known when
  the firmware was built by the GitHub Actions workflow of the repository: the commit, the
  branch and the run number come from its environment, and a firmware built on a computer
  does not have them (the tab says so). The day of the build is always there.
- **Memory of the left half**: a bar and the numbers for the flash and for the RAM. The
  bar is green while there is plenty left, amber when less than 15% is free ("getting
  tight") and red when less than 3% is free ("almost full").
  - **Flash** is the code partition (811,008 bytes in the Corne of corne-zmk): the part of
    the chip reserved for the program, which is what the `FLASH` line of the build log
    counts. The storage of the settings and the bootloader are outside it.
  - **RAM** is what the program reserves when it starts (the `RAM` line of the build log).
    The stacks and the buffers that grow while it runs come out of what is free, so the
    free RAM shown is an upper bound of what is really left.
- **Now**: the batteries of both halves, whether the right half is connected, the layer (its
  name and its number), the typing speed, where the keys go (USB, and whether the computer
  uses the keyboard or it is only power; or Bluetooth, the profile from 1 and its state)
  and how long the keyboard has been on. It is read once a second while the tab is open,
  which also keeps ZMK Studio unlocked.
- **Copy the report**: puts on the clipboard a plain text with everything above, one fact
  per line, headed by the time it was made and the name the keyboard gave itself. When the
  browser does not let the app copy, the tab says so.

The numbers of the memory are the ones the build measured, not the free space of the
running keyboard. The same two numbers appear in the log of the build in the CI, and the
README of corne-zmk keeps the table of what was left after each release.

## Files

| File | What it is |
|---|---|
| `DiagnosticsTab.tsx` | The tab: the notices, the sections, the bars and the button |
| `diagnosticsModel.ts` | The plain functions the tab is built from: sizes (`formatBytes`), the memory that is left and its level (`memoryUse`), the time on (`formatUptime`), the words for the state of the keyboard and the text of the report (`buildReport`) |
| `useFirmwareInfo.ts` | Asks the keyboard once what firmware it runs, when it is connected and unlocked (it does not change while the keyboard runs, so there is nothing to poll) |
| `*.test.ts` | The tests |

`src/App.tsx` and `src/lights/appViews.ts` connect the tab to the rest of the app (the tab is
offered only when `get_firmware_info` is answered).

## Tests

`npm test` covers the sizes (thousands and KiB, negative numbers), the memory (the free
bytes, the percent with one decimal, tight under 15% free and full under 3%, a use beyond
the total, an unknown total), the uptime (seconds, minutes, hours and days, rounded down),
the words (a battery or its absence, where the keys go, the Bluetooth profiles counted from
1 like the screen, the other half, a layer with or without a name), the line of the build
(what is known, what is left out, nothing known) and the report (all the sections, the ones
left out, a memory with no size).

## Status on a real keyboard

The tab was tried against the demo keyboard in a browser that is really shown (a headless
Microsoft Edge): the firmware, the two bars, the **Now** values changing over time, and the
demo keyboard without the live status, which has no Diagnostics tab. The numbers of the demo
keyboard are the ones of the CI log of the left half of the build of corne-zmk (438,604
bytes of flash and 153,752 of RAM). The firmware side compiles in the CI of corne-zmk. **It
has not been tried on a real keyboard**: whether the numbers the keyboard reports are the
same as the ones in the CI log, and whether the right half's battery and connection match
what it does, are unconfirmed.
