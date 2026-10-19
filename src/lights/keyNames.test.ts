/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import { corneBehaviors, corneKeymap } from "../keyboard/corne.mock";
import { bindingName } from "./keyNames";
import { toAscii } from "./text";

const layers = corneKeymap.layers.map((l) => ({ id: l.id, name: l.name }));

/** The names of the keys of the layer with that id. */
const names = (layerId: number) => {
  const layer = corneKeymap.layers.find((l) => l.id === layerId);
  if (!layer) {
    throw new Error(`no layer ${layerId}`);
  }
  return layer.bindings.map((b) =>
    bindingName(b, corneBehaviors[b.behaviorId], layers),
  );
};

describe("bindingName", () => {
  it("names the letters, symbols and thumb keys of the QWERTY layer", () => {
    const qwerty = names(0);

    expect(qwerty.slice(0, 12)).toEqual([
      "TAB",
      "Q",
      "W",
      "E",
      "R",
      "T",
      "Y",
      "U",
      "I",
      "O",
      "P",
      "BKSP",
    ]);
    // left thumbs, then right thumbs
    expect(qwerty.slice(36, 39)).toEqual(["GUI", "FN1", "SPACE"]);
    expect(qwerty.slice(39)).toEqual(["RET", "RAISE", "ALTG"]);
  });

  it("names a layer key after the layer", () => {
    expect(names(0)[37]).toBe("FN1");
    expect(names(0)[40]).toBe("RAISE");
  });

  it("uses -- for the keys that do nothing", () => {
    // transparent and none
    expect(names(1)[28]).toBe("--");
    expect(names(3)[1]).toBe("--");
  });

  it("uses -- while the details of the behavior are not known", () => {
    const binding = corneKeymap.layers[0].bindings[0];
    expect(bindingName(binding, undefined, layers)).toBe("--");
  });

  it("describes the media keys by what they do", () => {
    const media = names(5);

    expect(media.slice(12, 15)).toEqual(["MUTE", "VOL_DOWN", "VOL_UP"]);
    expect(media.slice(15, 17)).toEqual(["BRI_DOWN", "BRI_UP"]);
    expect(media.slice(18, 22)).toEqual(["PREV", "PLAY/PAUSE", "NEXT", "STOP"]);
  });

  it("writes arrows and the space bar with letters", () => {
    expect(names(3).slice(18, 22)).toEqual(["LEFT", "DOWN", "UP", "RIGHT"]);
    expect(names(0)[38]).toBe("SPACE");
  });

  it("gives plain ASCII names no longer than 12 characters", () => {
    for (const layer of corneKeymap.layers) {
      for (const name of names(layer.id)) {
        expect(name).toMatch(/^[\x20-\x7e]+$/);
        expect(name.length).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("toAscii", () => {
  it("drops accents and replaces other characters", () => {
    expect(toAscii("Mídia")).toBe("Midia");
    expect(toAscii("Ação")).toBe("Acao");
    expect(toAscii("a\u2423b")).toBe("a?b");
  });
});
