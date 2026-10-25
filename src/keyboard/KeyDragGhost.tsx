/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * What follows the pointer while a key is dragged: a copy of the key with what
 * it does written on it, and a tag with what dropping it would do. It lives in
 * the body, outside the scaled and rotated drawing of the keyboard, so it keeps
 * its size and does not catch the pointer (the keys under it still do).
 */
import { PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Copy, Layers } from "lucide-react";
import type { DropMode } from "./keyDrag";

/**
 * The copy is smaller than the key and sits a little below and to the right of
 * the pointer, so that the key under the pointer, the one that would receive the
 * drop, can still be read.
 */
const GHOST_SCALE = 0.7;
const GHOST_OFFSET = 10;

export interface KeyDragGhostProps {
  /** Where the pointer is, in the coordinates of the window. */
  x: number;
  y: number;
  /** The size the dragged key has on the screen. */
  width: number;
  height: number;
  /** Swapping or copying: the icon of the tag. */
  mode: DropMode;
  /** The words of the tag under the copy (see ghostTag in keyDrag.ts). */
  tag: string;
  /** The pointer is over another key, so a drop would do `mode`. */
  droppable: boolean;
  /** The pointer is over a layer of the list that opens if the key stays. */
  opening?: boolean;
}

export const KeyDragGhost = ({
  x,
  y,
  width,
  height,
  mode,
  tag,
  droppable,
  opening = false,
  children,
}: PropsWithChildren<KeyDragGhostProps>) => {
  const Icon = opening ? Layers : mode === "copy" ? Copy : ArrowLeftRight;

  return createPortal(
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: x + GHOST_OFFSET,
        top: y + GHOST_OFFSET,
        width: width * GHOST_SCALE,
        height: height * GHOST_SCALE,
      }}
    >
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded bg-primary text-primary-content opacity-90 shadow-xl ${
          droppable || opening ? "ring-2 ring-accent" : ""
        }`}
      >
        {children}
      </div>
      <div className="absolute left-1/2 top-full mt-1 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-base-100 px-1.5 py-0.5 text-[0.65rem] text-base-content shadow">
        <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
        {tag}
      </div>
    </div>,
    document.body,
  );
};
