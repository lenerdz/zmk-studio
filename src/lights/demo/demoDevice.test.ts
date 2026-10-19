/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The logic of the demo keyboard on its own (no streams): the answers and the
 * notifications for each request.
 */
import { describe, expect, it } from "vitest";
import type { Request } from "@zmkfirmware/zmk-studio-ts-client";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import { SetLedColorsResponse } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { corneKeymap } from "../../keyboard/corne.mock";
import { DEMO_DEFAULT_COLORS } from "./demoColors";
import { DemoDevice } from "./demoDevice";

let nextId = 1;
const keymap = (request: NonNullable<Request["keymap"]>): Request => ({
  requestId: nextId++,
  keymap: request,
});

describe("DemoDevice", () => {
  it("answers with the id of the request", () => {
    const device = new DemoDevice();
    const request = keymap({ getLedInfo: true });

    expect(device.handle(request).response.requestId).toBe(request.requestId);
  });

  it("has a color map for each layer of the keymap", () => {
    const device = new DemoDevice();

    const { response } = device.handle(keymap({ getLedInfo: true }));

    expect(response.keymap?.getLedInfo?.layerIds).toEqual(
      corneKeymap.layers.map((layer) => layer.id),
    );
  });

  it("reports the unsaved light state once for each change", () => {
    const device = new DemoDevice();
    const paint = (rgb: number) =>
      device.handle(
        keymap({ setLedColors: { layerId: 0, entries: [{ slot: 1, rgb }] } }),
      );

    expect(paint(0xff0000).notifications).toEqual([
      { keymap: { unsavedLedChangesStatusChanged: true } },
    ]);
    // still unsaved: nothing new to tell
    expect(paint(0x00ff00).notifications).toEqual([]);

    expect(device.handle(keymap({ saveLedChanges: true })).notifications).toEqual(
      [{ keymap: { unsavedLedChangesStatusChanged: false } }],
    );
  });

  it("is not unsaved when the colors go back to what is saved", () => {
    const device = new DemoDevice();
    const original = DEMO_DEFAULT_COLORS[0][1];
    const paint = (rgb: number) =>
      device.handle(
        keymap({ setLedColors: { layerId: 0, entries: [{ slot: 1, rgb }] } }),
      );

    paint(0xff0000);
    expect(paint(original).notifications).toEqual([
      { keymap: { unsavedLedChangesStatusChanged: false } },
    ]);
  });

  it("refuses more entries than the firmware can decode", () => {
    const device = new DemoDevice();
    const entries = Array.from({ length: 17 }, (_, slot) => ({ slot, rgb: 1 }));

    const { response } = device.handle(
      keymap({ setLedColors: { layerId: 0, entries } }),
    );

    expect(response.meta?.simpleError).toBe(ErrorConditions.MSG_DECODE_FAILED);
  });

  it("answers the layer and slot errors of the firmware", () => {
    const device = new DemoDevice();

    const layer = device.handle(
      keymap({ setLedColors: { layerId: 9, entries: [{ slot: 0, rgb: 1 }] } }),
    );
    expect(layer.response.keymap?.setLedColors).toBe(
      SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_LAYER,
    );

    const slot = device.handle(
      keymap({ setLedColors: { layerId: 0, entries: [{ slot: 54, rgb: 1 }] } }),
    );
    expect(slot.response.keymap?.setLedColors).toBe(
      SetLedColorsResponse.SET_LED_COLORS_RESP_INVALID_SLOT,
    );
  });

  it("does not change anything for a request that is refused", () => {
    const device = new DemoDevice();

    device.handle(
      keymap({
        setLedColors: {
          layerId: 0,
          entries: [
            { slot: 1, rgb: 0xff0000 },
            { slot: 99, rgb: 0xff0000 },
          ],
        },
      }),
    );

    const map = device.handle(keymap({ getLedMap: 0 })).response.keymap?.getLedMap;
    expect(map?.colors[1]).toBe(DEMO_DEFAULT_COLORS[0][1]);
  });

  it("answers 'RPC not found' to the light requests when it has none", () => {
    const device = new DemoDevice({ lights: false });

    for (const request of [
      keymap({ getLedInfo: true }),
      keymap({ getLedMap: 0 }),
      keymap({ saveLedChanges: true }),
      keymap({ discardLedChanges: true }),
      keymap({ restoreLedDefaults: 0 }),
    ]) {
      expect(device.handle(request).response.meta?.simpleError).toBe(
        ErrorConditions.RPC_NOT_FOUND,
      );
    }
  });

  it("still serves the keymap when it has no light maps", () => {
    const device = new DemoDevice({ lights: false });

    const { response } = device.handle(keymap({ getKeymap: true }));

    expect(response.keymap?.getKeymap?.layers).toHaveLength(
      corneKeymap.layers.length,
    );
  });

  it("goes back to the stock keymap and colors on a settings reset", () => {
    const device = new DemoDevice();

    device.handle(
      keymap({
        setLedColors: { layerId: 0, entries: [{ slot: 1, rgb: 0xff0000 }] },
      }),
    );
    device.handle(keymap({ saveLedChanges: true }));
    device.handle(keymap({ setLayerProps: { layerId: 0, name: "Other" } }));
    device.handle(keymap({ saveChanges: true }));

    device.handle({ requestId: nextId++, core: { resetSettings: true } });

    const map = device.handle(keymap({ getLedMap: 0 })).response.keymap?.getLedMap;
    expect(map?.colors[1]).toBe(DEMO_DEFAULT_COLORS[0][1]);

    const layers = device.handle(keymap({ getKeymap: true })).response.keymap
      ?.getKeymap?.layers;
    expect(layers?.[0].name).toBe("QWERTY");
  });

  it("reports the unsaved keymap state with its own notification", () => {
    const device = new DemoDevice();

    const { notifications } = device.handle(
      keymap({ setLayerProps: { layerId: 0, name: "Other" } }),
    );

    expect(notifications).toEqual([
      { keymap: { unsavedChangesStatusChanged: true } },
    ]);
  });
});
