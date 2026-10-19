/*
 * Sample data for the stories and for the demo keyboard (src/lights/demo): the
 * physical layout, behaviors and keymap of a Corne running
 * https://github.com/lenerdz/corne-zmk (taken from its config/corne.keymap, seven
 * layers: QWERTY, FN1, RAISE, NAV, SYS, MEDIA and STENO). The behavior names and
 * parameter descriptions follow the sources of ZMK and zmk-rgb-matrix, and the
 * display names of the two steno macros; they were not captured from a real
 * keyboard.
 * The app only uses it for the demo keyboard (in development, or with "?demo" in
 * the address).
 */
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type {
  Keymap,
  PhysicalLayout,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { hid_usage_from_page_and_id } from "../hid-usages";

// A HID usage with the implicit modifiers ZMK keeps in the top byte.
const kp = (page: number, id: number, mods = 0) =>
  hid_usage_from_page_and_id(page, id) | (mods << 24);

export const corneLayout: PhysicalLayout = {
  name: "6 Column",
  keys: [
    { width: 100, height: 100, x: 0, y: 37, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 100, y: 37, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 200, y: 12, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 300, y: 0, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 400, y: 12, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 500, y: 24, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 800, y: 24, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 900, y: 12, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1000, y: 0, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1100, y: 12, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1200, y: 37, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1300, y: 37, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 0, y: 137, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 100, y: 137, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 200, y: 112, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 300, y: 100, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 400, y: 112, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 500, y: 124, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 800, y: 124, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 900, y: 112, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1000, y: 100, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1100, y: 112, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1200, y: 137, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1300, y: 137, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 0, y: 237, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 100, y: 237, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 200, y: 212, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 300, y: 200, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 400, y: 212, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 500, y: 224, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 800, y: 224, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 900, y: 212, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1000, y: 200, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1100, y: 212, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1200, y: 237, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 1300, y: 237, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 350, y: 312, r: 0, rx: 0, ry: 0 },
    { width: 100, height: 100, x: 450, y: 312, r: 1200, rx: 450, ry: 412 },
    { width: 100, height: 150, x: 548, y: 283, r: 2400, rx: 548, ry: 433 },
    { width: 100, height: 150, x: 752, y: 283, r: -2400, rx: 852, ry: 433 },
    { width: 100, height: 100, x: 850, y: 312, r: -1200, rx: 950, ry: 412 },
    { width: 100, height: 100, x: 950, y: 312, r: 0, rx: 0, ry: 0 },
  ],
};

export const corneBehaviors: Record<number, GetBehaviorDetailsResponse> = {
  1: { id: 1, displayName: "Key Press", metadata: [{"param1":[{"name":"Key","hidUsage":{"keyboardMax":231,"consumerMax":1023}}],"param2":[]}] },
  2: { id: 2, displayName: "Momentary Layer", metadata: [{"param1":[{"name":"Layer","layerId":{}}],"param2":[]}] },
  3: { id: 3, displayName: "Transparent", metadata: [] },
  4: { id: 4, displayName: "Studio Unlock", metadata: [] },
  5: { id: 5, displayName: "Bluetooth", metadata: [{"param1":[{"name":"Next Profile","constant":1},{"name":"Previous Profile","constant":2},{"name":"Clear All Profiles","constant":4},{"name":"Clear Selected Profile","constant":0}],"param2":[]},{"param1":[{"name":"Select Profile","constant":3}],"param2":[{"name":"Profile","range":{"min":0,"max":4}}]},{"param1":[{"name":"Disconnect Profile","constant":5}],"param2":[{"name":"Profile","range":{"min":0,"max":4}}]}] },
  6: { id: 6, displayName: "fx_solid", metadata: [] },
  7: { id: 7, displayName: "fx_breathe", metadata: [] },
  8: { id: 8, displayName: "fx_spectrum", metadata: [] },
  9: { id: 9, displayName: "fx_rainbow", metadata: [] },
  10: { id: 10, displayName: "fx_reactive", metadata: [] },
  11: { id: 11, displayName: "fx_ripple", metadata: [] },
  12: { id: 12, displayName: "kprgb", metadata: [{"param1":[{"name":"Toggle On/Off","constant":0},{"name":"Turn On","constant":1},{"name":"Turn Off","constant":2},{"name":"Hue Up","constant":3},{"name":"Hue Down","constant":4},{"name":"Saturation Up","constant":5},{"name":"Saturation Down","constant":6},{"name":"Brightness Up","constant":7},{"name":"Brightness Down","constant":8},{"name":"Duration Up","constant":9},{"name":"Duration Down","constant":10},{"name":"Next Effect","constant":11},{"name":"Previous Effect","constant":12},{"name":"Reset Settings","constant":258}],"param2":[]}] },
  13: { id: 13, displayName: "fx_heatmap", metadata: [] },
  14: { id: 14, displayName: "fx_starlight", metadata: [] },
  15: { id: 15, displayName: "Caps Word", metadata: [] },
  16: { id: 16, displayName: "fx_static", metadata: [] },
  17: { id: 17, displayName: "To Layer", metadata: [{"param1":[{"name":"Layer","layerId":{}}],"param2":[]}] },
  18: { id: 18, displayName: "None", metadata: [] },
  19: { id: 19, displayName: "Steno On", metadata: [] },
  20: { id: 20, displayName: "Steno Off", metadata: [] },
};

export const corneKeymap: Keymap = {
  availableLayers: 0,
  maxLayerNameLength: 20,
  layers: [
    {
      id: 0,
      name: "QWERTY",
      bindings: [
      { behaviorId: 1, param1: kp(7, 43), param2: 0 }, // &kp TAB
      { behaviorId: 1, param1: kp(7, 20), param2: 0 }, // &kp Q
      { behaviorId: 1, param1: kp(7, 26), param2: 0 }, // &kp W
      { behaviorId: 1, param1: kp(7, 8), param2: 0 }, // &kp E
      { behaviorId: 1, param1: kp(7, 21), param2: 0 }, // &kp R
      { behaviorId: 1, param1: kp(7, 23), param2: 0 }, // &kp T
      { behaviorId: 1, param1: kp(7, 28), param2: 0 }, // &kp Y
      { behaviorId: 1, param1: kp(7, 24), param2: 0 }, // &kp U
      { behaviorId: 1, param1: kp(7, 12), param2: 0 }, // &kp I
      { behaviorId: 1, param1: kp(7, 18), param2: 0 }, // &kp O
      { behaviorId: 1, param1: kp(7, 19), param2: 0 }, // &kp P
      { behaviorId: 1, param1: kp(7, 42), param2: 0 }, // &kp BSPC
      { behaviorId: 1, param1: kp(7, 225), param2: 0 }, // &kp LSHFT
      { behaviorId: 1, param1: kp(7, 4), param2: 0 }, // &kp A
      { behaviorId: 1, param1: kp(7, 22), param2: 0 }, // &kp S
      { behaviorId: 1, param1: kp(7, 7), param2: 0 }, // &kp D
      { behaviorId: 1, param1: kp(7, 9), param2: 0 }, // &kp F
      { behaviorId: 1, param1: kp(7, 10), param2: 0 }, // &kp G
      { behaviorId: 1, param1: kp(7, 11), param2: 0 }, // &kp H
      { behaviorId: 1, param1: kp(7, 13), param2: 0 }, // &kp J
      { behaviorId: 1, param1: kp(7, 14), param2: 0 }, // &kp K
      { behaviorId: 1, param1: kp(7, 15), param2: 0 }, // &kp L
      { behaviorId: 1, param1: kp(7, 51), param2: 0 }, // &kp SEMI
      { behaviorId: 1, param1: kp(7, 52), param2: 0 }, // &kp SQT
      { behaviorId: 1, param1: kp(7, 224), param2: 0 }, // &kp LCTRL
      { behaviorId: 1, param1: kp(7, 29), param2: 0 }, // &kp Z
      { behaviorId: 1, param1: kp(7, 27), param2: 0 }, // &kp X
      { behaviorId: 1, param1: kp(7, 6), param2: 0 }, // &kp C
      { behaviorId: 1, param1: kp(7, 25), param2: 0 }, // &kp V
      { behaviorId: 1, param1: kp(7, 5), param2: 0 }, // &kp B
      { behaviorId: 1, param1: kp(7, 17), param2: 0 }, // &kp N
      { behaviorId: 1, param1: kp(7, 16), param2: 0 }, // &kp M
      { behaviorId: 1, param1: kp(7, 54), param2: 0 }, // &kp COMMA
      { behaviorId: 1, param1: kp(7, 55), param2: 0 }, // &kp DOT
      { behaviorId: 1, param1: kp(7, 47), param2: 0 }, // &kp LBKT
      { behaviorId: 1, param1: kp(7, 48), param2: 0 }, // &kp RBKT
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 2, param1: 1, param2: 0 }, // &mo 1
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 2, param1: 2, param2: 0 }, // &mo 2
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 1,
      name: "FN1",
      bindings: [
      { behaviorId: 1, param1: kp(7, 53), param2: 0 }, // &kp GRAVE
      { behaviorId: 1, param1: kp(7, 58), param2: 0 }, // &kp F1
      { behaviorId: 1, param1: kp(7, 59), param2: 0 }, // &kp F2
      { behaviorId: 1, param1: kp(7, 60), param2: 0 }, // &kp F3
      { behaviorId: 1, param1: kp(7, 61), param2: 0 }, // &kp F4
      { behaviorId: 1, param1: kp(7, 62), param2: 0 }, // &kp F5
      { behaviorId: 1, param1: kp(7, 63), param2: 0 }, // &kp F6
      { behaviorId: 1, param1: kp(7, 64), param2: 0 }, // &kp F7
      { behaviorId: 1, param1: kp(7, 65), param2: 0 }, // &kp F8
      { behaviorId: 1, param1: kp(7, 66), param2: 0 }, // &kp F9
      { behaviorId: 1, param1: kp(7, 67), param2: 0 }, // &kp F10
      { behaviorId: 1, param1: kp(7, 68), param2: 0 }, // &kp F11
      { behaviorId: 1, param1: kp(7, 30), param2: 0 }, // &kp N1
      { behaviorId: 1, param1: kp(7, 31), param2: 0 }, // &kp N2
      { behaviorId: 1, param1: kp(7, 32), param2: 0 }, // &kp N3
      { behaviorId: 1, param1: kp(7, 33), param2: 0 }, // &kp N4
      { behaviorId: 1, param1: kp(7, 34), param2: 0 }, // &kp N5
      { behaviorId: 1, param1: kp(7, 35), param2: 0 }, // &kp N6
      { behaviorId: 1, param1: kp(7, 36), param2: 0 }, // &kp N7
      { behaviorId: 1, param1: kp(7, 37), param2: 0 }, // &kp N8
      { behaviorId: 1, param1: kp(7, 38), param2: 0 }, // &kp N9
      { behaviorId: 1, param1: kp(7, 39), param2: 0 }, // &kp N0
      { behaviorId: 1, param1: kp(7, 45), param2: 0 }, // &kp MINUS
      { behaviorId: 1, param1: kp(7, 46), param2: 0 }, // &kp EQUAL
      { behaviorId: 2, param1: 3, param2: 0 }, // &mo 3
      { behaviorId: 2, param1: 4, param2: 0 }, // &mo 4
      { behaviorId: 2, param1: 5, param2: 0 }, // &mo 5
      { behaviorId: 1, param1: kp(7, 69), param2: 0 }, // &kp F12
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 2,
      name: "RAISE",
      bindings: [
      { behaviorId: 1, param1: kp(7, 41), param2: 0 }, // &kp ESC
      { behaviorId: 1, param1: kp(7, 30, 0x02), param2: 0 }, // &kp EXCL
      { behaviorId: 1, param1: kp(7, 31, 0x02), param2: 0 }, // &kp AT
      { behaviorId: 1, param1: kp(7, 32, 0x02), param2: 0 }, // &kp HASH
      { behaviorId: 1, param1: kp(7, 33, 0x02), param2: 0 }, // &kp DLLR
      { behaviorId: 1, param1: kp(7, 34, 0x02), param2: 0 }, // &kp PRCNT
      { behaviorId: 1, param1: kp(7, 35, 0x02), param2: 0 }, // &kp CARET
      { behaviorId: 1, param1: kp(7, 36, 0x02), param2: 0 }, // &kp AMPS
      { behaviorId: 1, param1: kp(7, 37, 0x02), param2: 0 }, // &kp ASTRK
      { behaviorId: 1, param1: kp(7, 38, 0x02), param2: 0 }, // &kp LPAR
      { behaviorId: 1, param1: kp(7, 39, 0x02), param2: 0 }, // &kp RPAR
      { behaviorId: 1, param1: kp(7, 42), param2: 0 }, // &kp BSPC
      { behaviorId: 1, param1: kp(7, 224), param2: 0 }, // &kp LCTRL
      { behaviorId: 4, param1: 0, param2: 0 }, // &studio_unlock
      { behaviorId: 1, param1: kp(7, 56), param2: 0 }, // &kp FSLH
      { behaviorId: 1, param1: kp(7, 49), param2: 0 }, // &kp BSLH
      { behaviorId: 1, param1: kp(7, 53), param2: 0 }, // &kp GRAVE
      { behaviorId: 1, param1: kp(7, 53, 0x02), param2: 0 }, // &kp TILDE
      { behaviorId: 1, param1: kp(7, 45), param2: 0 }, // &kp MINUS
      { behaviorId: 1, param1: kp(7, 46), param2: 0 }, // &kp EQUAL
      { behaviorId: 1, param1: kp(7, 47), param2: 0 }, // &kp LBKT
      { behaviorId: 1, param1: kp(7, 48), param2: 0 }, // &kp RBKT
      { behaviorId: 1, param1: kp(7, 47, 0x02), param2: 0 }, // &kp LBRC
      { behaviorId: 1, param1: kp(7, 48, 0x02), param2: 0 }, // &kp RBRC
      { behaviorId: 1, param1: kp(7, 225), param2: 0 }, // &kp LSHFT
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 45, 0x02), param2: 0 }, // &kp UNDER
      { behaviorId: 1, param1: kp(7, 46, 0x02), param2: 0 }, // &kp PLUS
      { behaviorId: 1, param1: kp(7, 49, 0x02), param2: 0 }, // &kp PIPE
      { behaviorId: 1, param1: kp(7, 51, 0x02), param2: 0 }, // &kp COLON
      { behaviorId: 1, param1: kp(7, 52, 0x02), param2: 0 }, // &kp DQT
      { behaviorId: 1, param1: kp(7, 56, 0x02), param2: 0 }, // &kp QMARK
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 3,
      name: "NAV",
      bindings: [
      { behaviorId: 1, param1: kp(7, 41), param2: 0 }, // &kp ESC
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 42), param2: 0 }, // &kp BSPC
      { behaviorId: 1, param1: kp(7, 224), param2: 0 }, // &kp LCTRL
      { behaviorId: 1, param1: kp(7, 74), param2: 0 }, // &kp HOME
      { behaviorId: 1, param1: kp(7, 78), param2: 0 }, // &kp PG_DN
      { behaviorId: 1, param1: kp(7, 75), param2: 0 }, // &kp PG_UP
      { behaviorId: 1, param1: kp(7, 77), param2: 0 }, // &kp END
      { behaviorId: 1, param1: kp(7, 73), param2: 0 }, // &kp INS
      { behaviorId: 1, param1: kp(7, 80), param2: 0 }, // &kp LEFT
      { behaviorId: 1, param1: kp(7, 81), param2: 0 }, // &kp DOWN
      { behaviorId: 1, param1: kp(7, 82), param2: 0 }, // &kp UP
      { behaviorId: 1, param1: kp(7, 79), param2: 0 }, // &kp RIGHT
      { behaviorId: 1, param1: kp(7, 43), param2: 0 }, // &kp TAB
      { behaviorId: 1, param1: kp(7, 76), param2: 0 }, // &kp DEL
      { behaviorId: 1, param1: kp(7, 225), param2: 0 }, // &kp LSHFT
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 74), param2: 0 }, // &kp HOME
      { behaviorId: 1, param1: kp(7, 78), param2: 0 }, // &kp PG_DN
      { behaviorId: 1, param1: kp(7, 75), param2: 0 }, // &kp PG_UP
      { behaviorId: 1, param1: kp(7, 77), param2: 0 }, // &kp END
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 4,
      name: "SYS",
      bindings: [
      { behaviorId: 5, param1: 0, param2: 0 }, // &bt BT_CLR
      { behaviorId: 5, param1: 3, param2: 0 }, // &bt BT_SEL 0
      { behaviorId: 5, param1: 3, param2: 1 }, // &bt BT_SEL 1
      { behaviorId: 5, param1: 3, param2: 2 }, // &bt BT_SEL 2
      { behaviorId: 5, param1: 3, param2: 3 }, // &bt BT_SEL 3
      { behaviorId: 5, param1: 3, param2: 4 }, // &bt BT_SEL 4
      { behaviorId: 6, param1: 0, param2: 0 }, // &fx_solid
      { behaviorId: 7, param1: 0, param2: 0 }, // &fx_breathe
      { behaviorId: 8, param1: 0, param2: 0 }, // &fx_spectrum
      { behaviorId: 9, param1: 0, param2: 0 }, // &fx_rainbow
      { behaviorId: 10, param1: 0, param2: 0 }, // &fx_reactive
      { behaviorId: 11, param1: 0, param2: 0 }, // &fx_ripple
      { behaviorId: 12, param1: 0, param2: 0 }, // &kprgb RGB_TOG
      { behaviorId: 12, param1: 11, param2: 0 }, // &kprgb RGB_EFF
      { behaviorId: 12, param1: 3, param2: 0 }, // &kprgb RGB_HUI
      { behaviorId: 12, param1: 4, param2: 0 }, // &kprgb RGB_HUD
      { behaviorId: 12, param1: 7, param2: 0 }, // &kprgb RGB_BRI
      { behaviorId: 12, param1: 8, param2: 0 }, // &kprgb RGB_BRD
      { behaviorId: 12, param1: 12, param2: 0 }, // &kprgb RGB_EFR
      { behaviorId: 12, param1: 5, param2: 0 }, // &kprgb RGB_SAI
      { behaviorId: 12, param1: 6, param2: 0 }, // &kprgb RGB_SAD
      { behaviorId: 12, param1: 9, param2: 0 }, // &kprgb RGB_SPI
      { behaviorId: 12, param1: 10, param2: 0 }, // &kprgb RGB_SPD
      { behaviorId: 12, param1: 258, param2: 0 }, // &kprgb RGB_RESET
      { behaviorId: 4, param1: 0, param2: 0 }, // &studio_unlock
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 13, param1: 0, param2: 0 }, // &fx_heatmap
      { behaviorId: 14, param1: 0, param2: 0 }, // &fx_starlight
      { behaviorId: 16, param1: 0, param2: 0 }, // &fx_static
      { behaviorId: 19, param1: 0, param2: 0 }, // &steno_on
      { behaviorId: 17, param1: 6, param2: 0 }, // &to 6
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 5,
      name: "MEDIA",
      bindings: [
      { behaviorId: 1, param1: kp(12, 48), param2: 0 }, // &kp C_PWR
      { behaviorId: 1, param1: kp(12, 50), param2: 0 }, // &kp C_SLEEP
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 15, param1: 0, param2: 0 }, // &caps_word
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 70), param2: 0 }, // &kp PSCRN
      { behaviorId: 1, param1: kp(7, 71), param2: 0 }, // &kp SLCK
      { behaviorId: 1, param1: kp(12, 226), param2: 0 }, // &kp C_MUTE
      { behaviorId: 1, param1: kp(12, 234), param2: 0 }, // &kp C_VOL_DN
      { behaviorId: 1, param1: kp(12, 233), param2: 0 }, // &kp C_VOL_UP
      { behaviorId: 1, param1: kp(12, 112), param2: 0 }, // &kp C_BRI_DN
      { behaviorId: 1, param1: kp(12, 111), param2: 0 }, // &kp C_BRI_UP
      { behaviorId: 1, param1: kp(7, 57), param2: 0 }, // &kp CAPS
      { behaviorId: 1, param1: kp(12, 182), param2: 0 }, // &kp C_PREV
      { behaviorId: 1, param1: kp(12, 205), param2: 0 }, // &kp C_PP
      { behaviorId: 1, param1: kp(12, 181), param2: 0 }, // &kp C_NEXT
      { behaviorId: 1, param1: kp(12, 183), param2: 0 }, // &kp C_STOP
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 227), param2: 0 }, // &kp LGUI
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 44), param2: 0 }, // &kp SPACE
      { behaviorId: 1, param1: kp(7, 40), param2: 0 }, // &kp RET
      { behaviorId: 3, param1: 0, param2: 0 }, // &trans
      { behaviorId: 1, param1: kp(7, 230), param2: 0 }, // &kp RALT
      ],
    },
    {
      id: 6,
      name: "STENO",
      bindings: [
      { behaviorId: 20, param1: 0, param2: 0 }, // &steno_off
      { behaviorId: 1, param1: kp(7, 20), param2: 0 }, // &kp Q
      { behaviorId: 1, param1: kp(7, 26), param2: 0 }, // &kp W
      { behaviorId: 1, param1: kp(7, 8), param2: 0 }, // &kp E
      { behaviorId: 1, param1: kp(7, 21), param2: 0 }, // &kp R
      { behaviorId: 1, param1: kp(7, 23), param2: 0 }, // &kp T
      { behaviorId: 1, param1: kp(7, 28), param2: 0 }, // &kp Y
      { behaviorId: 1, param1: kp(7, 24), param2: 0 }, // &kp U
      { behaviorId: 1, param1: kp(7, 12), param2: 0 }, // &kp I
      { behaviorId: 1, param1: kp(7, 18), param2: 0 }, // &kp O
      { behaviorId: 1, param1: kp(7, 19), param2: 0 }, // &kp P
      { behaviorId: 1, param1: kp(7, 47), param2: 0 }, // &kp LBKT
      { behaviorId: 17, param1: 0, param2: 0 }, // &to 0
      { behaviorId: 1, param1: kp(7, 4), param2: 0 }, // &kp A
      { behaviorId: 1, param1: kp(7, 22), param2: 0 }, // &kp S
      { behaviorId: 1, param1: kp(7, 7), param2: 0 }, // &kp D
      { behaviorId: 1, param1: kp(7, 9), param2: 0 }, // &kp F
      { behaviorId: 1, param1: kp(7, 10), param2: 0 }, // &kp G
      { behaviorId: 1, param1: kp(7, 11), param2: 0 }, // &kp H
      { behaviorId: 1, param1: kp(7, 13), param2: 0 }, // &kp J
      { behaviorId: 1, param1: kp(7, 14), param2: 0 }, // &kp K
      { behaviorId: 1, param1: kp(7, 15), param2: 0 }, // &kp L
      { behaviorId: 1, param1: kp(7, 51), param2: 0 }, // &kp SEMI
      { behaviorId: 1, param1: kp(7, 52), param2: 0 }, // &kp SQT
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 18, param1: 0, param2: 0 }, // &none
      { behaviorId: 1, param1: kp(7, 30), param2: 0 }, // &kp N1
      { behaviorId: 1, param1: kp(7, 6), param2: 0 }, // &kp C
      { behaviorId: 1, param1: kp(7, 25), param2: 0 }, // &kp V
      { behaviorId: 1, param1: kp(7, 17), param2: 0 }, // &kp N
      { behaviorId: 1, param1: kp(7, 16), param2: 0 }, // &kp M
      { behaviorId: 1, param1: kp(7, 39), param2: 0 }, // &kp N0
      ],
    },
  ],
};
