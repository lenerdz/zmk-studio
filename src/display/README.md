# Display tab

An editor for the settings of the OLED screens and of the lights of the keyboard: the
contrast of each screen, when the screens, the LEDs under the keys and the underglow turn
off, the burn-in protection of the screens (pixel shift and dimming), and the notice (the
"toast") that the right screen shows when the lights change. It needs a firmware with
display settings: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`, built with `CONFIG_KEYPAW_DISPLAY_SETTINGS=y`), the
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork (which reads the toast
settings) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). With any other firmware the tab is not
offered (the keyboard answers "RPC not found" to the first request) and the app works
like the original ZMK Studio.

What the screens show and where (the widgets, the picture of the right screen) is the
[OLED tab](../oled/README.md), which is made of the settings with the ids from 16 up and
uses the same requests as this tab.

## What it does

The header has a view **Display**, next to **Keys**, **Lights**, **OLED**, **Files** and
**Diagnostics** (each one only when the firmware has what it edits or reads; **Files**
needs only a keyboard that is connected and unlocked). It has seven groups of controls,
whose names and ranges come from the keyboard:

- **Contrast**: one slider for the left screen and one for the right screen.
- **Screen off**, **Key lights off** and **Underglow off**: three groups with the same
  controls, one for the screens, one for the LEDs under the keys and one for the LEDs that
  are not under a key. Each has when it goes off (**Never**, **Only on battery**, that is,
  while USB is not connected to that half, or **Always**) and a slider for how long the
  keyboard has to be left alone before that happens, a time of its own for each of the
  three. The time is counted from the last key pressed on either half. The slider is
  disabled, and says why, while the choice is **Never**. The firmware of corne-zmk is built
  with the screens never going off, and the key lights and the underglow going off only on
  battery, after 5 minutes.
- **Pixel shift** (burn-in protection): a switch, a slider for the time between two moves
  and a slider for the distance (1 to 4 pixels). From time to time everything the screens
  show moves by a pixel along a small path, so that no pixel stays lit or dark for hours.
  The two sliders are disabled while the switch is off.
- **Dimming** (burn-in protection): a slider for how long the keyboard has to be left alone
  before the screens dim (the lowest value, **Never**, does not dim) and a slider for the
  contrast of a dimmed screen, as a percentage of the normal one. The second slider is
  disabled while the first is at **Never**.
- **Light toast**: a switch for the notice that the right screen shows when the lights
  change (effect, brightness, on and off), and a slider for how long it stays. The slider
  is disabled while the switch is off.
- **Restore defaults**: puts every setting back to what the firmware was built with, the
  places of the widgets in the [OLED tab](../oled/README.md) included. It is disabled
  while nothing differs.

Unlike the keys and the lights, **there is nothing to save**: the keyboard applies each
change at once and keeps it in its own memory a few seconds after the last change
(`CONFIG_KEYPAW_DISPLAY_SAVE_DEBOUNCE_MS`, 3 s). So **Save** and **Discard** in the header
do not act on these settings. A change is not a step of the Undo and Redo of the keys and
the lights either: the changes made here and in the OLED tab have a history of their own,
which Undo and Redo in the header act on while one of these two tabs is open (see
[Undo and Redo](#undo-and-redo)). **Restore Stock Settings** (menu of the connected
keyboard) puts them back to the defaults too, and its confirmation says so for a firmware
that has them.

A change also turns the screens on for at least ten seconds, so it can be seen (this is
done by the firmware). The right screen gets its settings from the left half, which can
take a few seconds after it connects.

A setting this version of the app does not know (a newer firmware) is not hidden: it is
shown as `Setting N`, in a group of its own, with a slider from the minimum to the maximum
the keyboard reports. The exception is the ids from 16 up, which belong to the OLED tab and
are not listed here.

## The settings

The ids are the ones of `display_settings.c` in the zmk-rgb-matrix module. The app only
uses the ids to choose a name and a kind of control: the range, the value and the default
of every setting come from the keyboard.

| Id | Setting | Control | Range | Built with | Note |
|---|---|---|---|---|---|
| 1 | Left screen contrast | Slider | 0 to 255 | 128 | |
| 2 | Right screen contrast | Slider | 0 to 255 | 128 | |
| 3 | Turn the screen off | Three buttons | 0 Never, 1 Only on battery, 2 Always | 0 (Never) | Never is how the keyboard behaved before the setting existed |
| 4 | Time without activity before it goes off | Slider, step 10 s | 10 s to 1 h | 1 min | Counted from the last key on either half. Used only while setting 3 is not Never |
| 5 | Light toast on the right screen | Switch | 0 or 1 | 1 (On) | Needs the widget of zmk-nice-oled, which corne-zmk builds |
| 6 | Toast duration | Slider, step 0.1 s | 0.5 s to 5 s | 1.5 s | Used only while setting 5 is on |
| 7 | Turn the key lights off | Three buttons | 0 Never, 1 Only on battery, 2 Always | 1 (Only on battery) | The LEDs under the keys |
| 8 | Time without activity before they go off | Slider, step 10 s | 10 s to 1 h | 5 min | Used only while setting 7 is not Never |
| 9 | Turn the underglow off | Three buttons | 0 Never, 1 Only on battery, 2 Always | 1 (Only on battery) | The LEDs that are not under a key |
| 10 | Time without activity before it goes off | Slider, step 10 s | 10 s to 1 h | 5 min | Used only while setting 9 is not Never |
| 11 | Pixel shift | Switch | 0 or 1 | 1 (On) | Burn-in protection: the drawing of each screen moves by a pixel from time to time. The drawing is done by zmk-nice-oled |
| 12 | Time between two moves | Slider, step 10 s | 10 s to 1 h | 1 min | Used only while setting 11 is on |
| 13 | Distance | Slider, step 1 px | 1 to 4 px | 2 px | How far from its place the drawing goes, to each side. Used only while setting 11 is on |
| 14 | Dim the screens after | Slider, step 10 s | 0 to 1 h | 2 min | Burn-in protection. 0 is Never. A value from 1 to 9 s would count as 10 s in the firmware, and the slider steps by 10 s |
| 15 | Dimmed contrast | Slider, step 5 % | 5 % to 90 % | 25 % | The contrast of a dimmed screen, as a percentage of its normal contrast. Used only while setting 14 is not 0 |

The firmware counts the time without activity from the last key pressed on either half, a
change made from the app, and a USB cable plugged in or taken out; the left half tells the
right one about them, so the halves go off, dim and come back together. How that works,
and what **Only on battery** looks at, is in the README of the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module ("When the screen and
the lights go off").

The ids from 16 up are the layout of the OLED screens (41 settings on the Corne of
corne-zmk, from the animation of the right screen to the graph of the left one; the
turn, the mix and the cut of the picture are the ids 112 to 115). The
[OLED tab](../oled/README.md) edits them, and this tab does not list them.

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

## Undo and Redo

The Display tab and the [OLED tab](../oled/README.md) change the same settings, so they
share one history, which the app keeps (`changeHistory.ts` holds the steps and
`displayController.ts` records into it and writes back what it returns).

- **Undo** and **Redo** in the header, and **Ctrl+Z**, **Ctrl+Y** and **Ctrl+Shift+Z**
  (Cmd instead of Ctrl on a Mac), act on this history while the Display tab or the OLED
  tab is open. In the other tabs they act on the history of the keys and the lights, as
  before. The shortcuts are left alone while the focus is in a text field, where they undo
  the typing; a slider, a switch or a button is not typing (`undoShortcuts.ts`).
- A step is what one gesture changed: a slider, a switch, a button, a widget that was
  moved, a picture that was turned or cut, a screen put back as built, the screens of a
  file applied in the [Files tab](../backup/README.md). Undo writes back the value each
  setting had before the step and Redo writes the value it got. The keyboard applies and
  keeps them like any other change, so there is still nothing to save.
- A drag is one step. A change that comes within 800 ms (`MERGE_WINDOW_MS`) of the
  previous one and belongs to the same group joins its step. The group is the setting
  (a slider), or a name the tab gives to a gesture that changes different settings along
  the way: dragging a widget changes only its x in one move of the pointer and only its y
  in the next (the arrow keys and the fields do too), and dragging the frame of the crop
  of a picture changes where it starts and how big it is; the names are `move:` and
  `crop:` followed by the widget. A setting that ends where the step began is left out of
  the step, and a drag that ends where it began leaves nothing to undo. A change made
  after a pause is a step of its own.
- **Restore defaults** is a step of its own (nothing joins it and it joins nothing): Undo
  gives back the values from before the restore, in the keyboard as well.
- A new change ends the steps that Redo could do (they would not lead anywhere any more).
- A value that the keyboard held inside its range (a number outside it is cut to the
  limit) is given back exactly as it was before.
- The history keeps the last 100 steps (`HISTORY_LIMIT`) and starts empty each time the
  app connects or reads the keyboard again (after **Discard** or **Restore Stock
  Settings**). It is also forgotten when the keyboard refuses a change: the app then reads
  the settings again, and the values it had recorded may not stand for what the keyboard
  has.

## Files

| File | What it is |
|---|---|
| `DisplayTab.tsx` | The tab: the groups, the controls and the notices |
| `displaySettings.ts` | What the app knows about each id (name, control, hint, dependency) and the plain functions the tab is built from: groups, which controls are enabled, limits, the writing of values |
| `displayProtocol.ts` | The three requests, and `null` when the firmware does not have them |
| `displayWriter.ts` | The queue described above |
| `changeHistory.ts` | The history of [Undo and Redo](#undo-and-redo): the steps, how a drag becomes one step, the limit |
| `displayController.ts` | What the tab does with the keyboard, without React: reading, changing, undoing and redoing, restoring and recovering from a refusal |
| `useDisplaySettings.ts`, `DisplayContext.ts` | Carry the state of a controller into React |
| `demo/demoDisplay.ts` | The settings of the demo keyboard: the fifteen of this tab and the 41 of the OLED layout (see [`../lights/demo/README.md`](../lights/demo/README.md)) |

`src/App.tsx`, `src/AppHeader.tsx`, `src/undoShortcuts.ts` and `src/lights/ViewSwitch.tsx`
connect the tab to the rest of the app (the header switch, Undo and Redo and their
shortcuts, the text of the reset confirmation).

## Tests

`npm test` covers the writer (with fake timers: the first change at once, the last value,
the interval, the order, one request in flight, a failure, `cancel`), the rules and the
texts (groups, dependencies, limits, an unknown id), the three requests against the demo
keyboard (through the real framing and message encoding), the controller (reading,
changing, holding a value inside the range, not flooding the keyboard, a refusal, a
restore, `dispose`, and Undo and Redo: one step for a drag, also for a drag that changes
different settings in turn, several settings in one step, a restore taken back), the
history itself (`changeHistory.test.ts`: the steps, the window of a drag, the groups, the
limit of 100, a step that nothing joins), the shortcuts (`undoShortcuts.test.ts`), that
the ids from 16 up are left to the OLED tab, and which tabs a keyboard gets.

## Status on a real keyboard

The tab was tried in a browser against the demo keyboard: reading the settings, dragging a
slider (72 changes became 13 requests, the last one with the final value), the dependencies
between the controls, the switch, the three buttons, **Restore defaults**, **Restore Stock
Settings** from the header while the tab was open, and the demo keyboard without display
settings, which has no Display tab. With the 56 settings of the demo keyboard (the 41 of
the OLED layout included), the tab lists only its fifteen. Undo and Redo were tried
there too, in a browser that is really shown: a widget dragged along a bent path, ten
presses of an arrow key and a move after a pause were one step each, Ctrl+Z and Ctrl+Y
took them back and did them again, and the buttons of the header followed. The firmware
side compiles in the CI of corne-zmk, and the owner of the keyboard reported that the
release that has this tab worked on the keyboard ("it worked perfectly"), without listing
what was tried: whether each screen changes its contrast, the three ways of turning the
screen off, what the right half receives and what is still there after a restart are
**not confirmed one by one**. Undo and Redo of these settings are **not tested on the
keyboard**; the basis is the demo keyboard and the tests, which write and read the same
requests the controls use.

The seven groups and the nine settings that came with the key lights, the underglow and
the burn-in protection (ids 7 to 15) were tried in the same way, in a browser against the
demo keyboard: the groups are drawn in order, with the values the demo keyboard holds, and
choosing **Never** for the key lights disables the slider of their time and says why, while
**Always** enables it again. That the key lights and the underglow go off after the times
set here, that a key of either half brings them back, that the pixel shift moves the
screens, that the dimming lowers the contrast, and that the right half follows the left
one are **not tested on the keyboard**: the basis is the unit tests of the module (the idle
policy and the display settings) and of zmk-nice-oled (the pixel shift), which run on a PC,
and the compilation of the firmware in the CI of corne-zmk.
