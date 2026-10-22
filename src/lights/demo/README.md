# Demo keyboard

A keyboard that lives in the browser, to try the app (and to test it) without hardware. It
answers the requests of ZMK Studio the way a Corne running
[corne-zmk](https://github.com/lenerdz/corne-zmk) does, including the light maps of the
Lights tab, the display settings of the Display tab and the layout of the screens of the
OLED tab (which is made of display settings).

## Using it

- With `npm run dev` it is always in the list of connections, as **Demo keyboard**.
- On the published app, add `?demo` to the address
  (<https://lenerdz.github.io/zmk-studio/?demo>).

There are two more entries: **Demo keyboard (no light maps)** answers like a firmware
without the editable light maps, and **Demo keyboard (no display settings)** like one
without the display settings. The Lights tab, or the Display and OLED tabs, are not
offered then, as it happens with any other keyboard.

Nothing is saved: reloading the page starts again from the stock keymap and colors.

## What it simulates

| Files | What they are |
|---|---|
| `demoDevice.ts` | The logic: the answers and the notifications for each request, on plain objects |
| `demoTransport.ts` | Connects it to the app as a transport. The bytes go through the real framing and the real message encoding, in both directions |
| `demoColors.ts` | The colors the maps start with (generated) |
| `../../display/demo/demoDisplay.ts` | The display settings: ids 1 to 6 of the Display tab and the 37 settings of the OLED layout (ids 16 to 106), 43 in all, with the ranges and defaults of `display_settings.c` |

- The physical layout, the behaviors and the keymap come from
  [`src/keyboard/corne.mock.ts`](../../keyboard/corne.mock.ts). Like the data of the
  stories, they follow the sources of ZMK and zmk-rgb-matrix and the keymap of corne-zmk;
  they were not captured from a real keyboard.
- The light maps follow the rules of `studio_rpc.c` in the zmk-rgb-matrix module: a live,
  a saved and a default copy of each map, an unsaved flag that follows the colors, the
  notification when the flag changes, 54 slots per layer, at most 16 entries per
  `set_led_colors`, and `INVALID_LAYER`, `INVALID_SLOT` and `BUSY` answers. The limits are
  written in `demoDevice.ts` on purpose, and not taken from the app, so a mistake in the
  app shows up as an error here.
- The display settings follow `display_settings.c` of the same module: the six settings
  of the Display tab and the 37 of the OLED layout (the build of the Corne of corne-zmk,
  with the cat as the animation) with their ranges and defaults, `INVALID_ID` and
  `INVALID_VALUE` answers, and the restore of the defaults. They are kept as they change (there is no saved copy and no
  unsaved flag, as in the firmware). The ranges are written in `demoDisplay.ts` on purpose,
  like the limits of the light maps.
- Saving, discarding and the settings reset work for the keymap and for the lights; the
  settings reset also puts the display settings back.
- What it does not have: moving, adding and removing layers (the layer count is fixed),
  a lock (it starts unlocked) and everything that depends on the hardware.

## For tests

`createDemoTransport(options)` takes:

- `lights: false` to behave like a firmware without the light maps.
- `display: false` to behave like a firmware without the display settings (and so
  without the layout of the OLED tab).
- `busyResponses: n` to answer `BUSY` to the first `n` requests that set colors.
- `refuseDisplayWrites: n` to answer `INVALID_VALUE` to the first `n` requests that change
  a display setting.

`src/lights/testUtils.ts` has `connectDemo`, which gives a connection like the one the app
makes (see `src/lights/ledProtocol.test.ts` and `src/display/displayProtocol.test.ts`).

## The generated colors

`demoColors.ts` is generated from `config/led_colors.dtsi` of corne-zmk, after the C
preprocessor expanded the palette and `LED_SLOTS`, so the demo starts with the colors the
firmware is built with:

```
node scripts/generate-led-data.mjs <path to led_colors.dtsi>
```

The same command generates `src/lights/dtsiTemplate.ts` (see [`../README.md`](../README.md)).
