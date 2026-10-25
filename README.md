# ZMK Studio (unofficial fork)

English | [Português (Brasil)](README.pt-BR.md)

This is an unofficial fork of [ZMK Studio](https://github.com/zmkfirmware/zmk-studio),
the web app that edits the keymap of a [ZMK](https://zmk.dev/) keyboard live. It is
maintained by [lenerdz](https://github.com/lenerdz) for a Corne keyboard.

It is **not** the official ZMK Studio and is **not** endorsed by the ZMK Project. The
ZMK name and logo are the ZMK Project's: they stay in this fork only because it is a
modified copy of the app. For help with the official app, go to the ZMK Project.

**Use it:** <https://lenerdz.github.io/zmk-studio/>

## What is different from upstream

Upstream draws every key as the behavior name (small, on top) and the first
parameter of the binding as a HID usage (below). That is right for key presses, but
for any behavior whose parameters are not HID usages (Bluetooth profiles, lighting
commands, layers by number, ...) the key ends up empty or showing a meaningless label.

This fork draws an icon and a short label on those keys instead. Hovering a key
shows the full description (for example `Bluetooth: Select Profile 2`).

| Behavior, as named by the firmware | What is drawn |
|---|---|
| `Key Press` | Unchanged: the key label. Media keys (volume, mute, brightness, play/pause) are drawn as icons |
| `Momentary Layer`, `Toggle Layer`, `To Layer`, `Sticky Layer` | An icon and the layer name |
| `Layer-Tap` | The layer icon, the layer name and the tap key |
| `Mod-Tap` | The tap key, then the hold modifier |
| `Sticky Key`, `Key Toggle` | An icon and the key |
| `Key Repeat` | An icon |
| `Bluetooth` | The Bluetooth icon with the profile number (select, disconnect), or the action (clear, clear all, next, previous) |
| `Output Selection` | USB, Bluetooth, toggle or no output |
| `Underglow`, `Backlight` and lighting behaviors that report the same commands | An icon and a short word per command: `on/off`, `hue`, `sat`, `bri`, `speed`, `time`, `effect`, `reset`, `color`, with a plus or minus for up and down |
| Behaviors named `fx_*` (one per lighting effect) | The header `Effect`, an icon chosen by the effect name and the name itself |
| Behaviors named `ug_*` (one per underglow animation, for example `ug_rain`) | The header `Underglow`, an icon chosen by the animation and its name (`rainbow`, `breathe`, `spectrum`, `starlight`, `off`) |
| `Steno On`, `Steno Off` (the macros of corne-zmk that switch to the steno layer and back) | A keyboard icon (crossed out for off) and the text `steno on` or `steno off` |
| `Steno` (the GeminiPR key behavior of the corne-zmk module; its parameter is the steno key) | The steno key name alone (`S1-`, `T-`, `*1`, `A-`, `-E`, `#`, ...), taken from the parameter names the firmware reports |
| `Studio Unlock`, `Caps Word`, `Reset`, `Bootloader`, `External Power`, `Mouse Key Press`, `Grave/Escape` | An icon or a short text |
| `Transparent`, `None` | A dimmed icon |
| Anything else | A label built from the parameter descriptions the firmware reports: HID usage, layer name, number or constant name |

Everything is derived from what the firmware reports (the behavior display name and
the parameter descriptions), so a behavior unknown to this fork still gets a generic
label. The rules live in [`src/keyboard/bindingDisplay.tsx`](src/keyboard/bindingDisplay.tsx);
[`src/keyboard/BindingLabel.tsx`](src/keyboard/BindingLabel.tsx) draws the result.

Other changes:

- The six media keys that upstream labels with emoji (brightness, play/pause, mute, volume) are
  drawn as icons, and the emoji were removed from `src/hid-usage-name-overrides.json`.
- The footer, the page titles, the download page and the `NOTICE` say that this is an
  unofficial fork. The download page links to the official apps, which do not include
  these changes.
- The app can be served from a subdirectory (`VITE_BASE_PATH`), and the workflow
  [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes it on GitHub Pages.
- Storybook stories with the keymap of a Corne, one per layer (`Keyboard/Keymap (Corne)`).
- The confirmation of **Restore Stock Settings** lists what it puts back: the keymap, and
  the light colors and the screen settings when the firmware has them.

What does not change: the editing of the keymap, and what the app reads from or writes to
the keyboard for it. The icons only affect how keys are drawn and how the app is hosted;
dragging keys (below) writes with the same request as the binding picker; the Lights and
Display tabs (further below) add requests of their own, and the OLED tab uses the ones of
the Display tab. The Diagnostics tab, and the live values of the OLED tab, only read, with
two requests of their own; the Files tab writes with requests the other tabs already use.
The tabs are used only when the firmware has what they edit or read.

## Moving keys by dragging (the Keys view)

In the **Keys** view, press a key and drag it onto another key of the same layer:

- **Drop** it on another key and the two keys **swap** their bindings (behavior and
  parameters). Hold **Ctrl** or **Alt**, before or during the drag, and the drop
  **copies** instead: the key you dropped on gets the binding of the dragged key, and the
  dragged key stays as it was.
- While you drag, the key you pressed is dimmed with a dashed outline, a smaller copy of
  it follows the pointer with a tag (`Swap` or `Copy`), and the key under the pointer is
  highlighted. The tag reads `drop on a key` while the pointer is over no key.
- **Esc** cancels the drag. Releasing the pointer anywhere that is not a key does nothing.
- The drag starts after the pointer moves 6 pixels, so a plain click still selects a key.
  After a drop, the key you dropped on is selected, which shows its binding in the picker
  below.
- A drop is **one step** of Undo and Redo, even for a swap, which changes two keys. It is
  written to the keyboard with the `setLayerBinding` request, the same one the binding
  picker uses, so **Save** and **Discard** work as before. If the keyboard refuses a
  write, the keys already written are put back and the app shows an alert.
- Keys that are rotated (the thumb keys of the Corne) and the keys of the right half work
  like any other. Mouse, pen and touch use the same pointer events.

The rules (what a drop does, how a drag starts, ends and is cancelled) are plain functions
in [`src/keyboard/keyDrag.ts`](src/keyboard/keyDrag.ts), covered by
[`src/keyboard/keyDrag.test.ts`](src/keyboard/keyDrag.test.ts).
[`src/keyboard/useKeyDrag.ts`](src/keyboard/useKeyDrag.ts) listens to the pointer,
[`src/keyboard/KeyDragGhost.tsx`](src/keyboard/KeyDragGhost.tsx) draws what follows it and
the edit itself (`doDropKey`, `writeEdits`) is in
[`src/keyboard/Keyboard.tsx`](src/keyboard/Keyboard.tsx).

**A change to the binding picker.** Upstream's
[`src/behaviors/BehaviorBindingPicker.tsx`](src/behaviors/BehaviorBindingPicker.tsx) told
the keyboard about a change from an effect that compared its own copy of the binding with
the one it was given. When a binding changed from outside the picker, as a drop on the
selected key does (undo and redo do too), that comparison could run with the old value and
write it back, and the old and the new value could then replace each other without
stopping. This was seen on the demo keyboard after copying a key onto another with Ctrl
held, and it is gone with this change. In this fork the picker tells the keyboard only when
the user changes something in its own controls.

## Light colors (the Lights tab)

With a firmware that has editable light maps, the header has a second view, **Lights**,
next to **Keys** (the key editor). It draws the keyboard and lets you paint the color of every LED
(the one under each key and the underglow) of every layer:

- Choose a layer, choose a color (one of the 14 colors of the palette of
  `led_colors.dtsi`, the system color picker or a hex value) and drag across the LEDs.
  The keyboard shows the colors when you let go.
- Fill all the LEDs, only the keys or only the underglow, and put a layer back to the
  colors the firmware was built with.
- **Save** and **Discard** in the header act on the keys and on the lights together, and
  **Undo** and **Redo** cover both. **Restore Stock Settings** also puts the stock colors
  back.
- **Export led_colors.dtsi** downloads the colors as the `config/led_colors.dtsi` of
  [corne-zmk](https://github.com/lenerdz/corne-zmk), to build them into the firmware as
  the new defaults.

It needs the [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz
(branch `corne-fixes`) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), which add six
requests and one notification to the keymap subsystem of ZMK Studio. With any other
firmware the Lights view is not offered (the keyboard answers "RPC not found" to the first
request) and the app works as before. The app talks to the keyboard with a vendored copy of
the TypeScript client that includes those messages
([`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

To try it without a keyboard, use the **Demo keyboard** (see [Development](#development)).
How it works, the protocol and the files: [`src/lights/README.md`](src/lights/README.md).

## Screen settings (the Display tab)

With a firmware that has display settings, the header has a third view, **Display**, next
to **Keys** and **Lights** (each one only when the firmware has what it edits). It sets
what the OLED screens of the keyboard do:

- The **contrast** of the left and of the right screen, with a slider each.
- **When the screens turn off**: never, only on battery (while USB is not connected to
  that half) or always, and after how long without activity.
- The **light toast**: whether the right screen shows a notice when the lights change
  (effect, brightness, on and off), and for how long.
- **Restore defaults** puts every setting back to what the firmware was built with.

Everything is applied by the keyboard at once and kept by it a few seconds after the last
change, so there is nothing to save: **Save** and **Discard** do not act on these
settings. **Undo** and **Redo** do, while this tab or the OLED tab is open: the buttons of
the header, and Ctrl+Z and Ctrl+Y (Ctrl+Shift+Z too), take back and redo what you changed
in the two tabs, which share one history of up to 100 steps. A drag of a slider is one
step, so is a widget dragged along any path (or moved with the arrow keys), and so is
**Restore defaults**. The history starts empty each time the app connects or reads the
keyboard again (after **Discard** or **Restore Stock Settings**), and it is forgotten when
the keyboard refuses a change and the app reads the settings again. With any other tab
open, Undo and Redo are the ones of the keys and the lights, as before. **Restore Stock Settings** puts the settings back to the defaults too. What each
screen shows, and where, is set in the OLED tab (below) when the firmware has the OLED
layout; the language of the toast, and what the OLED tab does not cover, are still chosen
when the firmware is built.

It needs the [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of
lenerdz (branch `corne-fixes`, built with `CONFIG_KEYPAW_DISPLAY_SETTINGS=y`), the
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork (it reads the toast
settings) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), which adds three
requests (`get_display_info`, `set_display_setting` and `restore_display_defaults`) to the
keymap subsystem of ZMK Studio. With any other firmware the Display view is not offered
(the keyboard answers "RPC not found" to the first request) and the app works as before.

The settings, their ranges, how the changes travel and the files:
[`src/display/README.md`](src/display/README.md).

## Screen layout (the OLED tab)

With a firmware that has the OLED layout, the header has a fourth view, **OLED**, next to
**Keys**, **Lights** and **Display** (each one only when the firmware has what it edits).
It draws the two OLED screens of the keyboard upright, with the strip that the panel really
shows lit, and sets what each screen shows and where. Each screen also has a preview of the
strip standing up, the way it is read on the keyboard (the panel is mounted on its side, so
it is never horizontal), with a button that turns the view a quarter of a turn: it turns the
view only, nothing is sent to the keyboard.

- **Drag a widget** (the battery, the Bluetooth link, the layer name, the typing speed, the
  animation, ...) to move it. The arrow keys move the selected one by a pixel, or by eight
  with Shift. The inspector shows the size of each widget, where it is, and how much of it
  the panel shows.
- **Hide a widget** with Delete or with its switch, and **show it again** by clicking it
  in the tray of hidden widgets or by dragging it onto the screen.
- **Choose the picture of the right screen** in a gallery of 66 pictures, in two groups:
  36 animations (Gem, Cat, Head, Spaceman, Pokemon, and 31 more: Equalizer, Radar,
  Heartbeat, Digital rain, Wire cube, Atom, Helix, Warp, Sonar, Bouncing ball, Flame,
  Waterfall, Lava lamp, Storm, Snowfall, Jellyfish, Falling blocks, Pong, Invaders,
  Chomper, Game of Life, Plasma, Spiral, Newton's cradle, Gears, Hourglass, Windmill,
  Fireworks, Flying saucer, Eye, Key wave) and 30 still images (Vim, VIPs Marcos, and 28
  more: Mountains, Skyline, Circuit, Alien, Heart, Keyboard, Pulsar, Rocket, Coffee,
  Cactus, Lighthouse, Moon cat, Robot, Planet, Castle, Tree, Skull, Sword, Key, Antenna,
  Potion, Sailboat, Compass, Crown, Cassette, Floppy disk, Moon phases, Mushroom), each one
  playing in its card, with its size and the time of a cycle. Click one, or drag it onto
  the right screen, and set the time of one cycle.
- **Turn the picture** a quarter of a turn to either side, **cut it** to a piece that is
  selected with a frame (drag it, resize it or type its numbers), and choose **how the
  widgets mix with it**: shown in reverse where they are over a lit part of the picture, so
  that they stay readable (the default), or added to it. The firmware draws the picture on
  top of the widgets, so any widget, the battery of the right half included, can be moved
  over it.
- **Watch the screens with live values.** Turn on **Live values** and the drawings follow
  what the keyboard says now (the battery of each half, the link with the left half, the
  output and the Bluetooth profile, the layer, the typing speed) instead of being samples;
  see [What the keyboard is doing](#what-the-keyboard-is-doing-live-values-and-the-diagnostics-tab).
- **See what the screens can show**, with the size of each thing, and which choices only a
  new firmware build adds (the Luna dog, the Bongo cat, the modifier indicators, Raw HID,
  ...), each with the option to turn on.

Everything is applied by the keyboard at once and kept by it a few seconds after the last
change, so there is nothing to save: **Save** and **Discard** do not act on the layout.
**Undo** and **Redo** (the header, Ctrl+Z and Ctrl+Y) take back and redo what you changed
here and in the Display tab while either one is open (see the Display tab, above).
**Restore Stock Settings**, and **Restore defaults** of the Display tab, put it back to
what the firmware was built with. Without Live values the drawings are samples (a battery
of 85%, the layer `QWERTY`, a typing speed of 42), not the live state of the screens.

It needs what the Display tab needs, with `CONFIG_KEYPAW_OLED_LAYOUT=y` in the build of
both halves, and the [zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork of
lenerdz, which reads the layout while the keyboard runs. It has no requests of its own: the
layout is made of display settings (ids 16 and up), read and written with the three
requests of the Display tab. With any other firmware the OLED view is not offered and the
app works as before.

How the geometry works (the canvas of 68 x 160 pixels, the strip of 32 x 128 that the panel
shows, the position of the picture), the ids, the files and how the sprites are generated:
[`src/oled/README.md`](src/oled/README.md).

## What the keyboard is doing (Live values and the Diagnostics tab)

With a firmware that answers two read-only requests, the app can ask the left half (the
one connected to it) what it is doing and what firmware it runs. Two things use them:

- **Live values**, a switch in the OLED tab. With it on, the drawings of the screens follow
  the keyboard instead of being samples: the battery of each half (the right one is what
  the left half knows of it, and it is written as `--%` while there is no reading), the
  link with the left half, the output (the USB icon while the keys go to USB, otherwise
  the state of the selected Bluetooth profile: connected, paired without signal or not
  paired), the marks and the number of the profile, the name of the layer, and the typing
  speed (the needle, the number and the graph, to which the app adds a reading a second).
  The light toast has nothing to read and stays a sample.
- **Diagnostics**, the sixth view, after **Files**. It has three groups: the **firmware**
  (keyboard, board, Zephyr and the build: branch, commit, number of the CI run and day),
  the **memory of the left half** (the flash and the RAM, a bar each, with the bytes used,
  the bytes free and a word: plenty left, getting tight when less than 15% is free, almost
  full when less than 3% is) and **now** (the batteries of the two halves, whether the
  right half is connected, the layer, the typing speed, where the keys go and how long the
  keyboard has been on). **Copy the report** puts all of it in the clipboard as plain
  text, to paste into a message or an issue. The tab only reads: nothing in it changes the
  keyboard.

The numbers are the **left** half's. The right half runs a firmware of its own, which ZMK
Studio cannot ask, so from the app only its battery and its connection are known. The flash
and the RAM are the figures the build prints (`FLASH` and `RAM`), read by the firmware from
the symbols of the linker, so they can be compared with the log of the CI.

**How it asks.** The keyboard has no notification for this, so the app asks, one request at
a time (the next one half a second, or a second in the Diagnostics tab, after the answer
to the one before). It asks only while the tab that needs it is open, the
keyboard is connected and unlocked, and **the page is shown**: a hidden browser tab asks
nothing. After three failures in a row it stops and says so; with Live values, turning the
switch off and on tries again. Every request restarts the idle timer of the lock of ZMK
Studio (a firmware with `CONFIG_ZMK_STUDIO_LOCKING`), so **while Live values is on, or the
Diagnostics tab is open, the keyboard does not lock itself**.

It needs the [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of
lenerdz (branch `corne-fixes`) with `CONFIG_KEYPAW_DEVICE_STATUS_STUDIO` (on by default
with the RPC of ZMK Studio, so on the central half) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), which adds the
requests `get_live_status` (109) and `get_firmware_info` (110) to the keymap subsystem.
With any other firmware the Diagnostics tab is not offered (the keyboard answers "RPC not
found" to the first request) and Live values says that the firmware cannot tell its state,
leaving the drawings as samples. The demo keyboard answers both (its numbers are those of
the left half of the build of corne-zmk); **Demo keyboard (no live status)** does not.

How it works, the files and the tests: [`src/live/README.md`](src/live/README.md) and
[`src/diagnostics/README.md`](src/diagnostics/README.md).

## Everything in one file (the Files tab)

The **Files** view, offered while the keyboard is unlocked, puts what the app edits into one
text file, and applies such a file again here or on another keyboard:

- **Save to a file** writes a JSON file (`corne-backup-2026-10-25-1530.json`: the name the
  keyboard gave itself, the day and the hour in UTC) with the parts that are checked:
  the **keys** (every layer: its name, and for each key the name of its behavior and the
  two parameters), the **lights** (the colors of the map of every layer, as `#rrggbb`) and
  the **screens** (every display setting, the layout of the OLED screens included, each
  with its id and its name). It has what the app shows now, **changes that are not yet
  saved in the keyboard included**. It is plain text, with a key or a list of colors per
  line, so it can be read, compared with another and kept in a repository (the whole demo
  keyboard is about 33 KB and 670 lines).
- **Open a file** reads such a file and shows a **plan** before anything is written: for
  each part, what would change (how many keys and in which layers, which layers are
  renamed, how many colors in which maps, which settings from what to what) and what cannot
  be applied and why. A part that is already the same as the keyboard says so and is left
  unchecked. Nothing is written until **Apply the checked parts**.
- **How a file is matched with the keyboard.** The keys by the **place of the layer** in
  the keymap and the position of the key, with the behavior found by its name (a key whose
  behavior the keyboard does not have, and a layer with another number of keys, are left as
  they are and reported; a layer name that is too long is cut); the colors by the **id of
  the layer**, and only when the file has the same number of colors per map (54 on the
  Corne), so a file made for another LED layout applies no color; the screens by the **id of
  the setting**, a value out of the range the keyboard gave being held at the nearest end,
  and said so.
- **A file that is refused.** One that is not valid JSON, is not a backup of this app, has a
  part the app cannot use (the message says which one) or comes from a newer version of the
  app (a higher format number) is refused, and a file is never applied halfway: the keys
  are written all or none (if the keyboard refuses one, the ones already written are put
  back).
- **A file of another keyboard.** If the name in the file is not the name the keyboard has
  now, the tab warns that the file can fail or look wrong here and tells to check the plan.
- **Undo and Save.** The keys of a file are **one step**, and the colors of each layer are
  one step, of the header's Undo and Redo (Ctrl+Z and Ctrl+Y), like any change in the Keys
  or the Lights tab. They need **Save** in the header to be kept by the keyboard: after
  applying them, the tab says so and has a button that does the same as Save. The screens
  are one step of the history of the Display and OLED tabs, which is where to undo them,
  and the keyboard keeps them by itself.

It uses only requests the other tabs use (the keymap, the light maps and the display
settings), so it needs nothing of the firmware beyond them: a part the keyboard lacks (the
lights or the screens) is shown as unavailable, with the reason, and is left out of the
file. The format, the plan and the files: [`src/backup/README.md`](src/backup/README.md).

## Status

The icons were checked with the Storybook stories, whose sample data
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) follows the sources of ZMK
and [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix), and used with a real
Corne connected over USB: the icons and labels worked (reported by the keyboard's owner).
If a key shows a wrong or empty label, the behavior name shown in its tooltip is what the
rules in `src/keyboard/bindingDisplay.tsx` have to handle.

The Lights tab was tried in a browser against the demo keyboard, through the same framing
and message encoding as with a real keyboard, and is covered by `npm test`. On a real
Corne connected over USB it worked, reported by the keyboard's owner without detail about
each operation (painting, Save, Discard, restoring, the copy to the right half), so none of
those has an individual confirmation.

The Display tab was tried in a browser against the demo keyboard, through the same framing
and message encoding as with a real keyboard: reading the settings, dragging a slider (72
changes became 13 requests, the last one with the final value), the controls that wait for
another (the time to turn off, the duration of the toast), the three ways of turning the
screen off, **Restore defaults** and **Restore Stock Settings** with the tab open; the
demo keyboard without display settings has no Display tab. It is covered by `npm test`.
It has **not been tried on a real keyboard**.

The OLED tab was tried in a browser against the demo keyboard, through the same framing and
message encoding as with a real keyboard: the two screens, dragging each widget with the
pointer, the arrow keys, hiding with Delete, showing from the tray by click and by drag,
choosing a picture in the gallery by click and by drag, the inspector, putting a screen
back as built and the zoom levels; also turning the picture, the frame of the cut (moving
it, typing its numbers, going back to the whole picture), the battery of the right half
dragged over the picture in reverse, and the button that turns the view of a screen; the
demo keyboard without display settings has no OLED tab. It is covered by `npm test`. The
first version of the tab (moving, showing and hiding the widgets, and the seven pictures of
zmk-nice-oled) was used on the Corne of the keyboard's owner, who reported that it worked,
without detail about each operation, so none of those has an individual confirmation. The
second one (turning, cutting and mixing the picture, the reverse where a widget is over it,
the preview standing up and the 19 pictures that came with it) was used on the same
keyboard too: the owner reported that it worked perfectly and that he liked the animations
and the still images, again without detail about each operation. What was added after that,
the 40 new pictures (kinds 26 to 65, 20 animations and 20 still images), has **not been
tried on a real keyboard**: how they look on the screen rests on the code of the firmware,
on its tests on a computer and on the sprites the app draws from the same pictures, not on
the screen. Touch input has not been tried on any device.

The live values, the Diagnostics tab, the Files tab and the Undo and Redo of the Display and
OLED tabs were tried against the demo keyboard, through the same framing and message
encoding as with a real keyboard, in two browsers: the one embedded in an editor and a
headless Microsoft Edge driven through the DevTools protocol (the live values needed the
second: the first reports its page as hidden, where, as designed, nothing is asked).
**Live values** drew the
layer, the speed (the needle, the number and the graph), the batteries, the output and the
profile from the keyboard, and they changed as its values changed (the layer from `FN1` to
`RAISE`, the speed from 60 to 21 words per minute); the Diagnostics tab showed the
firmware, the two memory bars and the state of the keyboard; the demo keyboard without live
status has no Diagnostics tab, and Live values says that the firmware cannot tell its state.
The **Files** tab saved a backup (a real download of 33,466 bytes), read it back and said
that it was the same as the keyboard in the three parts, applied an edited copy (two keys
swapped and a layer renamed, two colors, two settings, one of them held at the nearest
value) and showed the Save button of the keys; the Keys tab showed the new keys at once,
and Ctrl+Z and Ctrl+Y in the header took the colors, then the keys, back and forth. In the
Display tab, Ctrl+Z and Ctrl+Y took back and redid a slider and then the screens of the
file. All of it is covered by `npm test` (the plan, the writing with its rollback, the
format, the history, the poller, the drawing from live values). **None of it has been tried
on a real keyboard**: the numbers that the firmware reports (the flash and the RAM, which
come from symbols of the linker that the firmware did not use before, the state of the
Bluetooth profile, the battery of the right half), what each live widget draws from them,
and the keyboard keeping the screens that a file sets, are unconfirmed.

The keys `Steno On` and `Steno Off`, and the STENO layer, were checked in a browser against
the demo keyboard and in the Storybook story `Keyboard/Keymap (Corne)`, not on a real
keyboard.

The GEMINI layer, its `Steno` keys and the underglow animation keys (`ug_*`) were checked
in a browser against the demo keyboard: the Keys tab draws the 42 keys of the GEMINI layer
and, on the SYS layer, the five underglow keys and the key that goes to GEMINI; the Lights
tab lists the eight layers and shows the colors of GEMINI. The export code, run with the
demo data, gives the same symbols in the same order as `config/led_colors.dtsi` of
corne-zmk. None of this was tried on a real keyboard.

Dragging keys was tried in a browser against the demo keyboard: swap, copy with Ctrl and
with Alt, switching between them during the drag, Esc, dropping outside the keys, the
rotated thumb keys, a layer other than the first, Undo and Redo, and editing a key with the
picker afterwards. The rules are covered by `npm test`. It has **not been tried on a real
keyboard**, and touch input has not been tried on any device.

## Using it

1. Open the page in a browser that supports WebSerial (Chrome, Edge or another
   Chromium-based browser). Firefox and Safari do not.
2. The keyboard firmware must have ZMK Studio enabled; see the
   [ZMK Studio documentation](https://zmk.dev/docs/features/studio).
3. Connect the keyboard over USB (on a split keyboard, the half that runs Studio, the
   central one), choose **USB**, and unlock it with the key bound to `&studio_unlock`.
4. In **Keys**, click a key to edit it, or drag it onto another key to swap the two
   (hold Ctrl or Alt to copy).
5. If the firmware has editable light maps, choose **Lights** in the header to edit the
   colors.
6. If the firmware has display settings, choose **Display** to set the screens.
7. If the firmware has the OLED layout, choose **OLED** to move the widgets of the two
   screens and to pick the animation of the right screen; turn on **Live values** to see
   them with what the keyboard says now.
8. Choose **Files** to save the keys, the colors and the screens into one file, or to
   apply one.
9. If the firmware tells its state, choose **Diagnostics** to see the firmware, the flash
   and the RAM that are left and what the keyboard is doing.
10. In the Display and OLED tabs, **Undo** and **Redo** of the header (Ctrl+Z, Ctrl+Y) take
    back what you changed in the screens.

## Development

```
npm ci
npm run dev
```

`npm run dev` and `npm run build` first run `npm run generate-data`, which downloads the
latest upstream release data from the GitHub API (set `GITHUB_TOKEN` to avoid rate
limits). To see the key labels without a keyboard:

```
npm run storybook
```

To try the app, including the Lights, Display, OLED, Files and Diagnostics tabs, without a
keyboard, choose **Demo keyboard** in the connection list. It is always there with `npm
run dev`; on the published app, add `?demo` to the address
(<https://lenerdz.github.io/zmk-studio/?demo>). **Demo keyboard (no light maps)**,
**Demo keyboard (no display settings)** and **Demo keyboard (no live status)** answer like
a firmware without them (the second has neither the Display nor the OLED tab, because the
layout of the screens is made of display settings; the third has no Diagnostics tab, and
its Live values say that the firmware cannot tell its state). See
[`src/lights/demo/README.md`](src/lights/demo/README.md).

To run the tests:

```
npm test
```

To build as the workflow does (the site lives under `/<repository>/`):

```
VITE_BASE_PATH=/zmk-studio/ npm run build
```

The workflow runs `npm test` before building, so a version whose tests fail is not
published.

Two files of the Lights tab are generated from `config/led_colors.dtsi` of corne-zmk; see
[`src/lights/README.md`](src/lights/README.md) for how to generate them again.

### Keeping up with upstream

```
git remote add upstream https://github.com/zmkfirmware/zmk-studio.git
git fetch upstream
git merge upstream/main
```

The upstream workflows `release-please` and `tauri-build` need secrets and a build
matrix that this fork does not have, so they are disabled in the repository settings
(Actions tab). The files themselves are identical to upstream.

The RPC client is vendored, so `package.json` no longer lists
`@zmkfirmware/zmk-studio-ts-client`: a new version of it, or new upstream messages, have to
be ported by hand (see [`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

## Files changed from upstream

Added: `src/keyboard/bindingDisplay.tsx`, `src/keyboard/BindingLabel.tsx`,
`src/keyboard/Keymap.stories.tsx`, `src/keyboard/corne.mock.ts`,
`src/keyboard/keyDrag.ts`, `src/keyboard/keyDrag.test.ts`, `src/keyboard/useKeyDrag.ts`,
`src/keyboard/KeyDragGhost.tsx` (dragging keys),
`src/lights/` (the Lights tab, the demo keyboard and their tests),
`src/display/` (the Display tab, the history of its changes and their tests; the demo keyboard answers its requests),
`src/oled/` (the OLED tab, its sprites and its tests; the demo keyboard has the settings of the layout),
`src/live/` (the two read-only requests, the poller and the demo keyboard's state),
`src/diagnostics/` (the Diagnostics tab), `src/backup/` (the Files tab),
`src/undoShortcuts.ts` (Ctrl+Z, Ctrl+Y) and its test,
`scripts/oled-assets/` (turns the pictures of zmk-nice-oled into those sprites),
`src/vendor/zmk-studio-ts-client/` (the RPC client with the messages of the fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modified: `README.md` (replaced), `NOTICE`, `.gitignore`, `.prettierignore`, `index.html`, `download.html`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`src/keyboard/Keymap.tsx`, `src/keyboard/Key.tsx`, `src/keyboard/Keyboard.tsx`,
`src/keyboard/PhysicalLayout.tsx`, `src/behaviors/BehaviorBindingPicker.tsx`,
`src/hid-usage-name-overrides.json`, `src/App.tsx`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`,
`src/rpc/logging.ts`, `src/undoRedo.ts`.

The modified source files carry a comment saying so; for the JSON, HTML and text files,
this list is the notice.

## License

Apache License 2.0, as upstream. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
