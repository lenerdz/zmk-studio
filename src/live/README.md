# Live status

What the keyboard is doing right now, read by the app while somebody looks at it. It feeds
the **Live values** of the [OLED tab](../oled/README.md), which draw the widgets from the
real battery, layer, typing speed and connection instead of from samples, and the
[Diagnostics tab](../diagnostics/README.md), which shows the same readings next to the
firmware information.

It needs a firmware with the status requests: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`; the option `CONFIG_KEYPAW_DEVICE_STATUS_STUDIO`, on by default with the
Studio RPC and only meaningful in the central half) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). With any other firmware the keyboard
answers "RPC not found" to the first request: the OLED tab keeps its samples and the
Diagnostics tab is not offered.

## The requests

Two read only requests in the keymap subsystem of ZMK Studio, with the tags after the ones
of the display settings. Both need an unlocked keyboard (the firmware marks them as
secured), and each one restarts the idle timer of the lock of ZMK Studio when the firmware
has `CONFIG_ZMK_STUDIO_LOCKING`.

| Request | Tag | What it does |
|---|---|---|
| `get_live_status` | 109 | What the central half is doing now (the table below) |
| `get_firmware_info` | 110 | What firmware it runs and how much memory the program takes (see the [Diagnostics tab](../diagnostics/README.md)) |

What `get_live_status` answers, and what the app makes of each field:

| Field | Meaning | In the app |
|---|---|---|
| `battery_central` | Percent of the left half | 0 to 100; `null` when the half has no reading (the firmware sends 255) |
| `battery_peripheral` | Percent of the right half, as the left one knows it | The same; `null` while the right half has not reported |
| `peripheral_connected` | Whether the left half sees the right one | As it is |
| `layer_index`, `layer_name` | The highest active layer, and its name | The name is empty when the layer has none |
| `wpm` | Words per minute now | As it is |
| `output` | Where the keys go | `none`, `usb` or `ble` |
| `ble_profile` | The selected Bluetooth profile | From 0 (the screens show it from 1) |
| `ble_state` | The state of that profile | `open` (no host paired, the keyboard advertises), `paired` (a host is paired but not connected) or `connected` |
| `usb_state` | The USB connector | `none`, `powered` (power only) or `hid` (a host uses the keyboard) |
| `uptime_s` | Seconds since the keyboard started | As it is |

The numbers describe the **central** (left) half, the one on USB. Of the right half the
central only knows the battery it reported and whether it is connected.

## How the app asks

The keyboard has no notification for this: it answers one question at a time, so the app
asks again and again, but only while somebody looks. `liveStatusPoller.ts` does it without
React and `useLiveStatus.ts` carries it into React.

- **Only while it is looked at.** `useLiveStatus(enabled, intervalMs)` asks only while
  `enabled` is true (the **Live values** switch of the OLED tab, or the Diagnostics tab
  being open), the keyboard is connected and it is unlocked. Asking restarts the idle timer
  of the lock of ZMK Studio, so a keyboard whose firmware has `CONFIG_ZMK_STUDIO_LOCKING`
  would never lock while the app polled it for nothing.
- **One question at a time.** The next question is asked after the answer, so a slow link
  is not flooded: 500 ms after an answer in the OLED tab, 1000 ms in the Diagnostics tab.
- **Nothing while the page is hidden.** While `document.visibilityState` is `hidden` (the
  tab of the browser is in the background) it asks nothing and looks again every second.
- **The history of the typing speed.** The screen keeps the last ten readings of the speed
  for its graph, one a second, the oldest first, and the poller keeps the same list: an
  entry every 1000 ms (not at every answer), and the first reading puts the speed of now
  last and zeros before it, as the screen starts. The graph widget of the OLED tab draws
  the part of the list that the panel shows.
- **Giving up.** After three failures in a row it stops and the state is `error` (with the
  last reading kept); an answer in between starts the count over. A firmware without the
  request makes it stop at once, with the state `unsupported`.

The states are `idle` (nobody looks, or the keyboard is not there), `loading`, `ready`,
`unsupported` and `error`.

## Files

| File | What it is |
|---|---|
| `liveProtocol.ts` | The two requests (`fetchLiveStatus`, `fetchFirmwareInfo`), `null` when the firmware does not have them, and the conversion of the messages: 255 to `null` for a battery, the names of the states |
| `liveStatusPoller.ts` | The poller described above, without React, and the history of the speed |
| `useLiveStatus.ts` | Carries the state of a poller into React |
| `demo/demoStatus.ts` | The answers of the [demo keyboard](../lights/demo/README.md): a keyboard in use, which follows a clock |
| `*.test.ts` | The tests |

## Tests

`npm test` covers the conversion of the messages (the 255 of a battery, 0 and 100, the names
of the states, the run number nobody knows), the two requests against the demo keyboard
(through the real framing and message encoding, and a keyboard without them), and the
poller with fake timers: the first reading, the interval, one question at a time, the
history of the speed once a second, a firmware without the request, a failure and the
count over again, giving up after three and keeping the last reading, `stop` dropping an
answer that was on its way, not starting twice, and not asking while the page is hidden.

## Status on a real keyboard

The requests and the poller were tried against the demo keyboard in a browser that is really
shown (a headless Microsoft Edge: the page of the embedded browser of the editor reports
itself as hidden, and the poller asks nothing then): the values changed over time and the
widgets followed them. The firmware side compiles in the CI of corne-zmk. **It has not been
tried on a real keyboard**: whether the battery, the layer, the typing speed, the output,
the Bluetooth state and the connection of the right half match what the keyboard does, and
what the polling does to the lock timer of a firmware that has it, are unconfirmed.
