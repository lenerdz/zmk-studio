/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * How the preview of each screen is turned, which the browser remembers (the
 * keyboard knows nothing about it: it is a way of looking, not a setting).
 */
import { useState } from "react";
import type { ScreenId } from "./oledCatalog";
import { nextTurn, normalizeTurn, type Turn } from "./pictureView";

/** The key the browser keeps the turn of a screen under. */
export function viewTurnKey(screen: ScreenId): string {
  return `zmk-studio.oled.view-turn.${screen}`;
}

/** The turn a stored text means; 0 for anything that is not a whole number. */
export function parseViewTurn(raw: string | null): Turn {
  if (raw === null || !/^-?\d+$/.test(raw.trim())) {
    return 0;
  }
  return normalizeTurn(Number(raw));
}

/** The turn the browser kept, or 0 (the storage may be missing or refuse to answer). */
function stored(screen: ScreenId): Turn {
  try {
    return parseViewTurn(window.localStorage.getItem(viewTurnKey(screen)));
  } catch {
    return 0;
  }
}

/** The turn of the view of a screen and a function that turns it a quarter clockwise. */
export function useViewTurn(screen: ScreenId): [Turn, () => void] {
  const [turn, setTurn] = useState<Turn>(() => stored(screen));

  const turnView = () => {
    const next = nextTurn(turn, 1);
    setTurn(next);
    try {
      window.localStorage.setItem(viewTurnKey(screen), String(next));
    } catch {
      // A browser that does not keep it: the view is turned until the page closes
    }
  };

  return [turn, turnView];
}
