# OLED tab

An editor for what the two OLED screens of the keyboard show and where: which widgets of
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) are drawn, where each one is,
how big it is, and which animation or image the right screen plays (and how that picture
is turned, cut to a piece and mixed with the widgets that are over it). It shows what each
thing looks like and lets you click and drag to rearrange the screens.

It needs a firmware with the OLED layout: the
[zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) module of lenerdz (branch
`corne-fixes`, built with `CONFIG_KEYPAW_DISPLAY_SETTINGS=y` and
`CONFIG_KEYPAW_OLED_LAYOUT=y`, in **both** halves), the
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) fork (which reads the layout and
draws again when it changes) and the protocol of
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), as set up in
[corne-zmk](https://github.com/lenerdz/corne-zmk). The tab is offered when the keyboard
lists display settings with the ids from 16 up; with any other firmware it is not offered
and the app works like the original ZMK Studio (the Display tab, if the firmware has
display settings, is the same as before).

The tab has no requests of its own. The layout is made of display settings, and it reads
and writes them with the same three requests as the [Display tab](../display/README.md)
(`get_display_info`, `set_display_setting` and `restore_display_defaults`).

## What it does

The header has a fourth view, **OLED**, next to **Keys**, **Lights** and **Display** (each
one only when the firmware has what it edits; **Files** and **Diagnostics** come after it).
It shows the two screens, the left one (the central half, the one on USB) and the right one
(the peripheral half), each in a panel:

- **The panel as it looks on the keyboard.** The strip the OLED shows, 32 x 128 pixels,
  standing up the way the screen is read on the keyboard (the panel is a 128 x 32 one, but
  it is mounted on its side, so on the keyboard it is never horizontal). It is first in the
  panel, so it stays in sight while a widget is dragged in the editor. The button **Turn the
  view** turns it a quarter of a turn clockwise each time (0, 90, 180 and 270 degrees) for
  whoever wants to see the panel as it is built. It turns **only the view**: nothing is sent
  to the keyboard, and the browser remembers the turn of each screen. When the view is on its
  side the preview goes above the editor, so the screens keep their columns in the tab.
- **The screen, upright.** The screen is drawn the way you read it, on its canvas of
  68 x 160 pixels, with the strip that the OLED really shows (32 x 128 pixels) lit, the
  rest dimmed, and rulers in pixels of the canvas. The editor shows 24 pixels around the
  canvas, so a widget that is off it can be found and brought back.
- **Move.** Press a widget and drag it. The keyboard follows while you drag. A widget keeps
  at least 6 pixels of itself inside the editor, so it can be grabbed again. The arrow
  keys move the selected widget by one pixel, and by eight with Shift.
- **Show and hide.** **Delete** (or Backspace) hides the selected widget, and so does the
  switch of the inspector. A hidden widget goes to the tray **Hidden widgets** under the
  screen: click it to show it again where it was (or at the top of what the panel shows,
  if it was off the panel), or drag it onto the screen to show it centered where you drop
  it.
- **The inspector.** Click a widget to see its **size**, where it is on the canvas, how
  much of it the panel shows (all of it, a part or nothing), and the position and state
  the firmware was built with. It has the switch, the fields of x and y, four arrows that
  move it by one pixel (eight with Shift), a button that brings a widget that is outside
  what the panel shows onto it, and **Put it back as built**. For the picture of the right
  screen it also has the **Picture** menu, the speed, **Turn the picture**, **Widgets over
  the picture** and **Show only a piece of the picture** (see below).
- **The pictures of the right screen.** A gallery with the 42 pictures, in two groups: the
  36 animations (Gem, Cat, Head, Spaceman, Pokemon and the 31 that lenerdz added) and the 6
  still images (Mountains, Skyline, Circuit, Keyboard, Moon cat and Planet), each one playing
  in its card, with its size and, for the animations, its frames and the time of a cycle. Click a card
  to play it on the right screen, or drag it onto the screen to play it centered where you
  drop it. A new picture starts upright and whole, with its center where the center of the
  old one was, and inside the strip the panel shows when it fits there (so a picture 32
  pixels wide lands exactly on the strip).
- **Turn the picture.** **Turn left** and **Turn right** turn the picture a quarter of a
  turn about its own center, and **Upright** puts it back (setting 112, 0 to 3 quarter turns
  clockwise). Only the picture turns: the text widgets are drawn by the firmware with fonts
  that cannot be turned. The piece that shows (see below) turns with the picture, and the
  picture stays centered where it was.
- **Widgets over the picture.** What happens where a widget is over a lit pixel of the
  picture (setting 113): **Shown in reverse, to stay readable** (the default; a lit pixel of
  the picture flips the pixel under it, so a widget shows dark on the bright parts of the
  picture and lit on the dark parts) or **Added to the picture** (the lit pixels of the
  picture are lit and nothing else changes, so a widget disappears where the picture is
  bright). The picture is drawn on the canvas after the widgets, so every widget can be
  moved over it, the battery of the right half included, and so can the light toast (the
  firmware writes it on the canvas like the other widgets, so the picture goes over it
  too). The editor and the preview draw the reverse with a `difference` blend, which flips
  a pixel between two colors, in a group of their own so that the blend sees only the
  layers of that screen.
- **Show only a piece of the picture.** A frame over the picture, in pixels of the picture
  as it is turned: drag inside it to move it, drag an edge or a corner to resize it, drag
  outside it to draw a new one, or type **X**, **Y**, **Width** and **Height**. The picture
  stays where it is on the screen and only what is inside the frame shows (the editor shows
  the rest very faintly, so the whole picture can be found and the piece moved). **Whole
  picture** drops the cut, and **Center on the screen** puts the piece in the middle of the
  strip the panel shows. The cut is two settings (114 holds `x | y << 8` and 115 holds
  `w | h << 8`; a width or a height of 0 is the whole picture), so a piece can be at most
  255 pixels from the left or the top.
- **What the screens can show.** Every widget of the keyboard, with its size and what the
  panel shows of it now, and, after it, **Only with a new firmware build**: the widgets the
  firmware was built without, and the things the layout does not cover (the Luna dog, the
  Bongo cat, the modifier indicators, Raw HID, ...), each with the option to turn on.
- **Zoom** from 2x to 5x, a **grid of 8 pixels**, a switch to play the animations (off
  to begin with when the system asks for reduced motion) and **Live values** (below).
- **Put this screen back as built**, on each screen.

Everything is applied by the keyboard at once and kept by it a few seconds after the last
change (`CONFIG_KEYPAW_DISPLAY_SAVE_DEBOUNCE_MS`, 3 s), so there is nothing to save:
**Save** and **Discard** in the header do not act on the layout. **Undo** and **Redo** do,
while this tab or the Display tab is open (the header buttons, Ctrl+Z, Ctrl+Y and
Ctrl+Shift+Z): the two tabs share one history, which is kept by the display controller (see
the [Display tab](../display/README.md#undo-and-redo)). One drag of a widget is one step, and
so are ten presses of an arrow key close together, a widget shown or dropped from the tray,
a picture chosen, a turn, a drag of the frame of the cut and **Put this screen back as
built**. **Restore defaults** of the Display tab and **Restore Stock Settings** put the
layout back to the defaults too.

## Live values

By default the drawings are samples (a battery of 85% on the left and 90% on the right,
the layer `QWERTY`, a typing speed of 42, the toast `EFFECT 4` and `RAINBOW`). The switch
**Live values** next to **Play the animations** draws them from the keyboard instead, with
`useLiveStatus` of [`../live`](../live/README.md), which asks the left half what it is
doing (the request `get_live_status`) about twice a second, while the switch is on and this
tab is open. What follows the keyboard:

| Widget | Drawn from |
|---|---|
| Battery (right) | The battery of the right half, as the left one knows it: `--%` while it has not reported |
| Link with the left half | Filled while the left half sees the right one, crossed out when it does not |
| Output (USB or Bluetooth) | The USB icon while the keys go to USB; otherwise the state of the selected profile: connected, paired without signal, or not paired |
| Battery (left) | The level of each half (both, in the build with the text of the two batteries; the left one with the big percentage in the other build). A level that was not read is 0, as on the screen, which starts with 0 in every battery |
| Bluetooth profiles | The mark on the selected profile, in both looks (the dots and the five boxes) |
| Profile number | The selected profile, from 1 |
| Layer | The name of the highest active layer, in capitals and cut at nine letters, or `Layer N` when it has no name |
| Speedometer | The needle, at the typing speed: the angle is worked out as `wpm.c` of zmk-nice-oled does, in single precision and with the pixels cut as C cuts them |
| Typing speed (number) | The number, moved right by the digits it lacks, as the screen does |
| Typing speed (graph) | The last five readings of the ten the screen keeps (one reading a second, the oldest first): the left half of the grid is the part the panel shows |

The animation or image and the light toast have nothing to read and stay as they are. The
widgets keep their positions and switches: only what they draw changes, so the size and the
part that the panel shows (the inspector and the list of what the screens can show) follow
the live text too (a battery of three digits is wider). Without an answer from the keyboard
(it is still reading, the firmware cannot tell its state, or an error) the drawings stay
samples, and the line below the switch says which. The right screen gets its settings from
the left half, which can take a few seconds after it connects.

## The geometry

zmk-nice-oled draws every widget on a canvas of 68 x 160 pixels and rotates it by 270
degrees before it goes to the 128 x 32 panel. The panel shows only a strip of the canvas:
the columns 0 to 31 and the rows 32 to 159. The app works upright, the way the screen is
looked at on the desk: **x goes right and y goes down**, in pixels of the canvas, and these
are the numbers of the `CONFIG_NICE_OLED_WIDGET_*` position options (`*_CUSTOM_X` and
`*_CUSTOM_Y`) of the widget.

The picture of the right screen (the animation or the image) is the exception. The
firmware places it on the landscape canvas, the one the panel is mounted with, so its
position (X, Y) is the corner of the picture on that canvas, which is the upright canvas
turned by 90 degrees. For a picture of height h whose upright corner is (u, v):

```
X = 160 - v - h        Y = u
u = Y                  v = 160 - X - h
```

A larger X moves the picture up on the screens of the app and a larger Y moves it to the
right. With the position of the build, X = 18 and Y = -18, an animation of 68 x 69 pixels
has its upright corner at u = -18, v = 73. The inspector writes X and Y (capitals) for the
picture, so that the numbers are the ones of the options, and the editor does this
conversion both ways: `pictureRect` and `picturePosition` in `oledGeometry.ts`.

The firmware puts the picture on the canvas **after** the canvas was rotated for the panel,
which is why a widget can be over it, and it turns and cuts it there: the picture is turned
by the quarter turns of the setting 112 (clockwise, as the screen is looked at), and the
cut is a rectangle of the picture as it is turned, in its own pixels. The position (X, Y) is
always the corner of the **whole** turned picture, and the cut only hides what is outside
the rectangle, so the piece that shows does not jump when the cut changes. `valuesForTurn`
in `oledLayout.ts` turns the picture about its center (the piece that shows turns with it,
and a turn to the left followed by one to the right gives back the same settings), and
`valuesForKindChange` picks the position and the cut of a new picture.

## The widgets

The ids are the ones of `include/zmk/display_settings.h` in the zmk-rgb-matrix module: a
block of eight ids per widget, from 16, in which `+0` is whether the widget is shown, `+1`
its x, `+2` its y and, for the picture, `+3` its kind and `+4` the time of one cycle in
milliseconds (0 is the time of the animation itself). The range of x and y is -160 to 320.
The picture has four more, in a block of their own: `112` its turn (0 to 3 quarter turns
clockwise), `113` how the widgets mix with it (0 added, 1 in reverse, the default), `114` the
corner of the piece that shows (`x | y << 8`) and `115` its size (`w | h << 8`; a width or a
height of 0 is the whole picture).
The app only uses the ids to know what each setting is: the value, the range and the
default of every setting come from the keyboard, and a widget the firmware was built
without simply is not listed.

| Widget | Screen | Ids | The firmware has it when |
|---|---|---|---|
| Animation or image | right | 16 shown, 17 X, 18 Y, 19 kind, 20 cycle | the build does not have the smart battery animation (`CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_SMART_BATTERY=n`, the default). With the layout every animation and image of the gallery is in the firmware, and the `CONFIG_NICE_OLED_WIDGET_ANIMATION_PERIPHERAL_*` options of the build, which have to be the same in both halves, only choose the one the screen starts with (the options of the two still images that were taken out ask for a picture that is no longer there, and the screen starts with the Gem then) |
| Battery | right | 24 shown, 25 x, 26 y | always |
| Link with the left half | right | 32 shown, 33 x, 34 y | always |
| Light toast | right | 41 x, 42 y | always listed; it is drawn when the build has `CONFIG_NICE_OLED_WIDGET_LED_TOAST=y`, and it has no switch here: turning it on and off, and how long it stays, are settings 5 and 6 of the Display tab |
| Output (USB or Bluetooth) | left | 48 shown, 49 x, 50 y | always |
| Battery | left | 56 shown, 57 x, 58 y | always |
| Bluetooth profiles | left | 64 shown, 65 x, 66 y | always |
| Profile number | left | 72 shown, 73 x, 74 y | always |
| Layer | left | 80 shown, 81 x, 82 y | `CONFIG_NICE_OLED_WIDGET_LAYER=y` |
| Speedometer | left | 88 shown, 89 x, 90 y | `CONFIG_NICE_OLED_WIDGET_WPM_SPEEDOMETER=y` |
| Typing speed (number) | left | 96 shown, 97 x, 98 y | `CONFIG_NICE_OLED_WIDGET_WPM_NUMBER=y` |
| Typing speed (graph) | left | 104 shown, 105 x, 106 y | `CONFIG_NICE_OLED_WIDGET_WPM_GRAPH=y`, without the Luna dog, the Bongo cat or the fixed modifier indicators |

The kinds of the picture are 0 Gem (the crystal of zmk-nice-oled), 1 Cat, 2 Head,
3 Spaceman and 4 Pokemon (the five animations of zmk-nice-oled), and 7 to 65, which the
lenerdz fork adds: 7 to 25 the first batch (11 animations and 8 still images) and 26 to 65
the second (20 animations, 26 to 45, and 20 still images, 46 to 65). `scripts/pictures/` of
the shield draws them, and the numbers are kept in the flash of the keyboard, so a new
picture is only added at the end.

Twenty-four of the 66 numbers are **retired**: the still images nobody used were taken out
of the firmware, the two of the original shield (5 Vim and 6 VIPs Marcos) and 22 of the
fork's (21 Alien, 22 Heart, 24 Pulsar, 25 Rocket, 46 Coffee, 47 Cactus, 48 Lighthouse,
50 Robot, 52 Castle, 53 Tree, 54 Skull, 55 Sword, 56 Key, 57 Antenna, 58 Potion,
59 Sailboat, 60 Compass, 61 Crown, 62 Cassette, 63 Floppy disk, 64 Moon phases and
65 Mushroom). Only six still images were kept (Mountains, Skyline, Circuit, Keyboard, Moon
cat and Planet), so the gallery has 42 pictures: 36 animations and 6 still images. A retired
kind keeps its number, because the kinds after it must not move, but it has no picture in
the keyboard: the keyboard does not accept it as the value of the picture (`INVALID_VALUE`),
and the app neither offers it nor draws it (`RETIRED_ANIMATION_KINDS` and `isRetiredKind` in
`oledCatalog.ts`, the same list as `kp_oled_anim_kind_retired()` in the module). A keyboard
that had one of them saved forgets it and goes back to the picture of the build, and a
file of the [Files tab](../backup/README.md) that has one leaves it out when it is applied,
and says so. The options `CONFIG_NICE_OLED_WIDGET_STATIC_IMAGE_PERIPHERAL_VIM` and
`CONFIG_NICE_OLED_WIDGET_STATIC_IMAGE_PERIPHERAL_VIP_MARCOS` still work in a build without
the layout; with it, a build that asks for one of them starts with the Gem.

The sizes are the upright ones, the way the screen is looked at:

| Picture | Kind | Size | Frames | A cycle of its own |
|---|---|---|---|---|
| Gem | 0 | 68 x 69 | 16 | 960 ms |
| Cat | 1 | 68 x 69 | 8 | 960 ms |
| Head | 2 | 68 x 69 | 16 | 4800 ms |
| Spaceman | 3 | 68 x 69 | 20 | 4800 ms |
| Pokemon | 4 | 68 x 69 | 48 | 10000 ms |
| Equalizer | 7 | 32 x 64 | 16 | 1200 ms |
| Radar | 8 | 32 x 32 | 24 | 2400 ms |
| Heartbeat | 9 | 32 x 64 | 16 | 1600 ms |
| Digital rain | 10 | 32 x 128 | 32 | 3200 ms |
| Wire cube | 11 | 32 x 32 | 16 | 1600 ms |
| Atom | 12 | 32 x 32 | 24 | 2400 ms |
| Helix | 13 | 32 x 128 | 16 | 1600 ms |
| Warp | 14 | 32 x 64 | 24 | 2400 ms |
| Sonar | 15 | 32 x 32 | 16 | 1600 ms |
| Bouncing ball | 16 | 32 x 64 | 24 | 1200 ms |
| Flame | 17 | 32 x 64 | 16 | 1200 ms |
| Mountains | 18 | 32 x 128 | still | none |
| Skyline | 19 | 32 x 128 | still | none |
| Circuit | 20 | 32 x 128 | still | none |
| Keyboard | 23 | 32 x 64 | still | none |
| Waterfall | 26 | 32 x 128 | 16 | 1600 ms |
| Lava lamp | 27 | 32 x 128 | 16 | 3200 ms |
| Storm | 28 | 32 x 64 | 16 | 1600 ms |
| Snowfall | 29 | 32 x 64 | 24 | 2400 ms |
| Jellyfish | 30 | 32 x 64 | 16 | 1600 ms |
| Falling blocks | 31 | 32 x 64 | 20 | 2000 ms |
| Pong | 32 | 32 x 64 | 24 | 1500 ms |
| Invaders | 33 | 32 x 64 | 8 | 1600 ms |
| Chomper | 34 | 32 x 32 | 16 | 1600 ms |
| Game of Life | 35 | 32 x 64 | 30 | 3000 ms |
| Plasma | 36 | 32 x 64 | 24 | 2400 ms |
| Spiral | 37 | 32 x 32 | 16 | 1600 ms |
| Newton's cradle | 38 | 32 x 32 | 16 | 1600 ms |
| Gears | 39 | 32 x 32 | 12 | 1000 ms |
| Hourglass | 40 | 32 x 64 | 20 | 2000 ms |
| Windmill | 41 | 32 x 64 | 16 | 1600 ms |
| Fireworks | 42 | 32 x 64 | 24 | 2400 ms |
| Flying saucer | 43 | 32 x 64 | 16 | 1600 ms |
| Eye | 44 | 32 x 32 | 24 | 2400 ms |
| Key wave | 45 | 32 x 64 | 24 | 2400 ms |
| Moon cat | 49 | 32 x 64 | still | none |
| Planet | 51 | 32 x 64 | still | none |

The sizes of the other widgets are the ones of their drawing (the fonts `pixel8`,
`pixel12` and `pixel16` of zmk-nice-oled advance 4, 6 and 8 pixels per character, and
`unscii8` advances 8), and the inspector shows them. The slider **Time of one cycle** goes
from 0.1 s to 30 s in steps of 0.1 s, and the switch **Speed of the animation itself**
leaves it at 0, the time of the animation (the keyboard accepts up to 60 s, and counts a
value from 1 to 99 ms as 100 ms).

A widget that sits relative to another moves with it, as in the firmware: the needle with
the speedometer, the Bluetooth icons with the USB icon, the points of the graph with its
grid.

## How the changes travel

A drag asks for dozens of positions per second. The app sends them through the same queue
as the Display tab (`../display/displayWriter.ts`): one request at a time, the last value
of each setting replaces the ones that wait, and at least 120 ms between the start of two
requests, so the keyboard follows the drag and always receives the final position. When
the keyboard refuses a change, or does not answer, the app shows the problem and reads the
settings again, so the screens go back to what the keyboard really has.

The keyboard applies a setting at once (the screen draws again, once for changes that come
together), writes it to flash a few seconds after the last change, and sends to the right
half the settings of the right screen.

## Files

| File | What it is |
|---|---|
| `OledTab.tsx` | The tab: the controls (zoom, grid, animations, Live values), the two screens, the inspector, the gallery and the list of possibilities; every gesture that changes several settings is sent as one step of Undo |
| `ScreenPanel.tsx` | One screen: the panel standing up (with the button that turns the view), the upright editor, the tray of hidden widgets and the reset |
| `ScreenEditor.tsx` | The upright canvas: the dimming, the rulers, the widgets to drag (pointer, keys and drop) |
| `PanelPreview.tsx` | The strip the panel shows, standing up or turned (the view only) |
| `ArtLayers.tsx` | The widgets of a screen drawn together the way the firmware puts them on the canvas: the picture cut to its piece, and the reverse where a widget is over it |
| `HiddenTray.tsx` | The widgets that are not drawn, to click or drag back |
| `OledInspector.tsx` | Size, position and switch of the selected widget, and the controls of the picture |
| `PictureControls.tsx` | The picture of the right screen in the inspector: the menu, the speed, the turn, the mix with the widgets and the cut |
| `PictureCrop.tsx` | The frame that picks the piece of the picture that shows (drag, resize, fields) |
| `NumberField.tsx` | A whole number the keyboard accepts (position and cut) |
| `AnimationGallery.tsx` | The 42 pictures of the right screen, in two groups: the 36 animations and the 6 still images |
| `Possibilities.tsx` | What the screens can show (with what the panel shows of each one, from the samples or from the live values), and what only a new build adds |
| `PixelArt.tsx`, `useFrame.ts` | The drawing of sprites (turned by quarter turns when asked), fonts and samples, and the clock of the animations |
| `useViewTurn.ts` | The turn of the view of each screen, which the browser remembers |
| `dragTypes.ts` | The two kinds of drag (a widget of the tray, a picture of the gallery) |
| `oledIds.ts` | The ids of the layout settings |
| `oledGeometry.ts` | The canvas, the part the panel shows, rectangles, the coordinates of the picture |
| `pictureView.ts` | The arithmetic of the picture: turns, the two bytes of a setting, the cut (holding it inside the picture, turning it, the handles of the frame) |
| `oledCatalog.ts` | The widgets, the 42 pictures (and the list of the retired kinds) and the build-only features, with their texts and their drawings: the `*_ART` functions draw the samples, or the live readings when they get them (with `needlePoints`, `graphPoints` and `layerLabel`) |
| `oledLayout.ts` | The functions the tab is built from: the state of each widget from the settings (and from the live readings, when there are any), moving, showing, resetting, dropping, and changing, turning and cutting the picture |
| `assets/` | The sprites and fonts (PNG) and `sprites.ts`, the manifest (generated) |
| `*.test.ts` | Tests of the geometry, the catalog, the layout, the arithmetic of the picture and the turn of the view |

`src/App.tsx` and `src/lights/ViewSwitch.tsx` connect the tab to the rest of the app (the
header switch, and the Display context it shares), and `src/lights/appViews.ts` decides
when it is offered. `src/display/demo/demoDisplay.ts` has the 41 layout settings of the
demo keyboard.

## The sprites

The pictures and fonts are the ones of zmk-nice-oled, converted from its LVGL files (1 bit
per pixel) by `scripts/oled-assets/convert.py`, which writes the PNG files and
`assets/sprites.ts` (the size, the frames and the URL of each one, and the revision of
zmk-nice-oled they come from). The 37 pictures that the lenerdz fork adds (31 animations and 6 still images, among the
kinds 7 to 65) are listed in `assets/pictures/pictures.json` of the shield, which
`make_pictures.py` writes with the C files: the script reads that list, so a new picture needs no change in
the script, and it stops when a picture is not the size the list says. It needs
[Pillow](https://pillow.readthedocs.io/):

```
pip install pillow
python scripts/oled-assets/convert.py \
    --nice-oled <zmk-nice-oled>/boards/shields/nice_oled \
    --unscii <lvgl>/src/font/lv_font_unscii_8.c \
    --revision <commit of zmk-nice-oled>
```

A pixel is drawn lit when the palette of the image has it dark (zmk-nice-oled draws in
black and the OLED shows that lit), the animations and the still images of the right
screen are turned back to upright, and the output is the same every time. Run it again when
zmk-nice-oled changes a picture or adds one. The revision of zmk-nice-oled the sprites
come from is `011f89e96a583307e8bbce647f563a780a560a54`, the commit that took the 22
still images out (and added the pixel shift). The first batch of pictures is from
`3e620f488afe3641539ea656804e44c1be4928e1`, and the second batch (kinds 26 to 65) from
`e30b8ce670e94eff7dd132043d32ba1c63f179e5`.

## Tests

`npm test` covers the geometry (the rectangles, how much the panel shows, the conversion
of the coordinates of the picture both ways), the catalog (the ids in blocks of eight, the
drawing and the size of each widget, the 42 pictures with their frames and cycle times, the retired kinds, the
clock of the frames, the drawings from live readings (the output, the batteries, the link, the
profile, the layer name, the needle and the graph), what only a new build adds), the layout
(the state of each widget from the settings and from the readings, moving inside the range,
showing and hiding, dropping a widget and a
picture, resetting, what is listed when the firmware lacks a widget, and for the picture
the turn about its center in both directions and in four quarters, the cut that turns with
it, the choice of another picture, the cut as it is read and written, and the position
that centers the piece on the strip), the arithmetic of the picture (`pictureView.ts`: the
turns, the two bytes of a setting, holding a cut inside the picture, the handles of the
frame and what a drag of each one does), the turn of the view that the browser remembers,
and which tabs a keyboard gets.

## Status on a real keyboard

The tab was tried in a browser against the demo keyboard, through the same framing and
message encoding as with a real keyboard: the two screens, dragging each widget with the
pointer, the arrow keys, hiding with Delete, showing from the tray by click and by drag,
the gallery by click and by drag (the two groups, a picture of another size landing on the
strip), the inspector, putting a screen back as built, the zoom levels, and the demo
keyboards without display settings, which have no OLED tab. The picture was also tried with
the pointer: turning it left and right, the frame of the cut (moving it with big jumps of the
pointer, which hold it inside the picture, and typing its four numbers), **Whole picture**,
and the battery of the right half dragged over the picture in reverse. The view of each
screen was turned with its button (the preview standing up, then on its side above the
editor). The gallery was looked at with its 42 pictures, the two groups and the six still
images, with none of the retired ones. **Live values** were tried in a browser that is really shown (a headless
Microsoft Edge, because the page of the editor reports itself as hidden, and the poller asks
nothing then): the values changed over time, the drawings followed them, and the demo
keyboard without live status kept the samples. Undo and Redo were tried with real pointer
events: a widget dragged along a bent path, ten presses of an arrow key and a move after a
pause, one step each. The firmware side compiles in the CI of corne-zmk.

The first version of the tab (moving, showing and hiding the widgets, and the menu with the
seven pictures of zmk-nice-oled) was used on the Corne of the keyboard's owner, who reported
that it worked, without detail about each operation, so none of those has an individual
confirmation (the conversion of the coordinates of the picture, for one, rests on reading
the code of zmk-nice-oled). The next release (the turn, the cut and the reverse of the
picture, the first 19 new pictures and the picture drawn over the widgets by the firmware)
was used there too: the owner reported that it "worked perfectly" and liked the animations
and the still images, again without detail about each operation. **What was added after it
has not been tried on a real keyboard**: the 20 animations of the second batch (kinds 26
to 45), the live values, Undo and Redo, and taking the still images out (the 24 retired
kinds). What the gallery and the preview show of the new
pictures rests on the generator and its tests on a computer, not on the screen. The look of
the sprites rests on the pictures of zmk-nice-oled and on the rule that the OLED shows its
ink lit, and the text widgets are drawn with the fonts of zmk-nice-oled as samples, so they
may differ from the screen by a pixel. Touch input has not been tried on any device.

One position is outside the panel by the design of the build, not by a mistake of the tab:
the text with the battery of both halves (the central battery modes of zmk-nice-oled,
`CONFIG_NICE_OLED_WIDGET_CENTRAL_SHOW_BATTERY_PERIPHERAL_*`) is drawn at x 0, y 19 of the
canvas, and the panel shows the rows from 32 down. The editor draws it dimmed, outside the
lit strip, and says so in the inspector; **Bring it onto the screen** (or a drag) puts it
where the panel shows it. This comes from reading the code of zmk-nice-oled, and it has not
been checked on a real screen.
