/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The requests of the light maps against the demo keyboard, through the same
 * framing and message encoding the app uses with a real keyboard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_DEFAULT_COLORS } from "./demo/demoColors";
import { LED_PROTOCOL_SLOTS } from "./ledColors";
import {
  discardLedChanges,
  fetchLedInfo,
  fetchLedMap,
  LedRpcError,
  restoreLedDefaults,
  saveLedChanges,
  sendLedColors,
} from "./ledProtocol";
import { connectDemo } from "./testUtils";

beforeEach(() => {
  // The app logs every request and answer.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchLedInfo", () => {
  it("tells the slots, the layers and whether there are unsaved changes", async () => {
    const { conn } = connectDemo();

    expect(await fetchLedInfo(conn)).toEqual({
      slotCount: 54,
      layerIds: [0, 1, 2, 3, 4, 5],
      unsavedChanges: false,
    });
  });

  it("gives null for a keyboard without the light maps", async () => {
    const { conn } = connectDemo({ lights: false });

    expect(await fetchLedInfo(conn)).toBeNull();
  });
});

describe("fetchLedMap", () => {
  it("gives the colors of each layer: the defaults at first", async () => {
    const { conn } = connectDemo();

    for (const id of [0, 1, 2, 3, 4, 5]) {
      const colors = await fetchLedMap(conn, id);
      expect(colors).toHaveLength(LED_PROTOCOL_SLOTS);
      expect(colors).toEqual([...DEMO_DEFAULT_COLORS[id]]);
    }
  });

  it("fails for a layer that has no map", async () => {
    const { conn } = connectDemo();

    // The firmware answers with the GENERIC condition, which is the value 0:
    // the client (like the original one) does not count it as an error, so what
    // fails is the missing map in the answer.
    const failure = fetchLedMap(conn, 99);
    await expect(failure).rejects.toBeInstanceOf(LedRpcError);
    await expect(failure).rejects.toThrow(/colors of layer 99/);
  });
});

describe("sendLedColors", () => {
  it("changes the colors of the slots it is given", async () => {
    const { conn } = connectDemo();

    await sendLedColors(conn, 0, [
      { slot: 1, rgb: 0xff0000 },
      { slot: 53, rgb: 0x123456 },
    ]);

    const colors = await fetchLedMap(conn, 0);
    expect(colors[1]).toBe(0xff0000);
    expect(colors[53]).toBe(0x123456);
    expect(colors[2]).toBe(DEMO_DEFAULT_COLORS[0][2]);
  });

  it("sends a long list in requests of at most 16 entries", async () => {
    const { conn, device } = connectDemo();
    const handle = vi.spyOn(device, "handle");
    const entries = Array.from({ length: LED_PROTOCOL_SLOTS }, (_, slot) => ({
      slot,
      rgb: 0x010203 + slot,
    }));

    await sendLedColors(conn, 0, entries);

    const sizes = handle.mock.calls.map(
      ([request]) => request.keymap?.setLedColors?.entries.length,
    );
    expect(sizes).toEqual([16, 16, 16, 6]);
    expect(await fetchLedMap(conn, 0)).toEqual(entries.map((e) => e.rgb));
  });

  it("sends nothing for an empty list", async () => {
    const { conn, device } = connectDemo();
    const handle = vi.spyOn(device, "handle");

    await sendLedColors(conn, 0, []);

    expect(handle).not.toHaveBeenCalled();
  });

  it("carries colors that contain the special bytes of the framing", async () => {
    // 0xAB, 0xAC and 0xAD are the start, escape and end of a frame; their
    // varint encodings put those bytes inside the messages in both directions.
    const colors = [0xab, 0xac, 0xad, 0xabacad, 0xadadad];
    const { conn } = connectDemo();

    await sendLedColors(
      conn,
      0,
      colors.map((rgb, slot) => ({ slot, rgb })),
    );

    expect((await fetchLedMap(conn, 0)).slice(0, colors.length)).toEqual(colors);
  });

  it("tries again when the keyboard is busy", async () => {
    const { conn, device } = connectDemo({ busyResponses: 2 });
    const handle = vi.spyOn(device, "handle");

    await sendLedColors(conn, 0, [{ slot: 1, rgb: 0xff0000 }]);

    expect(handle).toHaveBeenCalledTimes(3);
    expect((await fetchLedMap(conn, 0))[1]).toBe(0xff0000);
  });

  it("gives up when the keyboard stays busy", async () => {
    const { conn, device } = connectDemo({ busyResponses: 100 });
    const handle = vi.spyOn(device, "handle");

    await expect(
      sendLedColors(conn, 0, [{ slot: 1, rgb: 0xff0000 }]),
    ).rejects.toThrow(/busy/);

    // the first try and five more
    expect(handle).toHaveBeenCalledTimes(6);
  });

  it("fails for a layer that has no map", async () => {
    const { conn } = connectDemo();

    const failure = sendLedColors(conn, 99, [{ slot: 0, rgb: 1 }]);
    await expect(failure).rejects.toBeInstanceOf(LedRpcError);
    await expect(failure).rejects.toThrow(/no color map/);
  });

  it("fails for a slot the keyboard does not have", async () => {
    const { conn } = connectDemo();

    await expect(
      sendLedColors(conn, 0, [{ slot: LED_PROTOCOL_SLOTS, rgb: 1 }]),
    ).rejects.toThrow(/rejected a LED number/);
  });
});

describe("save, discard and restore", () => {
  it("saves what was changed", async () => {
    const { conn } = connectDemo();

    await sendLedColors(conn, 2, [{ slot: 5, rgb: 0x00ff00 }]);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(true);

    await saveLedChanges(conn);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(false);
    expect((await fetchLedMap(conn, 2))[5]).toBe(0x00ff00);
  });

  it("discards what was not saved and keeps what was", async () => {
    const { conn } = connectDemo();

    await sendLedColors(conn, 2, [{ slot: 5, rgb: 0x00ff00 }]);
    await saveLedChanges(conn);
    await sendLedColors(conn, 2, [{ slot: 5, rgb: 0x0000ff }]);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(true);

    await discardLedChanges(conn);

    expect((await fetchLedMap(conn, 2))[5]).toBe(0x00ff00);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(false);
  });

  it("is not unsaved once a change is undone by hand", async () => {
    const { conn } = connectDemo();
    const original = DEMO_DEFAULT_COLORS[0][3];

    await sendLedColors(conn, 0, [{ slot: 3, rgb: 0xff0000 }]);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(true);

    await sendLedColors(conn, 0, [{ slot: 3, rgb: original }]);
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(false);
  });

  it("puts a layer back to the defaults of the firmware", async () => {
    const { conn } = connectDemo();

    await sendLedColors(conn, 2, [{ slot: 5, rgb: 0x00ff00 }]);
    await saveLedChanges(conn);

    const colors = await restoreLedDefaults(conn, 2);

    expect(colors).toEqual([...DEMO_DEFAULT_COLORS[2]]);
    // live now differs from what is saved
    expect((await fetchLedInfo(conn))?.unsavedChanges).toBe(true);
  });

  it("fails to restore a layer that has no map", async () => {
    const { conn } = connectDemo();

    const failure = restoreLedDefaults(conn, 99);
    await expect(failure).rejects.toBeInstanceOf(LedRpcError);
    await expect(failure).rejects.toThrow(/default colors of layer 99/);
  });
});

describe("notifications", () => {
  it("tells when the unsaved state of the light changes", async () => {
    const { conn } = connectDemo();
    const reader = conn.notification_readable.getReader();

    await sendLedColors(conn, 0, [{ slot: 1, rgb: 0xff0000 }]);
    const unsaved = await reader.read();
    expect(unsaved.value?.keymap?.unsavedLedChangesStatusChanged).toBe(true);

    await saveLedChanges(conn);
    const saved = await reader.read();
    expect(saved.value?.keymap?.unsavedLedChangesStatusChanged).toBe(false);

    reader.releaseLock();
  });
});
