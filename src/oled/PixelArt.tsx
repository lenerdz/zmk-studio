/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Draws what the OLED shows, pixel by pixel and upright: the sprites and the
 * fonts that scripts/oled-assets/convert.py cuts out of zmk-nice-oled, a line, a
 * rectangle. Every pixel of the firmware is a block of `scale` x `scale` screen
 * pixels, and the browser must not smooth the pictures (image-rendering:
 * pixelated).
 */
import type { CSSProperties } from "react";
import { FIRST_CHAR, FONTS, LAST_CHAR, SPRITES } from "./assets/sprites";
import type { FontName, SpriteName } from "./assets/sprites";
import { spriteFrame, type Part } from "./oledCatalog";
import type { Rect } from "./oledGeometry";

/** The color of a lit pixel: the same as the one convert.py gives the sprites. */
export const LIT_COLOR = "#dff1ff";

/** The color of a pixel that is off. */
export const PANEL_COLOR = "#04070c";

const PIXELATED: CSSProperties = {
  imageRendering: "pixelated",
  backgroundRepeat: "no-repeat",
};

interface PixelSpriteProps {
  sprite: SpriteName;
  scale: number;
  /** For an animation: which of its frames. */
  frame?: number;
}

/**
 * One frame of a sprite. A picture that is not an animation has only one, so
 * the frame of the clock of the right screen cannot go past it.
 */
export const PixelSprite = ({ sprite, scale, frame = 0 }: PixelSpriteProps) => {
  const info = SPRITES[sprite];
  const shown = spriteFrame(info.frames, frame);

  return (
    <div
      aria-hidden="true"
      className="shrink-0"
      style={{
        ...PIXELATED,
        width: info.width * scale,
        height: info.height * scale,
        backgroundImage: `url(${info.url})`,
        backgroundSize: `${info.width * info.frames * scale}px ${info.height * scale}px`,
        backgroundPosition: `${-shown * info.width * scale}px 0`,
      }}
    />
  );
};

interface PixelTextProps {
  font: FontName;
  text: string;
  scale: number;
}

/** A line of text in one of the fonts of the firmware. */
export const PixelText = ({ font, text, scale }: PixelTextProps) => {
  const info = FONTS[font];
  const cells = LAST_CHAR - FIRST_CHAR + 1;

  return (
    <div
      role="img"
      aria-label={text}
      className="flex shrink-0"
      style={{
        width: info.advance * text.length * scale,
        height: info.lineHeight * scale,
      }}
    >
      {Array.from(text).map((character, index) => {
        const code = character.charCodeAt(0);
        const cell =
          code >= FIRST_CHAR && code <= LAST_CHAR ? code - FIRST_CHAR : 0;

        return (
          <span
            key={index}
            aria-hidden="true"
            className="shrink-0"
            style={{
              ...PIXELATED,
              width: info.advance * scale,
              height: info.lineHeight * scale,
              backgroundImage: `url(${info.url})`,
              backgroundSize: `${info.advance * cells * scale}px ${info.lineHeight * scale}px`,
              backgroundPosition: `${-cell * info.advance * scale}px 0`,
            }}
          />
        );
      })}
    </div>
  );
};

interface WidgetArtProps {
  parts: Part[];
  /** The pixels the parts cover, relative to the position (partsBox). */
  box: Rect;
  scale: number;
  /** The frame to show for the animation among the parts, if there is one. */
  frame?: number;
}

/** A widget: its parts, placed as the firmware places them. */
export const WidgetArt = ({ parts, box, scale, frame = 0 }: WidgetArtProps) => (
  <div
    className="relative shrink-0"
    style={{ width: box.w * scale, height: box.h * scale }}
  >
    {parts.map((part, index) => {
      const left = (part.type === "line" ? 0 : part.x - box.x) * scale;
      const top = (part.type === "line" ? 0 : part.y - box.y) * scale;

      switch (part.type) {
        case "sprite":
          return (
            <div key={index} className="absolute" style={{ left, top }}>
              <PixelSprite sprite={part.sprite} scale={scale} frame={frame} />
            </div>
          );
        case "text":
          return (
            <div key={index} className="absolute" style={{ left, top }}>
              <PixelText font={part.font} text={part.text} scale={scale} />
            </div>
          );
        case "rect":
          return (
            <div
              key={index}
              aria-hidden="true"
              className="absolute"
              style={{
                left,
                top,
                width: part.w * scale,
                height: part.h * scale,
                background: LIT_COLOR,
              }}
            />
          );
        case "line": {
          // A line of an odd width is centered on the pixel, one of an even width
          // on the edge between two pixels.
          const center = part.width % 2 === 1 ? 0.5 : 0;
          const points = part.points
            .map(
              ([x, y]) =>
                `${(x - box.x + center) * scale},${(y - box.y + center) * scale}`,
            )
            .join(" ");

          return (
            <svg
              key={index}
              aria-hidden="true"
              className="absolute overflow-visible"
              style={{ left, top }}
              width={box.w * scale}
              height={box.h * scale}
              shapeRendering="crispEdges"
            >
              <polyline
                points={points}
                fill="none"
                stroke={LIT_COLOR}
                strokeWidth={part.width * scale}
                strokeLinejoin="round"
              />
            </svg>
          );
        }
      }
    })}
  </div>
);
