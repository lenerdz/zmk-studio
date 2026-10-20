# ZMK Studio RPC client (vendored)

The TypeScript client the app uses to talk to the keyboard. It is a copy of
[`@zmkfirmware/zmk-studio-ts-client`](https://github.com/zmkfirmware/zmk-studio-ts-client)
0.0.18 (MIT license, see [`LICENSE`](LICENSE)), kept in this repository instead of being
installed from npm.

## Why it is here

The Lights tab needs six more requests in the keymap subsystem (read and set the color
maps, save, discard, restore the defaults) and one more notification. The fork also adds
three requests for the display (OLED) settings of the firmware (list them, change one,
restore the defaults). They are defined
in [lenerdz/zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), a fork
of the protocol definitions, and the published package only has the upstream messages.
Because the fork is not published to npm, the generated code is committed here, and the
app finds it under the same package name through an alias (`vite.config.ts` and the
`paths` of `tsconfig.json`), so the imports of the app did not change.

## What is in this folder

| Files | What they are |
|---|---|
| `behaviors.ts`, `core.ts`, `keymap.ts`, `meta.ts`, `studio.ts` | Generated from the `.proto` files of the messages fork. **Do not edit by hand.** |
| `index.ts`, `framing.ts`, `transport/` | The code of the package (`lib/index.js`, `lib/framing.js`, `lib/transport/*.js`), written in TypeScript with the same behavior |
| `framing.test.ts` | Tests of the framing (run by `npm test`) |
| `LICENSE` | The license of the package |

The only difference in behavior from the published package is that the generated
messages include the requests of the fork (tags 100 to 108 of the keymap `Request`, and
tag 100 of the keymap `Notification`). A firmware that does not know them answers
"RPC not found", which the app uses to detect firmware without the light maps.

The firmware is built with the same protocol files: the messages fork is pinned in
`config/west.yml` of [lenerdz/corne-zmk](https://github.com/lenerdz/corne-zmk). **The
revision used here and the one the firmware is built with must be the same**; if one
changes, regenerate this code (or update the pin) in the same step.

Messages fork revision used here: `caee958c434f40143eda7195c1ca0939bf905e8b`.

## Generating the messages again

You need [`protoc`](https://github.com/protocolbuffers/protobuf/releases) (generated with
28.3) and `ts-proto` 1.181.2 (`npm install ts-proto@1.181.2`). From the
`proto/zmk` folder of the messages fork, at the revision above:

```
protoc \
  --plugin=protoc-gen-ts_proto=<path to node_modules/.bin/protoc-gen-ts_proto> \
  --ts_proto_out=<output folder> \
  --ts_proto_opt=env=browser \
  -I . behaviors.proto core.proto keymap.proto meta.proto studio.proto
```

Copy the five `.ts` files over the ones here. The output of this command, run at the
revision above, is identical to the committed files.

The generated code needs `protobufjs` (a dependency of the app). `index.ts` needs
`async-mutex`.

## Updating the ported code

`index.ts`, `framing.ts` and `transport/` follow version 0.0.18 of the package. If a new
version of the package changes them, port the change (and check the license notice).
