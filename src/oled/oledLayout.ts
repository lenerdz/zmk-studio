/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The layout of the OLED screens, without React: the settings of the keyboard
 * (the ids from 16 on, see oledIds.ts) turned into widgets with a place on the
 * canvas, and the arithmetic of moving, showing and resetting them. The OLED
 * tab is built from these functions, and so are their tests.
 */
import type { DisplaySettingData } from "../display/displayProtocol";
import { withValue } from "../display/displaySettings";
import {
  WIDGETS,
  animationKind,
  cycleMsOf,
  partsBox,
  type AnimationKind,
  type Part,
  type ScreenId,
  type WidgetDef,
} from "./oledCatalog";
import {
  WINDOW,
  WINDOW_RECT,
  picturePosition,
  pictureRect,
  visibilityOf,
  visiblePixels,
  type Rect,
  type Visibility,
} from "./oledGeometry";
import { OLED_ID, TOAST_SETTING_ID, isOledLayoutId } from "./oledIds";
import {
  MIX_ADD,
  normalizeTurn,
  pieceOf,
  readCrop,
  rotateCrop,
  writeCrop,
  type Crop,
  type Size,
  type Turn,
} from "./pictureView";

/**
 * How the picture of the right screen is turned, cut and mixed, and where the
 * whole of it is: the keyboard puts the whole picture on the canvas and the
 * crop only hides the rest, so the position settings are the corner of the whole.
 */
export interface PictureState {
  /** Quarter turns clockwise. */
  turn: Turn;
  /** The size of the whole picture as it is turned; the crop is a piece of it. */
  shape: Size;
  /** The piece that shows, in the turned picture; null for the whole picture. */
  crop: Crop | null;
  /** The piece that shows: the crop, or all of the picture. */
  piece: Crop;
  /** How a lit pixel of the picture mixes with the widgets (MIX_ADD or MIX_INVERT). */
  mix: number;
  /** The whole picture on the upright canvas; the piece is a part of it. */
  whole: Rect;
  /** The keyboard has the setting of the turn. */
  canTurn: boolean;
  /** The keyboard has the setting of the mix. */
  canMix: boolean;
  /** The keyboard has the two settings of the crop. */
  canCrop: boolean;
}

/** A widget of the catalog with what the keyboard says about it. */
export interface WidgetState {
  def: WidgetDef;
  /** The keyboard has the settings of the widget, so its build has the widget. */
  present: boolean;
  /** The widget is drawn. The toast has no switch and counts as drawn. */
  shown: boolean;
  /** The position the keyboard has; for the picture, the landscape one. */
  x: number;
  y: number;
  /** What the keyboard accepts for x and y. */
  min: number;
  max: number;
  defaultShown: boolean;
  defaultX: number;
  defaultY: number;
  /** The sample drawing and the pixels it covers, relative to the position. */
  parts: Part[];
  box: Rect;
  /** Where the widget is on the upright canvas (for a cut picture, the piece that shows). */
  rect: Rect;
  /** The picture of the right screen only: how it is turned, cut and mixed. */
  picture: PictureState | null;
  /** How much of it the panel shows. */
  visibility: Visibility;
  /** The light toast is turned off in the Display tab: it will not show. */
  muted: boolean;
}

/** Whether the keyboard has the OLED layout (the ids from 16 on). */
export function hasOledLayout(settings: DisplaySettingData[]): boolean {
  return settings.some((setting) => isOledLayoutId(setting.id));
}

/** The setting with an id, if the keyboard has it. */
function find(
  settings: DisplaySettingData[],
  id: number | undefined,
): DisplaySettingData | undefined {
  return id === undefined ? undefined : settings.find((s) => s.id === id);
}

/** The kind of the picture of the right screen (the first one when there is none). */
export function pictureKind(settings: DisplaySettingData[]): number {
  return find(settings, OLED_ID.R_ANIM_KIND)?.value ?? 0;
}

/**
 * Where the widget is on the upright canvas. The picture of the right screen
 * has the position on the landscape canvas of the panel and goes through
 * pictureRect, and the crop (a piece of the turned picture) is the part of it
 * that shows; the others have the position of their first pixel.
 */
export function rectOf(
  def: Pick<WidgetDef, "placement">,
  box: Rect,
  x: number,
  y: number,
  crop: Crop | null = null,
): Rect {
  if (def.placement !== "picture") {
    return { x: x + box.x, y: y + box.y, w: box.w, h: box.h };
  }

  const whole = pictureRect(x, y, box);
  return crop
    ? { x: whole.x + crop.x, y: whole.y + crop.y, w: crop.w, h: crop.h }
    : whole;
}

/** The widgets of the catalog and what the keyboard says about each one. */
export function widgetStates(settings: DisplaySettingData[]): WidgetState[] {
  const kind = pictureKind(settings);
  const toast = find(settings, TOAST_SETTING_ID);
  const rot = find(settings, OLED_ID.R_ANIM_ROT);
  const mix = find(settings, OLED_ID.R_ANIM_MIX);
  const cropXY = find(settings, OLED_ID.R_ANIM_CROP_XY);
  const cropWH = find(settings, OLED_ID.R_ANIM_CROP_WH);
  const turn = normalizeTurn(rot?.value ?? 0);

  return WIDGETS.map((def): WidgetState => {
    const sx = find(settings, def.ids.x);
    const sy = find(settings, def.ids.y);
    const show = find(settings, def.ids.show);
    const present = sx !== undefined && sy !== undefined;

    const x = sx?.value ?? 0;
    const y = sy?.value ?? 0;
    const defaultX = sx?.defaultValue ?? 0;
    const defaultY = sy?.defaultValue ?? 0;
    const parts = def.art({ defaultX, defaultY, kind, turn });
    const box = partsBox(parts);

    // Only the picture of the right screen is turned, cut and mixed
    let picture: PictureState | null = null;
    let crop: Crop | null = null;
    if (def.placement === "picture") {
      const shape = { w: box.w, h: box.h };
      crop = readCrop(
        { xy: cropXY?.value ?? 0, wh: cropWH?.value ?? 0 },
        shape,
      );
      picture = {
        turn,
        shape,
        crop,
        piece: pieceOf(crop, shape),
        mix: mix?.value ?? MIX_ADD,
        whole: rectOf(def, box, x, y),
        canTurn: rot !== undefined,
        canMix: mix !== undefined,
        canCrop: cropXY !== undefined && cropWH !== undefined,
      };
    }
    const rect = rectOf(def, box, x, y, crop);

    return {
      def,
      present,
      shown: show ? show.value !== 0 : true,
      x,
      y,
      min: sx?.min ?? 0,
      max: sx?.max ?? 0,
      defaultShown: show ? show.defaultValue !== 0 : true,
      defaultX,
      defaultY,
      parts,
      box,
      rect,
      picture,
      visibility: visibilityOf(rect),
      muted: def.key === "r_toast" && toast !== undefined && toast.value === 0,
    };
  });
}

/**
 * The order the widgets of a screen are drawn in, from the one under the
 * others: the picture, then the widgets, then the toast, which is drawn over
 * all of them (it shows for a moment, on top of whatever is there).
 */
export function drawOrder(state: Pick<WidgetState, "def">): number {
  if (state.def.placement === "picture") {
    return 1;
  }
  return state.def.key === "r_toast" ? 3 : 2;
}

/** The widgets of a screen the keyboard has, in the order of the catalog. */
export function widgetsOfScreen(
  states: WidgetState[],
  screen: ScreenId,
): WidgetState[] {
  return states.filter((s) => s.def.screen === screen && s.present);
}

/** The widgets of a screen the keyboard has no setting for. */
export function missingWidgets(
  states: WidgetState[],
  screen: ScreenId,
): WidgetState[] {
  return states.filter((s) => s.def.screen === screen && !s.present);
}

/** The value held inside the range the keyboard accepts for the position. */
function hold(state: Pick<WidgetState, "min" | "max">, value: number): number {
  return Math.min(Math.max(Math.round(value), state.min), state.max);
}

/**
 * The position settings that put the widget with its first pixel (the corner of
 * its sample drawing) at a point of the upright canvas. For a picture that is
 * cut, the corner is the one of the piece that shows, and the position is the
 * one of the whole picture, which is the part of it that lies before the piece.
 */
export function valuesForCorner(
  state: WidgetState,
  corner: { x: number; y: number },
): { x: number; y: number } {
  const cut = state.picture?.crop ?? null;
  const wanted =
    state.def.placement === "picture"
      ? picturePosition(
          { x: corner.x - (cut?.x ?? 0), y: corner.y - (cut?.y ?? 0) },
          state.box,
        )
      : { x: corner.x - state.box.x, y: corner.y - state.box.y };

  return { x: hold(state, wanted.x), y: hold(state, wanted.y) };
}

/** The settings of a widget moved by a distance on the upright canvas. */
export function valuesAfterMove(
  state: WidgetState,
  dx: number,
  dy: number,
): { x: number; y: number } {
  return valuesForCorner(state, {
    x: state.rect.x + dx,
    y: state.rect.y + dy,
  });
}

/**
 * The settings that put the center of the widget at a point of the upright
 * canvas, the way a drop of a chip from the tray does.
 */
export function valuesForCenter(
  state: WidgetState,
  center: { x: number; y: number },
): { x: number; y: number } {
  return valuesForCorner(state, {
    x: Math.round(center.x - state.rect.w / 2),
    y: Math.round(center.y - state.rect.h / 2),
  });
}

/** The settings of the picture of the right screen that a new picture sets. */
export interface PictureValues {
  kind: number;
  x: number;
  y: number;
  /** Quarter turns clockwise. */
  rot: number;
  /** The crop, in the two settings that hold it. */
  cropXY: number;
  cropWH: number;
}

/** The picture of the right screen, with what the keyboard says about it. */
function pictureWidget(settings: DisplaySettingData[]): WidgetState | undefined {
  return widgetStates(settings).find(
    (s) => s.def.placement === "picture" && s.present,
  );
}

/** The settings with a picture of another kind, upright and whole (not turned, not cut). */
function withFreshPicture(
  settings: DisplaySettingData[],
  kind: number,
): DisplaySettingData[] {
  let next = withValue(settings, OLED_ID.R_ANIM_KIND, kind);
  next = withValue(next, OLED_ID.R_ANIM_ROT, 0);
  next = withValue(next, OLED_ID.R_ANIM_CROP_XY, 0);
  return withValue(next, OLED_ID.R_ANIM_CROP_WH, 0);
}

/**
 * The settings for playing a picture of the gallery on the right screen with its
 * center at a point of the upright canvas, the way a drop from the gallery does:
 * the kind, and the position that centers a picture of that kind (the pictures
 * are not all of the same size). A new picture starts upright and whole: the
 * turn and the crop of the one that was playing belong to it. Nothing when the
 * keyboard has no picture.
 */
export function valuesForPicture(
  settings: DisplaySettingData[],
  kind: number,
  center: { x: number; y: number },
): PictureValues | null {
  const picture = pictureWidget(withFreshPicture(settings, kind));

  if (!picture) {
    return null;
  }

  return { kind, ...valuesForCenter(picture, center), rot: 0, cropXY: 0, cropWH: 0 };
}

/**
 * The corner that puts a rectangle inside the strip the panel shows, on each side
 * where it fits; a side that is longer than the strip keeps the corner it has.
 */
function fitInWindow(rect: Rect): { x: number; y: number } {
  const fit = (at: number, size: number, from: number, length: number) =>
    size <= length
      ? Math.min(Math.max(at, from), from + length - size)
      : at;

  return {
    x: fit(rect.x, rect.w, WINDOW.x, WINDOW.width),
    y: fit(rect.y, rect.h, WINDOW.y, WINDOW.height),
  };
}

/**
 * The settings for another picture on the right screen, the way a click in the
 * gallery or a choice in the list does it: the new picture, upright and whole,
 * with its center where the center of what showed was (the pictures are not all
 * of the same size), and then inside the strip the panel shows when it fits
 * there, so a picture that was off to a side does not get lost. Nothing when the
 * keyboard has no picture.
 */
export function valuesForKindChange(
  settings: DisplaySettingData[],
  kind: number,
): PictureValues | null {
  const current = pictureWidget(settings);
  const fresh = pictureWidget(withFreshPicture(settings, kind));

  if (!current || !fresh) {
    return null;
  }

  const centered = valuesForCenter(fresh, {
    x: current.rect.x + current.rect.w / 2,
    y: current.rect.y + current.rect.h / 2,
  });
  const rect = rectOf(fresh.def, fresh.box, centered.x, centered.y);

  return {
    kind,
    ...valuesForCorner(fresh, fitInWindow(rect)),
    rot: 0,
    cropXY: 0,
    cropWH: 0,
  };
}

/** What turning the picture sets: the turn, the position and the crop that goes with it. */
export interface TurnValues {
  rot: number;
  x: number;
  y: number;
  cropXY: number;
  cropWH: number;
}

/**
 * The settings that turn the picture to a number of quarter turns clockwise (0
 * to 3), by the shortest way. The piece that shows is turned with the picture
 * and keeps its center where it was on the canvas, so the picture turns on the
 * spot and does not jump away. A piece whose sides differ by an odd number has
 * its center between two pixels: its corner then moves half a pixel too far one
 * way and half a pixel too far the other, and the same turn the other way
 * brings it back exactly (four quarters leave every setting as they were).
 * Null for a widget that is not the picture.
 */
export function valuesForTurn(
  state: WidgetState,
  target: number,
): TurnValues | null {
  const { picture } = state;
  if (!picture) {
    return null;
  }

  const wanted = normalizeTurn(target);
  const steps = (wanted - picture.turn + 4) % 4;
  const moves: Array<1 | -1> = steps === 3 ? [-1] : Array(steps).fill(1);

  let shape = picture.shape;
  let crop = picture.crop;
  let size: Size = { w: state.rect.w, h: state.rect.h };
  let corner = { x: state.rect.x, y: state.rect.y };
  for (const direction of moves) {
    crop = crop ? rotateCrop(crop, shape, direction) : null;
    shape = { w: shape.h, h: shape.w };

    // The piece turns about its center, so its corner moves by half the
    // difference of its sides, rounded away from 0 (the opposite turn then
    // moves it back by exactly as much)
    const half = Math.sign(size.w - size.h) * Math.round(Math.abs(size.w - size.h) / 2);
    corner = { x: corner.x + half, y: corner.y - half };
    size = { w: size.h, h: size.w };
  }

  const piece = pieceOf(crop, shape);
  const position = picturePosition(
    { x: corner.x - piece.x, y: corner.y - piece.y },
    shape,
  );
  const written = writeCrop(crop, shape);

  return {
    rot: wanted,
    x: hold(state, position.x),
    y: hold(state, position.y),
    cropXY: written.xy,
    cropWH: written.wh,
  };
}

/** The position settings that put the piece that shows in the middle of the strip the panel shows. */
export function valuesForWindowCenter(state: WidgetState): {
  x: number;
  y: number;
} {
  return valuesForCenter(state, {
    x: WINDOW.x + WINDOW.width / 2,
    y: WINDOW.y + WINDOW.height / 2,
  });
}

/**
 * The settings for showing a widget that was hidden: where it was, unless the
 * panel would not show it there (some builds put a widget off the screen), and
 * then at the top of what the panel shows.
 */
export function valuesForShowing(state: WidgetState): {
  x: number;
  y: number;
} {
  return state.visibility === "none"
    ? valuesForCorner(state, { x: WINDOW_RECT.x, y: WINDOW_RECT.y })
    : { x: state.x, y: state.y };
}

export function describeVisibility(state: WidgetState): string {
  const total = state.rect.w * state.rect.h;
  const shown = visiblePixels(state.rect);

  switch (state.visibility) {
    case "full":
      return "All of it is on the screen.";
    case "partial":
      return `${shown} of its ${total} pixels are on the screen; the rest is cut off.`;
    default:
      return "It is outside what the screen shows.";
  }
}

/** What the panel does with a widget now, in a few words. */
export function describeStatus(state: WidgetState): string {
  if (state.def.key === "r_toast") {
    return state.muted
      ? "Off: turned off in the Display tab"
      : "Shows for a moment when the lights change";
  }
  if (!state.shown) {
    return "Hidden";
  }

  switch (state.visibility) {
    case "full":
      return "On the screen";
    case "partial":
      return `Cut off by the edge: ${visiblePixels(state.rect)} of ${
        state.rect.w * state.rect.h
      } pixels show`;
    default:
      return "Outside what the screen shows";
  }
}

/** The ids of every setting of a widget. */
export function idsOfWidget(def: WidgetDef): number[] {
  const { show, x, y, kind, ms, rot, mix, cropXY, cropWH } = def.ids;

  return [show, x, y, kind, ms, rot, mix, cropXY, cropWH].filter(
    (id): id is number => id !== undefined,
  );
}

/** What has to be sent to put the settings of the widgets back as the build had them. */
export function resetChanges(
  settings: DisplaySettingData[],
  defs: WidgetDef[],
): Array<{ id: number; value: number }> {
  return defs.flatMap((def) =>
    idsOfWidget(def).flatMap((id) => {
      const setting = find(settings, id);
      return setting && setting.value !== setting.defaultValue
        ? [{ id, value: setting.defaultValue }]
        : [];
    }),
  );
}

/** Whether every setting of the widgets is what the build had. */
export function widgetsAreDefault(
  settings: DisplaySettingData[],
  defs: WidgetDef[],
): boolean {
  return resetChanges(settings, defs).length === 0;
}

/** The pictures the keyboard can play: the ones inside the range it accepts. */
export function selectableKinds(
  settings: DisplaySettingData[],
  all: readonly AnimationKind[],
): AnimationKind[] {
  const setting = find(settings, OLED_ID.R_ANIM_KIND);
  return setting
    ? all.filter((k) => k.value >= setting.min && k.value <= setting.max)
    : [];
}

/** The picture of the right screen, with how long a cycle takes. */
export function pictureOf(settings: DisplaySettingData[]): {
  kind: AnimationKind;
  cycleMs: number | null;
} {
  const kind = animationKind(pictureKind(settings));
  const ms = find(settings, OLED_ID.R_ANIM_MS)?.value ?? 0;

  return { kind, cycleMs: cycleMsOf(kind, ms) };
}
