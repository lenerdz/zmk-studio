# Display tab

An editor for the settings of the OLED screens of the keyboard: the contrast of each
screen, when the screens turn off, and the notice (the "toast") that the right screen
shows when the lights change. It needs a firmware with display settings: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`, built with `CONFIG_KEYPAW_DISPLAY_SETTINGS=y`), the
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork (which reads the toast
settings) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). With any other firmware the tab is not
offered (the keyboard answers "RPC not found" to the first request) and the app works
like the original ZMK Studio.

## What it does

The header has a third view, **Display**, next to **Keys** and **Lights** (each one only
when the firmware has what it edits). It has three groups of controls, whose names and
ranges come from the keyboard:

- **Contrast**: one slider for the left screen and one for the right screen.
- **Screen off**: when the screens turn off (**Never**, **Only on battery**, that is,
  while USB is not connected to that half, or **Always**) and a slider for how long the
  keyboard has to be left alone before that happens. The slider is disabled, and says
  why, while the screens are set to never turn off.
- **Light toast**: a switch for the notice that the right screen shows when the lights
  change (effect, brightness, on and off), and a slider for how long it stays. The slider
  is disabled while the switch is off.
- **Restore defaults**: puts every setting back to what the firmware was built with. It
  is disabled while nothing differs.

Unlike the keys and the lights, **there is nothing to save**: the keyboard applies each
change at once and keeps it in its own memory a few seconds after the last change
(`CONFIG_KEYPAW_DISPLAY_SAVE_DEBOUNCE_MS`, 3 s). So **Save** and **Discard** in the header
do not act on these settings and a change is **not a step of Undo and Redo**. **Restore
Stock Settings** (menu of the connected keyboard) puts them back to the defaults too, and
its confirmation says so for a firmware that has them.

A change also turns the screens on for at least ten seconds, so it can be seen (this is
done by the firmware). The right screen gets its settings from the left half, which can
take a few seconds after it connects.

A setting this version of the app does not know (a newer firmware) is not hidden: it is
shown as `Setting N`, in a group of its own, with a slider from the minimum to the maximum
the keyboard reports.

## The settings

The ids are the ones of `display_settings.c` in the zmk-rgb-matrix module. The app only
uses the ids to choose a name and a kind of control: the range, the value and the default
of every setting come from the keyboard.

| Id | Setting | Control | Range | Built with | Note |
|---|---|---|---|---|---|
| 1 | Left screen contrast | Slider | 0 to 255 | 128 | |
| 2 | Right screen contrast | Slider | 0 to 255 | 128 | |
| 3 | Turn the screen off | Three buttons | 0 Never, 1 Only on battery, 2 Always | 0 (Never) | Never is how the keyboard behaved before the setting existed |
| 4 | Time without activity before it goes off | Slider, step 10 s | 30 s to 1 h | 1 min | The minimum is the idle time of ZMK (30 s). Used only while setting 3 is not Never |
| 5 | Light toast on the right screen | Switch | 0 or 1 | 1 (On) | Needs the widget of zmk-nice-oled, which corne-zmk builds |
| 6 | Toast duration | Slider, step 0.1 s | 0.5 s to 5 s | 1.5 s | Used only while setting 5 is on |

## How the changes travel

The requests are in the keymap subsystem of ZMK Studio, with tags after the ones of the
light maps:

| Request | Tag | What it does |
|---|---|---|
| `get_display_info` | 106 | The settings of the keyboard: id, value, minimum, maximum and default of each. A firmware without them answers "RPC not found", and the tab is hidden |
| `set_display_setting` | 107 | Changes one setting, live. The answer is `OK`, `INVALID_ID` or `INVALID_VALUE` |
| `restore_display_defaults` | 108 | Puts every setting back to the defaults of the build, live, and returns the settings the keyboard has now |

There is no notification: the keyboard has no unsaved state for these settings.

A slider that is dragged asks for dozens of values per second, and the keyboard needs
only the ones where it rests. `displayWriter.ts` is the queue that sends them:

- one request at a time, never two in flight;
- while a request waits its turn, a new value for the same setting replaces the old one,
  so what goes out is the value where the slider stopped;
- at least 120 ms between the start of two requests. The first change goes out right
  away, the ones that follow are held, and the last value of each setting is always sent.

The tab shows a change at once (the value in the label and the slider) and does not wait
for the answer. When the keyboard refuses a change, or does not answer, the app shows the
problem and reads the settings again, so the controls go back to what the keyboard really
has; a value the user changed while it was reading is kept.

## Files

| File | What it is |
|---|---|
| `DisplayTab.tsx` | The tab: the groups, the controls and the notices |
| `displaySettings.ts` | What the app knows about each id (name, control, hint, dependency) and the plain functions the tab is built from: groups, which controls are enabled, limits, the writing of values |
| `displayProtocol.ts` | The three requests, and `null` when the firmware does not have them |
| `displayWriter.ts` | The queue described above |
| `displayController.ts` | What the tab does with the keyboard, without React: reading, changing, restoring and recovering from a refusal |
| `useDisplaySettings.ts`, `DisplayContext.ts` | Carry the state of a controller into React |
| `demo/demoDisplay.ts` | The settings of the demo keyboard (see [`../lights/demo/README.md`](../lights/demo/README.md)) |

`src/App.tsx`, `src/AppHeader.tsx` and `src/lights/ViewSwitch.tsx` connect the tab to the
rest of the app (the header switch, the text of the reset confirmation).

## Tests

`npm test` covers the writer (with fake timers: the first change at once, the last value,
the interval, the order, one request in flight, a failure, `cancel`), the rules and the
texts (groups, dependencies, limits, an unknown id), the three requests against the demo
keyboard (through the real framing and message encoding), the controller (reading,
changing, holding a value inside the range, not flooding the keyboard, a refusal, a
restore, `dispose`) and which tabs a keyboard gets.

## Status on a real keyboard

The tab was tried in a browser against the demo keyboard: reading the settings, dragging a
slider (72 changes became 13 requests, the last one with the final value), the dependencies
between the controls, the switch, the three buttons, **Restore defaults**, **Restore Stock
Settings** from the header while the tab was open, and the demo keyboard without display
settings, which has no Display tab. The firmware side compiles in the CI of corne-zmk. It
has **not been tried on a real keyboard**: whether each screen changes its contrast, the
three ways of turning the screen off, what the right half receives and what is still there
after a restart are unconfirmed.
