/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */

/** Whether the text is made only of printable ASCII characters. */
export const isAscii = (text: string | undefined): text is string =>
  Boolean(text) && /^[\x20-\x7e]+$/.test(text as string);

/** Keeps only plain ASCII: accents are dropped, other characters become "?". */
export function toAscii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}
