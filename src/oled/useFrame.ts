/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The clock of the animated pictures of the OLED tab: which frame of an
 * animation is on show, and whether the system asks for less motion.
 */
import { useEffect, useState } from "react";

/** Whether the system asks for less motion (the animations then start paused). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The frame of an animation that is playing: it goes round the frames in the
 * time of one cycle, and stays on the first one while it is paused or has
 * nothing to play. The app never asks for more than 25 frames a second.
 */
export function useFrame(
  frames: number,
  cycleMs: number | null,
  playing: boolean,
): number {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!playing || frames <= 1 || cycleMs === null) {
      setFrame(0);
      return;
    }

    const id = window.setInterval(
      () => setFrame((current) => (current + 1) % frames),
      Math.max(cycleMs / frames, 40),
    );
    return () => window.clearInterval(id);
  }, [frames, cycleMs, playing]);

  // A new picture can have fewer frames than the one before it.
  return frame < frames ? frame : 0;
}
