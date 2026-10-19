# Lights tab

An editor for the color of every LED of every layer, drawn on the keyboard. It needs a
firmware with editable light maps: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). With any other firmware the tab is not
offered and the app works like the original ZMK Studio.

## What it does

- A list of the layers that have a map, in the order of the keymap, with the names the
  keymap gives them.
- A drawing of the keyboard. Each key is drawn where it is, with its label and its LED
  color; the underglow LEDs, which have no key, are small round cells in a strip under the
  keys (numbered 1 to 6 on each half).
- **Paint**: choose a color and drag across the LEDs. The app shows the color while you
  paint and sends the stroke to the keyboard when you let go; the keyboard shows it at
  once. **Pick** takes the color of an LED. The cells can also be used with the keyboard
  (Tab to move, Enter or Space to paint).
- The color comes from the 14 swatches (the names of the palette of `led_colors.dtsi`),
  the system color picker or a hex field.
- **Fill** all the LEDs, only the keys or only the underglow of the layer. Only the LEDs
  that really change are sent.
- **Restore layer defaults**: the layer goes back to the colors the firmware was built
  with.
- **Export led_colors.dtsi**: downloads the colors of all the layers as the
  `config/led_colors.dtsi` of corne-zmk, to build them into the firmware as the new
  defaults. The button is only enabled for that keyboard (54 LEDs per layer, layers 0 to 6).
- A zoom selector for the drawing (remembered by the browser).

The edits live in the keyboard's memory until you press **Save** (top right), which saves
the light maps together with the keymap; **Discard** throws away both. Every stroke,
fill and restore is one step of the **Undo** and **Redo** of the header, mixed in order
with the key edits. **Restore Stock Settings** (menu of the connected keyboard) also puts
the colors back to the defaults the firmware was built with.

## How the colors travel

The firmware keeps, for each layer, one color per slot. There are 54 slots per layer on the
Corne: slot 0 to 41 are the LEDs under the keys (the slot is the position of the key), 42
to 47 are the underglow of the left half and 48 to 53 the underglow of the right half. The
layers have the ids of the keymap layers (0 to 6).

The requests are in the keymap subsystem of ZMK Studio, with tags from 100 so that a
future upstream request cannot collide with them:

| Request | Tag | What it does |
|---|---|---|
| `get_led_info` | 100 | The number of slots, the ids of the layers that have a map and whether there are unsaved light changes. A firmware without the maps answers "RPC not found", and the tab is hidden |
| `get_led_map` | 101 | The 54 colors (`0xRRGGBB`) of a layer |
| `set_led_colors` | 102 | Changes up to 16 slots of a layer, live (the keyboard shows them at once). The answer is `OK`, `INVALID_LAYER`, `INVALID_SLOT` or `BUSY` |
| `save_led_changes` | 103 | Keeps the changes in the memory of the keyboard |
| `discard_led_changes` | 104 | Goes back to what was saved |
| `restore_led_defaults` | 105 | Puts a layer back to the defaults of the build, live, and returns its colors |

The notification `unsaved_led_changes_status_changed` (tag 100) says when the keyboard has
or no longer has unsaved light changes. The flag follows the colors: changing a color and
changing it back makes it unsaved and then saved again.

More than 16 slots are sent in several requests (`sendLedColors`), and a `BUSY` answer is
tried again a few times (`src/lights/ledProtocol.ts`). The firmware has to be built with
`CONFIG_ZMK_STUDIO_RPC_RX_BUF_SIZE=256` (corne-zmk does it in `config/corne_left.conf`):
a request with 16 entries is 158 bytes with the framing, and the default receive buffer of
ZMK Studio holds 30 and drops the bytes that do not fit.

## Files

| File | What it is |
|---|---|
| `LightsTab.tsx` | The tab: layer list, palette, tools, export button |
| `LedBoard.tsx` | The drawing of the keyboard and the pointer and keyboard handling |
| `ledLayout.ts` | Where each slot is drawn (the keys from the physical layout reported by the keyboard, the underglow as a strip) |
| `ledColors.ts` | The palette and the color helpers |
| `ledProtocol.ts` | The six requests, with the chunking and the retry |
| `useLedMaps.ts`, `LedMapsContext.ts` | The state: loads the maps, applies the edits as undoable steps, saves and discards, follows the notification |
| `useKeyboardView.ts` | Loads the physical layout, the keymap and the behaviors to draw the keys |
| `exportDtsi.ts`, `dtsiTemplate.ts` | The text of `led_colors.dtsi` (the template is generated) |
| `keyNames.ts`, `text.ts` | The names of the keys for the comments of the exported file, in plain ASCII |
| `ViewSwitch.tsx` | The Keys and Lights buttons of the header |
| `demo/` | A keyboard that lives in the browser (see [`demo/README.md`](demo/README.md)) |
| `testUtils.ts` | A helper of the tests; the app does not use it |

`src/App.tsx` and `src/AppHeader.tsx` connect the tab to the rest of the app (the header
switch, the combined Save and Discard, the reset).

## Another keyboard

The number of slots and the layers come from `get_led_info`, and the keys are drawn from
the physical layout, so the tab works with any keyboard that runs the same firmware
support. Two things are specific to the Corne of corne-zmk:

- `ledLayout.ts` has the coordinates of the Corne underglow (taken from its overlays); any
  other keyboard gets its extra LEDs in a plain row.
- The export (`exportDtsi.ts`) writes the layout of `config/led_colors.dtsi` of corne-zmk,
  and `canExportDtsi` only allows it for 54 slots and the layer ids 0 to 6.

## Generated files

`dtsiTemplate.ts` and `demo/demoColors.ts` are generated from `config/led_colors.dtsi` of
corne-zmk. After that file changes, from the root of this repository:

```
node scripts/generate-led-data.mjs <path to led_colors.dtsi>
npm test
```

The script needs a C preprocessor (`cc`, or set `CPP`, for example `CPP="zig cc"`).

The file the button exports has the same structure and the same colors as the one in
corne-zmk, but not the same comments: the names of the keys come from the keyboard, and
the title of each layer has no highlight color.

## Tests

`npm test` runs the tests of this folder and of the vendored client: the palette and
the color helpers, the text of the export (it is read back and compared with the colors
it came from), the names of the keys, the requests against the demo keyboard (through the
real framing and message encoding) and the logic of the demo keyboard.

## Status on a real keyboard

All of this was tried in a browser against the demo keyboard and covered by the tests
above. On a real Corne the owner reported that it worked, without detail about each
operation, so the live edits, the saving to flash, the discard, the settings reset and the
copy of the colors to the right half have no individual confirmation. The firmware side
compiles in the CI of corne-zmk.
