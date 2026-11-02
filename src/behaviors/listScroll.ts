/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Scrolling a list so that one of its options is in the middle of what can be
 * seen. The list of keys of the binding picker (HidUsagePicker) uses it to open
 * on the key that is set, instead of at the top of some six hundred keys.
 *
 * The arithmetic takes plain numbers, so the tests run it without a page.
 */

/** What is measured on the page, in pixels. The list is not scaled by a transform. */
export interface ListMeasures {
  /** `getBoundingClientRect().top` of the list. */
  listTop: number;
  /** `getBoundingClientRect().top` of the option. */
  optionTop: number;
  /** `getBoundingClientRect().height` of the option. */
  optionHeight: number;
  /** `clientTop` of the list: the width of its top border. */
  borderTop: number;
  /** `clientHeight` of the list: what can be seen of it, the borders left out. */
  viewHeight: number;
  /** `scrollHeight` of the list: all of its content. */
  scrollHeight: number;
  /** `scrollTop` of the list now. */
  scrollTop: number;
}

/**
 * The `scrollTop` that puts the option in the middle of the list. Near the top
 * and near the end of the content the list cannot go that far, so it stops
 * there: the first and the last options are not centered.
 */
export function centeredScrollTop(m: ListMeasures): number {
  // Where the option is in the content of the list, which is what scrollTop counts.
  const optionY = m.optionTop - m.listTop - m.borderTop + m.scrollTop;
  const centered = optionY - (m.viewHeight - m.optionHeight) / 2;
  const furthest = Math.max(0, m.scrollHeight - m.viewHeight);
  return Math.round(Math.min(Math.max(centered, 0), furthest));
}

/**
 * Scrolls the list to its selected option (the one with `aria-selected="true"`,
 * as React Aria marks it). With no option selected the list stays where it is.
 */
export function scrollSelectedToCenter(list: HTMLElement): void {
  const option = list.querySelector<HTMLElement>(
    '[role="option"][aria-selected="true"]',
  );
  if (!option) {
    return;
  }

  const listBox = list.getBoundingClientRect();
  const optionBox = option.getBoundingClientRect();
  list.scrollTop = centeredScrollTop({
    listTop: listBox.top,
    optionTop: optionBox.top,
    optionHeight: optionBox.height,
    borderTop: list.clientTop,
    viewHeight: list.clientHeight,
    scrollHeight: list.scrollHeight,
    scrollTop: list.scrollTop,
  });
}
