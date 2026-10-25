# Demo keyboard

A keyboard that lives in the browser, to try the app (and to test it) without hardware. It
answers the requests of ZMK Studio the way a Corne running
[corne-zmk](https://github.com/lenerdz/corne-zmk) does, including the light maps of the
Lights tab, the display settings of the Display tab, the layout of the screens of the
OLED tab (which is made of display settings), what the keyboard is doing now (the live
values of the OLED tab) and the firmware information of the Diagnostics tab.

## Using it

- With `npm run dev` it is always in the list of connections, as **Demo keyboard**.
- On the published app, add `?demo` to the address
  (<https://lenerdz.github.io/zmk-studio/?demo>).

There are three more entries: **Demo keyboard (no light maps)** answers like a firmware
without the editable light maps, **Demo keyboard (no display settings)** like one without
the display settings, and **Demo keyboard (no live status)** like one without the live
status and the firmware information. The Lights tab, the Display and OLED tabs, or the
Diagnostics tab (and the live values of the OLED tab, which then keeps its samples) are
not offered then, as it happens with any other keyboard. The Files tab is offered with all
four, since it needs only a keyboard that is connected and unlocked.

Nothing is saved: reloading the page starts again from the stock keymap and colors.

## What it simulates

| Files | What they are |
|---|---|
| `demoDevice.ts` | The logic: the answers and the notifications for each request, on plain objects |
| `demoTransport.ts` | Connects it to the app as a transport. The bytes go through the real framing and the real message encoding, in both directions |
| `demoColors.ts` | The colors the maps start with (generated) |
| `../../display/demo/demoDisplay.ts` | The display settings: ids 1 to 6 of the Display tab and the 41 settings of the OLED layout (ids 16 to 115), 47 in all, with the ranges and defaults of `display_settings.c` |
| `../../live/demo/demoStatus.ts` | The live status and the firmware information: a keyboard that is in use (the layer changes every 4 seconds among the first three, the typing speed swings between 20 and 80 words per minute, the batteries go down one point a minute) and the memory numbers of the left half of the build of corne-zmk (the FLASH and RAM lines of its CI log) |

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
  of the Display tab and the 41 of the OLED layout (the build of the Corne of corne-zmk,
  with the cat as the animation) with their ranges and defaults, `INVALID_ID` and
  `INVALID_VALUE` answers, and the restore of the defaults. They are kept as they change
  (there is no saved copy and no unsaved flag, as in the firmware). The ranges are written
  in `demoDisplay.ts` on purpose, like the limits of the light maps.
- The live status and the firmware information follow a clock, so the values are
  predictable and a test can set the clock (`clock`). The memory numbers are written in
  `demoStatus.ts` on purpose and are not read from the build.
- Saving, discarding and the settings reset work for the keymap and for the lights; the
  settings reset also puts the display settings back.
- What it does not have: moving, adding and removing layers (the layer count is fixed),
  a lock (it starts unlocked) and everything that depends on the hardware.

## For tests

`createDemoTransport(options)` takes:

- `lights: false` to behave like a firmware without the light maps.
- `display: false` to behave like a firmware without the display settings (and so
  without the layout of the OLED tab).
- `status: false` to behave like a firmware without the live status and the firmware
  information (the requests 109 and 110).
- `clock` to give the clock of the live status, in milliseconds (the real one by default).
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
