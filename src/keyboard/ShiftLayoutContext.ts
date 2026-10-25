/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { createContext } from "react";
import type { ShiftLayout } from "./shiftLegend";

/**
 * The keyboard layout the legends beside the keys follow (see shiftLegend.ts).
 * "off" where nothing provides one, so a label drawn elsewhere stays as upstream
 * draws it.
 */
export const ShiftLayoutContext = createContext<ShiftLayout>("off");
