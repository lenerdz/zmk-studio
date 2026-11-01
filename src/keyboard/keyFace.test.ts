/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { hid_usage_get_labels } from "../hid-usages";
import { bindingName } from "../lights/keyNames";
import { corneBehaviors, corneKeymap } from "./corne.mock";
import {
  faceLabels,
  shiftName,
  shiftSide,
  shiftTitle,
} from "./keyFace";

const KEYBOARD = 0x07;
const CONSUMER = 0x0c;

// A usage as ZMK writes it: implicit modifiers in the top byte, then the page and the id.
const usage = (id: number, modifiers = 0, page = KEYBOARD) =>
  modifiers * 0x1000000 + page * 0x10000 + id;

const RETURN = 0x28;
const SPACE = 0x2c;
const LEFT_SHIFT = 0xe1;
const RIGHT_SHIFT = 0xe5;

describe("faceLabels", () => {
  it("writes Enter on the Return key, at every width", () => {
    expect(faceLabels(KEYBOARD, RETURN)).toEqual({
      short: "Enter",
      med: "Enter",
      long: "Enter",
    });
  });

  it("writes Space on the spacebar, at every width", () => {
    expect(faceLabels(KEYBOARD, SPACE)).toEqual({
      short: "Space",
      med: "Space",
      long: "Space",
    });
  });

  it("writes Shift on both Shift keys", () => {
    expect(faceLabels(KEYBOARD, LEFT_SHIFT).short).toBe("Shift");
    expect(faceLabels(KEYBOARD, RIGHT_SHIFT).short).toBe("Shift");
  });

  it("does not say Ret, Ret or the box symbol of the shared labels any more", () => {
    // the shared labels are what they were: the faces change, they do not
    expect(hid_usage_get_labels(KEYBOARD, RETURN).short).toBe("Ret");
    expect(hid_usage_get_labels(KEYBOARD, SPACE).short).toBe("\u2423");
    expect(faceLabels(KEYBOARD, RETURN).short).not.toBe("Ret");
    expect(faceLabels(KEYBOARD, SPACE).short).not.toBe("\u2423");
  });

  it("leaves every other key with the shared labels", () => {
    for (const id of [0x04, 0x1e, 0x29, 0x2a, 0x2b, 0x4f, 0xe0, 0xe2, 0xe6]) {
      expect(faceLabels(KEYBOARD, id)).toEqual(hid_usage_get_labels(KEYBOARD, id));
    }
  });

  it("leaves the keypad Enter alone: it is another key than Return", () => {
    expect(faceLabels(KEYBOARD, 0x58)).toEqual(hid_usage_get_labels(KEYBOARD, 0x58));
  });

  it("does not touch the keys of the consumer page that share a number", () => {
    // 0x28, 0x2c, 0xe1 and 0xe5 on the consumer page are not the keys above
    for (const id of [RETURN, SPACE, LEFT_SHIFT, RIGHT_SHIFT]) {
      expect(faceLabels(CONSUMER, id)).toEqual(hid_usage_get_labels(CONSUMER, id));
    }
  });
});

describe("shiftSide", () => {
  it("knows the left and the right Shift key", () => {
    expect(shiftSide(usage(LEFT_SHIFT))).toBe("left");
    expect(shiftSide(usage(RIGHT_SHIFT))).toBe("right");
  });

  it("is nothing for other keys", () => {
    for (const id of [0x04, RETURN, SPACE, 0xe0, 0xe2, 0xe3, 0xe4, 0xe6, 0xe7]) {
      expect(shiftSide(usage(id))).toBeUndefined();
    }
  });

  it("is nothing for a usage that carries an implicit modifier: it is another key", () => {
    expect(shiftSide(usage(LEFT_SHIFT, 0x01))).toBeUndefined(); // LC(LSHFT)
    expect(shiftSide(usage(RIGHT_SHIFT, 0x02))).toBeUndefined(); // LS(RSHFT)
    expect(shiftSide(usage(LEFT_SHIFT, 0x80))).toBeUndefined(); // top bit set
  });

  it("is nothing for the same numbers on another usage page", () => {
    expect(shiftSide(usage(LEFT_SHIFT, 0, CONSUMER))).toBeUndefined();
    expect(shiftSide(usage(RIGHT_SHIFT, 0, CONSUMER))).toBeUndefined();
  });
});

describe("what a Shift key says", () => {
  it("is named Shift under the arrow, whichever side it is", () => {
    expect(shiftName("left")).toBe("Shift");
    expect(shiftName("right")).toBe("Shift");
  });

  it("tells the side in the tooltip", () => {
    expect(shiftTitle("left")).toBe("Left Shift");
    expect(shiftTitle("right")).toBe("Right Shift");
  });
});

describe("the names of the keys in the exported led_colors.dtsi", () => {
  const layers = corneKeymap.layers.map((l) => ({ id: l.id, name: l.name }));
  const names = (layerId: number) =>
    (corneKeymap.layers.find((l) => l.id === layerId)?.bindings ?? []).map((b) =>
      bindingName(b, corneBehaviors[b.behaviorId], layers),
    );

  it("do not change with the words of the faces", () => {
    const qwerty = names(0);

    // the Return key is still RET and the spacebar SPACE, as in the repository's file
    expect(qwerty[39]).toBe("RET");
    expect(qwerty[38]).toBe("SPACE");
    // and the Shift key is still SHFT, not SHIFT
    expect(qwerty).toContain("SHFT");
    expect(qwerty).not.toContain("SHIFT");
    expect(qwerty).not.toContain("ENTER");
  });
});
