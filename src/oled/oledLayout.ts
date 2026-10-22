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
  WINDOW_RECT,
  picturePosition,
  pictureRect,
  visibilityOf,
  visiblePixels,
  type Rect,
  type Visibility,
} from "./oledGeometry";
import { OLED_ID, TOAST_SETTING_ID, isOledLayoutId } from "./oledIds";

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
  /** Where the widget is on the upright canvas. */
  rect: Rect;
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
 * pictureRect; the others have the position of their first pixel.
 */
export function rectOf(
  def: Pick<WidgetDef, "placement">,
  box: Rect,
  x: number,
  y: number,
): Rect {
  return def.placement === "picture"
    ? pictureRect(x, y, box)
    : { x: x + box.x, y: y + box.y, w: box.w, h: box.h };
}

/** The widgets of the catalog and what the keyboard says about each one. */
export function widgetStates(settings: DisplaySettingData[]): WidgetState[] {
  const kind = pictureKind(settings);
  const toast = find(settings, TOAST_SETTING_ID);

  return WIDGETS.map((def): WidgetState => {
    const sx = find(settings, def.ids.x);
    const sy = find(settings, def.ids.y);
    const show = find(settings, def.ids.show);
    const present = sx !== undefined && sy !== undefined;

    const x = sx?.value ?? 0;
    const y = sy?.value ?? 0;
    const defaultX = sx?.defaultValue ?? 0;
    const defaultY = sy?.defaultValue ?? 0;
    const parts = def.art({ defaultX, defaultY, kind });
    const box = partsBox(parts);
    const rect = rectOf(def, box, x, y);

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
 * its sample drawing) at a point of the upright canvas.
 */
export function valuesForCorner(
  state: WidgetState,
  corner: { x: number; y: number },
): { x: number; y: number } {
  const wanted =
    state.def.placement === "picture"
      ? picturePosition(corner, state.box)
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

/**
 * The settings for playing a picture of the gallery on the right screen with its
 * center at a point of the upright canvas, the way a drop from the gallery does:
 * the kind, and the position that centers a picture of that kind (the pictures
 * are not all of the same size). Nothing when the keyboard has no picture.
 */
export function valuesForPicture(
  settings: DisplaySettingData[],
  kind: number,
  center: { x: number; y: number },
): { kind: number; x: number; y: number } | null {
  const picture = widgetStates(
    withValue(settings, OLED_ID.R_ANIM_KIND, kind),
  ).find((s) => s.def.placement === "picture" && s.present);

  if (!picture) {
    return null;
  }

  return { kind, ...valuesForCenter(picture, center) };
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
  return [def.ids.show, def.ids.x, def.ids.y, def.ids.kind, def.ids.ms].filter(
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
