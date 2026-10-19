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

What does not change: the editing of the keymap, and what the app reads from or writes to
the keyboard for it. The icons only affect how keys are drawn and how the app is hosted;
dragging keys (below) writes with the same request as the binding picker; the Lights tab
(further below) adds requests of its own and is used only when the firmware has them.

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

## Status

The icons were checked with the Storybook stories, whose sample data
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) follows the sources of ZMK
and [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix), and used with a real
Corne connected over USB: the icons and labels worked (reported by the keyboard's owner).
If a key shows a wrong or empty label, the behavior name shown in its tooltip is what the
rules in `src/keyboard/bindingDisplay.tsx` have to handle.

The Lights tab was tried in a browser against the demo keyboard, through the same framing
and message encoding as with a real keyboard, and is covered by `npm test`. It has **not
been tried on a real keyboard** yet.

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

To try the app, including the Lights tab, without a keyboard, choose **Demo keyboard** in
the connection list. It is always there with `npm run dev`; on the published app, add
`?demo` to the address (<https://lenerdz.github.io/zmk-studio/?demo>). **Demo keyboard (no
light maps)** answers like a firmware without them. See
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
`src/vendor/zmk-studio-ts-client/` (the RPC client with the messages of the fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modified: `README.md` (replaced), `NOTICE`, `.gitignore`, `index.html`, `download.html`,
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
