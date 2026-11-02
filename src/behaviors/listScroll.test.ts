/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { describe, expect, it } from "vitest";
import {
  centeredScrollTop,
  scrollSelectedToCenter,
  type ListMeasures,
} from "./listScroll";

// The list of keys on a screen 890 px high: a view of 267 px (30vh) over 16864 px
// of content, rows of 24 px, 100 px below the top of the page.
const LIST_TOP = 100;
const VIEW = 267;
const CONTENT = 16864;
const ROW = 24;

// What the page measures when the option starts `optionY` px down the content of
// the list and the list is scrolled to `scrollTop`.
function measures(
  optionY: number,
  scrollTop = 0,
  extra: Partial<ListMeasures> = {},
): ListMeasures {
  const borderTop = extra.borderTop ?? 0;
  return {
    listTop: LIST_TOP,
    optionTop: LIST_TOP + borderTop + optionY - scrollTop,
    optionHeight: ROW,
    borderTop,
    viewHeight: VIEW,
    scrollHeight: CONTENT,
    scrollTop,
    ...extra,
  };
}

describe("centeredScrollTop", () => {
  it("puts the option in the middle of the view", () => {
    // the key that was set in the screenshot: 5360 px down, with the list at the top
    const top = centeredScrollTop(measures(5360));
    expect(top).toBe(5239);

    // seen from the list, the middle of the option is the middle of the view
    const middleOfOption = 5360 + ROW / 2 - top;
    expect(Math.abs(middleOfOption - VIEW / 2)).toBeLessThanOrEqual(1);
  });

  it("gives the same answer wherever the list is scrolled to now", () => {
    const answers = [0, 1000, 5000, 6900, 9999].map((scrolled) =>
      centeredScrollTop(measures(7000, scrolled)),
    );
    expect(new Set(answers)).toEqual(new Set([6879]));
  });

  it("does not go above the top of the content", () => {
    expect(centeredScrollTop(measures(0))).toBe(0);
    expect(centeredScrollTop(measures(100))).toBe(0);
  });

  it("does not go past the end of the content", () => {
    const last = centeredScrollTop(measures(CONTENT - ROW));
    expect(last).toBe(CONTENT - VIEW);
  });

  it("stays at the top when everything fits in the view", () => {
    const short = measures(100, 0, { scrollHeight: 200, viewHeight: VIEW });
    expect(centeredScrollTop(short)).toBe(0);
  });

  it("counts the top border of the list", () => {
    // the border moves the content down in the list, and the answer does not change
    expect(centeredScrollTop(measures(5360, 0, { borderTop: 2 }))).toBe(5239);

    // measured by hand: an option whose top is 5360 px under the top of the list
    // starts at 5358 px of the content when there is a border of 2 px
    const byHand: ListMeasures = {
      ...measures(0),
      optionTop: LIST_TOP + 5360,
      borderTop: 2,
    };
    expect(centeredScrollTop(byHand)).toBe(5237);
  });

  it("answers with a whole number of pixels", () => {
    expect(Number.isInteger(centeredScrollTop(measures(5360.3)))).toBe(true);
    expect(Number.isInteger(centeredScrollTop(measures(0.2, 0.4)))).toBe(true);
  });

  it("never leaves what the list can scroll", () => {
    for (let optionY = -50; optionY <= CONTENT + 50; optionY += 137) {
      for (const scrolled of [0, 3000, CONTENT - VIEW]) {
        const top = centeredScrollTop(measures(optionY, scrolled));
        expect(top).toBeGreaterThanOrEqual(0);
        expect(top).toBeLessThanOrEqual(CONTENT - VIEW);
      }
    }
  });
});

describe("scrollSelectedToCenter", () => {
  const SELECTED = '[role="option"][aria-selected="true"]';

  // Enough of a list for the function: it only reads these properties.
  function fakeList(selectedTop: number | null, scrollTop = 0) {
    const list = {
      scrollTop,
      scrollHeight: CONTENT,
      clientHeight: VIEW,
      clientTop: 0,
      getBoundingClientRect: () => ({ top: LIST_TOP, height: VIEW }),
      querySelector: (selector: string) =>
        selector === SELECTED && selectedTop !== null
          ? { getBoundingClientRect: () => ({ top: selectedTop, height: ROW }) }
          : null,
    };
    return list as unknown as HTMLElement;
  }

  it("scrolls to the option that is selected", () => {
    const list = fakeList(LIST_TOP + 5360);
    scrollSelectedToCenter(list);
    expect(list.scrollTop).toBe(5239);
  });

  it("measures from where the list is scrolled to", () => {
    // the same option, seen after the list was scrolled by 4000 px
    const list = fakeList(LIST_TOP + 5360 - 4000, 4000);
    scrollSelectedToCenter(list);
    expect(list.scrollTop).toBe(5239);
  });

  it("leaves the list where it is when no option is selected", () => {
    const list = fakeList(null, 300);
    scrollSelectedToCenter(list);
    expect(list.scrollTop).toBe(300);
  });
});
