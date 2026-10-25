# Files tab

Everything the app edits, in one file: the keys, the colors of the lights and the settings
of the screens (the Display and the OLED tabs). The tab saves them into a JSON file, to keep
it or to put it on another keyboard, and applies such a file to the keyboard. A file is
shown as a plan first (what differs, what cannot be applied and why) and nothing is written
until you say so.

It needs no firmware support of its own: it uses the same requests as the other tabs. It is
offered for any keyboard that is connected and unlocked, and each part of a file is
available only when the keyboard has what it edits: the keys always (once they are read),
the colors with the light maps of the Lights tab, the screens with the display settings of
the Display and OLED tabs.

## What it does

The header has a view **Files**, between **OLED** and **Diagnostics**. It has two cards:

- **Save to a file.** Three switches choose what goes into the file: **Keys**, **Lights**
  and **Screens**, each one with what it holds (the layers and the keys, the color maps,
  the settings). **Save to a file** downloads it with what the keyboard has now, **changes
  that are not saved in the keyboard yet included**. The name is made of the name of the
  keyboard in lowercase, `-backup-`, and the day and the hour (UTC), like
  `corne-backup-2026-10-25-1530.json`.
- **Apply a file.** **Open a file** reads a file made by this tab (up to 2 MiB) and shows,
  for each part it has, what applying it would change: a switch to apply that part or not,
  a summary ("12 keys change in 3 layers.", "Same as the keyboard.", "Nothing to apply."),
  up to twelve lines saying where (a line per layer, or per setting with the value it has
  and the one it gets) followed by "and N more", and, in amber, what cannot be applied and
  why. If the keyboard of the
  file has another name than this one, the tab warns that the file can fail or look wrong.
  **Apply the checked parts** writes the parts that are checked and have something to
  change, in this order: keys, lights, screens. A part that fails stops the ones after it,
  and the message says which one.

What is applied behaves like a change made by hand in the tab it belongs to:

| Part | How it is applied | Save | Undo |
|---|---|---|---|
| Keys | Through the Undo of the app, as one step for all the keys and names of the file. The Keys tab reads the keymap again | Needs **Save**, like any change of the Keys tab. The tab offers **Save the keys and the colors in the keyboard** after applying | **Undo** in the header (Ctrl+Z) |
| Lights | With the same paint of the Lights tab: one step for each layer | Needs **Save** | **Undo** in the header (Ctrl+Z) |
| Screens | As one step of the history of the Display and OLED tabs | Nothing to save: the keyboard keeps them by itself | **Undo** while the Display or the OLED tab is open (see [Undo and Redo](../display/README.md#undo-and-redo)) |

## What a file is compared with

- **Keys.** The layers are matched by their place in the keymap (the first of the file with
  the first of the keyboard), and a key is its behavior (by its display name, like
  "Key Press", because the numbers of the behaviors change between firmwares) with its two
  parameters. A file with more layers than the keyboard leaves the last ones out (add layers
  in the Keys tab to bring them); one with fewer leaves the last layers of the keyboard as
  they are. A layer with another number of keys is left as it is, and so is a key whose
  behavior the keyboard does not have; each case is reported. The names of the layers are
  applied too, cut to the length the keyboard takes.
- **Lights.** The maps are matched by the id of the layer. A file with another number of
  colors per map than the keyboard uses was made for another LED layout, and no color is
  applied. A layer the keyboard has no map for is left out.
- **Screens.** The settings are matched by their id. A setting the keyboard does not have is
  left out, and a value outside the range the keyboard gave is held at the nearest end (the
  plan says so). The file has every setting: the ones of the Display tab (the ids 1 to 15:
  the screens, the key lights, the underglow, the pixel shift and the dimming) and the ones
  of the OLED layout (where each widget is, which picture the right screen plays, how it is
  turned and cut). A picture of the file that was taken out of the firmware (one
  of the still images that were retired, such as the Vim logo of an older file) is left out,
  and the plan says that the keyboard keeps the one it has.

## The file

A JSON text with two spaces of indentation, a key or a list of colors on one line each so a
person can read it, compare two of them and keep them in a repository (a keymap of 8 layers
of 42 keys is about 330 lines):

```
{
  "format": "zmk-studio-backup",
  "version": 1,
  "app": "lenerdz/zmk-studio",
  "createdAt": "2026-10-25T06:05:33.455Z",
  "keyboard": "Corne (demo)",
  "keys": {
    "layers": [
      {
        "name": "QWERTY",
        "bindings": [
          { "behavior": "Key Press", "param1": 458795, "param2": 0 },
          ...
        ]
      },
      ...
    ]
  },
  "lights": {
    "slotCount": 54,
    "layers": [
      { "id": 0, "name": "QWERTY", "colors": ["#8000ff", "#ffffff", ...] },
      ...
    ]
  },
  "screens": {
    "settings": [
      { "id": 1, "label": "Left screen contrast", "value": 128 },
      ...
    ]
  }
}
```

(The example is cut: `...` stands for more entries, and a real file is valid JSON.)

- `keys`, `lights` and `screens` are each optional: the file has only the parts that were
  chosen, and at least one.
- `version` is 1. A file with a higher number comes from a newer app and is refused.
- `name` and `label` are there to be read by a person; the app matches by place (keys), by
  `id` (lights) and by `id` (screens). The `label` of a setting of the Display tab is its
  full name (for instance `Underglow off: time without activity`), because several of the
  short names repeat from one group to the next.
- Colors are `#rrggbb`, exactly `slotCount` per map (the app keeps them in lowercase).
- Limits, so that a wrong file cannot hang the tab: from 1 to 64 layers, from 1 to 512 keys
  per layer, from 1 to 256 colors per map, from 1 to 1024 settings and 2 MiB. The parameters,
  the ids and the values must be whole numbers in the range the protocol has.
- A file that is not valid JSON, was not made by this tab, has no valid version, has a part
  that is wrong (the message says which one and where) or has nothing in it is refused as a
  whole: a damaged file is never applied halfway.

## Files

| File | What it is |
|---|---|
| `FilesTab.tsx` | The tab: the two cards, the plan of an opened file, the buttons and the messages |
| `backupFile.ts` | The format: building, writing (`serializeBackup`), the name of the file and the checks of a file that is read (`parseBackup`) |
| `backupPlan.ts` | Between the keyboard and the file, without talking to the keyboard: what goes into a file (`collectKeys`, `collectLights`, `collectScreens`) and, for a file that was opened, what applying it would change (`planKeys`, `planLights`, `planScreens`) and what cannot be applied |
| `backupText.ts` | The words of the plan: the summaries and the lines of differences |
| `applyKeys.ts` | Writes the keys and layer names of a plan, or puts them back: if the keyboard refuses one write, the ones before it are put back and the error ends with "Nothing was changed." |
| `applyBackup.ts` | Applies the checked parts in order, each one through what the app already uses to change it, so that Undo works |
| `files.ts` | Downloading a text file and reading the file that was picked (the 2 MiB limit) |
| `*.test.ts` | The tests |

`src/App.tsx` and `src/lights/appViews.ts` connect the tab to the rest of the app, and
`src/keyboard/Keyboard.tsx` makes the Keys tab read the keymap again when keys were applied
(the `keys.reload` event of `src/usePubSub.ts`).

## Tests

`npm test` covers the format (what is written and read back, the name of the file, each way
a file can be wrong, the limits), the plans (the layers of the file against the keyboard:
more, fewer, with another number of keys, with a behavior the keyboard does not have, the
names cut to the length it takes; the colors for another LED layout and for a layer without
map; the screens with a setting the keyboard lacks and a value out of range), the words of
the plans, the writes of the keys (all of them, put back when one is refused, undone in
reverse order) and the application of a file against the demo keyboard (the order of the
parts, a part that fails, what is counted).

## Status on a real keyboard

The tab was tried against the demo keyboard in a browser that is really shown (a headless
Microsoft Edge, with the files fed to the file input and the download caught): saving a
file of 33,466 bytes, opening it again ("Same as the keyboard." for the three parts),
opening an edited one (the plan, the clamped value that said so, the part switches), applying
it, the **Save the keys and the colors in the keyboard** button, the Keys tab showing the new
keys, and Undo with Ctrl+Z in this tab (the colors, then the keys) and in the Display tab
(the screens). The firmware side has nothing of its own. **It has not been tried on a real
keyboard**: whether the keys and the colors written by a file are accepted and saved by the
firmware as they are by hand, with a keymap of the size of a real one, is unconfirmed. The
saved file was only downloaded by that Edge; other browsers have not been tried.
