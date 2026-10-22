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
the Display tab. The three tabs are used only when the firmware has what they edit.

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
change, so there is nothing to save: **Save**, **Discard**, **Undo** and **Redo** do not
act on these settings. **Restore Stock Settings** puts them back to the defaults too. What
each screen shows, and where, is set in the OLED tab (below) when the firmware has the OLED
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
shows lit, and sets what each screen shows and where:

- **Drag a widget** (the battery, the Bluetooth link, the layer name, the typing speed, the
  animation, ...) to move it. The arrow keys move the selected one by a pixel, or by eight
  with Shift. The inspector shows the size of each widget, where it is, and how much of it
  the panel shows.
- **Hide a widget** with Delete or with its switch, and **show it again** by clicking it
  in the tray of hidden widgets or by dragging it onto the screen.
- **Choose the picture of the right screen** in a gallery: five animations (Gem, Cat,
  Head, Spaceman, Pokemon) and two still images, each one playing in its card, with its
  size and the time of a cycle. Click one, or drag it onto the right screen, and set the
  time of one cycle.
- **See what the screens can show**, with the size of each thing, and which choices only a
  new firmware build adds (the Luna dog, the Bongo cat, the modifier indicators, Raw HID,
  ...), each with the option to turn on.

Everything is applied by the keyboard at once and kept by it a few seconds after the last
change, so there is nothing to save: **Save**, **Discard**, **Undo** and **Redo** do not
act on the layout. **Restore Stock Settings**, and **Restore defaults** of the Display tab,
put it back to what the firmware was built with. The drawings are samples, not the live
state of the screens.

It needs what the Display tab needs, with `CONFIG_KEYPAW_OLED_LAYOUT=y` in the build of
both halves, and the [zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork of
lenerdz, which reads the layout while the keyboard runs. It has no requests of its own: the
layout is made of display settings (ids 16 and up), read and written with the three
requests of the Display tab. With any other firmware the OLED view is not offered and the
app works as before.

How the geometry works (the canvas of 68 x 160 pixels, the strip of 32 x 128 that the panel
shows, the position of the picture), the ids, the files and how the sprites are generated:
[`src/oled/README.md`](src/oled/README.md).

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
back as built and the zoom levels; the demo keyboard without display settings has no OLED
tab. It is covered by `npm test`. It has **not been tried on a real keyboard**: whether
each widget moves where the app says (the conversion of the coordinates of the picture
rests on reading the code of zmk-nice-oled), whether the pictures switch while the
keyboard runs, and what the right half shows after it receives its settings are
unconfirmed. Touch input has not been tried on any device.

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
   screens and to pick the animation of the right screen.

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

To try the app, including the Lights, Display and OLED tabs, without a keyboard, choose **Demo
keyboard** in the connection list. It is always there with `npm run dev`; on the published
app, add `?demo` to the address (<https://lenerdz.github.io/zmk-studio/?demo>). **Demo
keyboard (no light maps)** and **Demo keyboard (no display settings)** answer like a
firmware without them (the second has neither the Display nor the OLED tab, because the
layout of the screens is made of display settings). See
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
`src/display/` (the Display tab and its tests; the demo keyboard answers its requests),
`src/oled/` (the OLED tab, its sprites and its tests; the demo keyboard has the settings of the layout),
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
