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

What does not change: the protocol, what is read from or written to the keyboard, and
the firmware. The changes only affect how keys are drawn and how the app is hosted.

### Status

Checked with the Storybook stories, whose sample data
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) follows the sources of ZMK
and [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix). Not yet checked against
a real keyboard connected over USB. If a key shows a wrong or empty label, the behavior
name shown in its tooltip is what the rules in `src/keyboard/bindingDisplay.tsx` have to
handle.

## Using it

1. Open the page in a browser that supports WebSerial (Chrome, Edge or another
   Chromium-based browser). Firefox and Safari do not.
2. The keyboard firmware must have ZMK Studio enabled; see the
   [ZMK Studio documentation](https://zmk.dev/docs/features/studio).
3. Connect the keyboard over USB (on a split keyboard, the half that runs Studio, the
   central one), choose **USB**, and unlock it with the key bound to `&studio_unlock`.

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

To build as the workflow does (the site lives under `/<repository>/`):

```
VITE_BASE_PATH=/zmk-studio/ npm run build
```

### Keeping up with upstream

```
git remote add upstream https://github.com/zmkfirmware/zmk-studio.git
git fetch upstream
git merge upstream/main
```

The upstream workflows `release-please` and `tauri-build` need secrets and a build
matrix that this fork does not have, so they are disabled in the repository settings
(Actions tab). The files themselves are identical to upstream.

## Files changed from upstream

Added: `src/keyboard/bindingDisplay.tsx`, `src/keyboard/BindingLabel.tsx`,
`src/keyboard/Keymap.stories.tsx`, `src/keyboard/corne.mock.ts`,
`.github/workflows/pages.yml`, `README.pt-BR.md`.

Modified: `README.md` (replaced), `NOTICE`, `.gitignore`, `index.html`, `download.html`,
`vite.config.ts`, `src/keyboard/Keymap.tsx`, `src/hid-usage-name-overrides.json`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`.

The modified source files carry a comment saying so; for the JSON, HTML and text files,
this list is the notice.

## License

Apache License 2.0, as upstream. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
