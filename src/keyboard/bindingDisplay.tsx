/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Turns a key binding into something readable on the keyboard drawing: an icon
 * and a short label for behaviors whose parameters are not HID usages
 * (Bluetooth, lighting, layers, ...). Everything is derived from what the
 * firmware reports (the behavior display name and the parameter descriptions),
 * so a behavior this file knows nothing about still gets a generic label built
 * from its parameters.
 */
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  ArrowBigUpDash,
  ArrowLeftRight,
  ArrowRightToLine,
  Ban,
  Binary,
  Blend,
  Bluetooth,
  BluetoothOff,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  CircleSlash,
  CloudRain,
  Download,
  Droplet,
  Eraser,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  LightbulbOff,
  LockOpen,
  Minus,
  MousePointerClick,
  Paintbrush,
  Palette,
  Pause,
  Pin,
  Play,
  PlugZap,
  Plus,
  Power,
  Rainbow,
  Repeat,
  RefreshCw,
  RotateCcw,
  Rows3,
  Sparkles,
  Square,
  Star,
  Sun,
  Timer,
  ToggleRight,
  Trash2,
  Unplug,
  Usb,
  Volume1,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type {
  BehaviorParameterValueDescription,
  GetBehaviorDetailsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type {
  BehaviorBinding,
  Layer,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { validateValue } from "../behaviors/parameters";

type Icon = ComponentType<LucideProps>;
type LayerRef = Pick<Layer, "id" | "name">;
// What a rule returns: a display whose tooltip is built later unless it sets one.
type Part = Omit<BindingDisplay, "title"> & { title?: string };

export interface BindingDisplay {
  /** Replaces the behavior name drawn above the key. An empty string hides it. */
  header?: string;
  icon?: Icon;
  /** Small icon drawn next to the main one (direction, sign, ...). */
  badge?: Icon;
  /** Short text drawn under the icon, or alone when there is no icon. */
  text?: string;
  /** HID usages drawn with the regular key label, in order. */
  hid?: number[];
  /** Dims the key (transparent and empty bindings). */
  muted?: boolean;
  /** Full description, shown as a tooltip. */
  title: string;
}

interface Context {
  rawName: string;
  /** Behavior display name in lower case. */
  name: string;
  param1: number;
  param2: number;
  p1?: BehaviorParameterValueDescription;
  p2?: BehaviorParameterValueDescription;
  /** Description of param1 in lower case, or an empty string. */
  p1Name: string;
  layers: LayerRef[];
}

const EFFECT_ICONS: Array<[RegExp, Icon]> = [
  [/solid|static|fill/, Square],
  [/breath|pulse/, Wind],
  [/spectrum|cycle/, Blend],
  [/rainbow/, Rainbow],
  [/react|typing/, Zap],
  [/ripple|wave|river|pendulum/, Waves],
  [/heat/, Flame],
  [/star|twinkle|sparkle/, Star],
  [/digital|matrix/, Binary],
  [/rain/, CloudRain],
  [/band|stripe/, Rows3],
];

function effectIcon(effect: string): Icon {
  return EFFECT_ICONS.find(([pattern]) => pattern.test(effect))?.[1] ?? Sparkles;
}

// Consumer page (0x0C) usages that upstream draws as emoji. They are drawn as
// icons here, since the app does not use emoji.
const CONSUMER_PAGE = 0x0c;
const CONSUMER_ICONS: Record<
  number,
  Pick<BindingDisplay, "icon" | "badge" | "title">
> = {
  0x6f: { icon: Sun, badge: Plus, title: "Brightness Up" },
  0x70: { icon: Sun, badge: Minus, title: "Brightness Down" },
  0xcd: { icon: Play, badge: Pause, title: "Play/Pause" },
  0xe2: { icon: VolumeX, title: "Mute" },
  0xe9: { icon: Volume2, title: "Volume Up" },
  0xea: { icon: Volume1, title: "Volume Down" },
};

function consumerIcon(usage: number) {
  // The top byte of the usage holds implicit modifiers, as in HidUsageLabel.
  const page = (usage >> 16) & 0xff;
  return page === CONSUMER_PAGE ? CONSUMER_ICONS[usage & 0xffff] : undefined;
}

function findValue(
  layerIds: number[],
  value: number,
  values: BehaviorParameterValueDescription[] | undefined,
): BehaviorParameterValueDescription | undefined {
  return values?.find((v) => validateValue(layerIds, value, [v]));
}

function layerLabel(layers: LayerRef[], id: number): string {
  const index = layers.findIndex((l) => l.id === id);
  return layers[index]?.name || String(index >= 0 ? index : id);
}

function buildContext(
  binding: BehaviorBinding,
  behavior: GetBehaviorDetailsResponse | undefined,
  layers: LayerRef[],
): Context {
  const layerIds = layers.map((l) => l.id);
  const sets = behavior?.metadata ?? [];
  const set = sets.find((s) => validateValue(layerIds, binding.param1, s.param1));
  const p1 = findValue(layerIds, binding.param1, set?.param1);
  const p2 = findValue(layerIds, binding.param2, set?.param2);
  const rawName = behavior?.displayName ?? "Unknown";

  return {
    rawName,
    name: rawName.toLowerCase(),
    param1: binding.param1,
    param2: binding.param2,
    p1,
    p2,
    p1Name: (p1?.name ?? "").toLowerCase(),
    layers,
  };
}

function describe(ctx: Context): string {
  const detail: string[] = [];

  if (ctx.p1?.layerId) {
    detail.push(layerLabel(ctx.layers, ctx.param1));
  } else if (ctx.p1 && !ctx.p1.hidUsage && ctx.p1.name) {
    detail.push(ctx.p1.name);
  }

  if (ctx.p2?.range) {
    detail.push(String(ctx.param2));
  }

  return detail.length ? `${ctx.rawName}: ${detail.join(" ")}` : ctx.rawName;
}

function lightingDisplay(ctx: Context): Part | undefined {
  const p = ctx.p1Name;
  const lightingBehavior = /rgb|underglow|backlight/.test(ctx.name);
  const lightingParameter =
    /hue|saturation|brightness|duration|speed|effect|reset settings|set color/.test(
      p,
    );

  if (!lightingBehavior && !lightingParameter) {
    return undefined;
  }

  const header = /rgb/.test(ctx.name) ? "RGB" : undefined;
  const up = /\b(up|increase)\b/.test(p);
  const down = /\b(down|decrease)\b/.test(p);
  const sign = up ? Plus : down ? Minus : undefined;

  if (/toggle/.test(p)) return { header, icon: Power, text: "on/off" };
  if (/turn on/.test(p)) return { header, icon: Lightbulb, text: "on" };
  if (/turn off/.test(p)) return { header, icon: LightbulbOff, text: "off" };
  if (/hue/.test(p)) return { header, icon: Palette, badge: sign, text: "hue" };
  if (/saturation/.test(p)) {
    return { header, icon: Droplet, badge: sign, text: "sat" };
  }
  if (/cycle brightness/.test(p)) {
    return { header, icon: Sun, badge: RefreshCw, text: "bri" };
  }
  if (/set brightness/.test(p)) {
    return { header, icon: Sun, text: String(ctx.param2) };
  }
  if (/brightness/.test(p)) {
    return { header, icon: Sun, badge: sign, text: "bri" };
  }
  if (/duration/.test(p)) {
    return { header, icon: Timer, badge: sign, text: "time" };
  }
  if (/speed/.test(p)) {
    return { header, icon: Gauge, badge: sign, text: "speed" };
  }
  if (/next effect/.test(p)) {
    return { header, icon: Sparkles, badge: ChevronRight, text: "effect" };
  }
  if (/previous effect/.test(p)) {
    return { header, icon: Sparkles, badge: ChevronLeft, text: "effect" };
  }
  if (/reset settings/.test(p)) {
    return { header, icon: RotateCcw, text: "reset" };
  }
  if (/set color/.test(p)) return { header, icon: Paintbrush, text: "color" };

  return undefined;
}

function bluetoothDisplay(ctx: Context): Part {
  const p = ctx.p1Name;

  // Match the start of the name: "Clear Selected Profile" also contains "select".
  if (p.startsWith("clear all")) {
    return { icon: Bluetooth, badge: Trash2, text: "all" };
  }
  if (p.startsWith("clear")) {
    return { icon: Bluetooth, badge: Eraser, text: "clear" };
  }
  if (p.startsWith("disconnect")) {
    return { icon: BluetoothOff, badge: Unplug, text: String(ctx.param2) };
  }
  if (p.startsWith("select")) {
    return { icon: Bluetooth, text: String(ctx.param2) };
  }
  if (p.startsWith("next")) return { icon: Bluetooth, badge: ChevronRight };
  if (p.startsWith("previous")) return { icon: Bluetooth, badge: ChevronLeft };

  return { icon: Bluetooth, text: ctx.p1?.name };
}

function outputDisplay(ctx: Context): Part {
  const p = ctx.p1Name;

  if (/toggle/.test(p)) return { icon: ArrowLeftRight, text: "usb/ble" };
  if (/no output|none/.test(p)) return { icon: CircleSlash };
  if (/\busb\b/.test(p)) return { icon: Usb };
  if (/\bble\b|bluetooth/.test(p)) return { icon: Bluetooth };

  return { icon: ArrowLeftRight, text: ctx.p1?.name };
}

function specialDisplay(ctx: Context): Part | undefined {
  const layer = layerLabel(ctx.layers, ctx.param1);

  switch (ctx.name) {
    case "momentary layer":
      return { icon: Layers, text: layer };
    case "toggle layer":
      return { icon: ToggleRight, text: layer };
    case "to layer":
      return { icon: ArrowRightToLine, text: layer };
    case "sticky layer":
      return { icon: Pin, text: layer };
    case "layer-tap":
      return { icon: Layers, text: layer, hid: [ctx.param2] };
    case "mod-tap":
      return { hid: [ctx.param2, ctx.param1] };
    case "sticky key":
      return { icon: Pin, hid: [ctx.param1] };
    case "key toggle":
      return { icon: ToggleRight, hid: [ctx.param1] };
    case "key repeat":
      return { icon: Repeat };
    case "grave/escape":
      return { text: "`/Esc" };
    case "bluetooth":
      return bluetoothDisplay(ctx);
    case "output selection":
      return outputDisplay(ctx);
    case "studio unlock":
      return { icon: LockOpen };
    case "caps word":
      return { icon: ArrowBigUpDash };
    case "transparent":
      return { icon: ChevronsDown, muted: true };
    case "none":
      return { icon: Ban, muted: true };
    case "reset":
      return { icon: RotateCcw };
    case "bootloader":
      return { icon: Download };
    case "external power":
      return { icon: PlugZap, text: ctx.p1?.name };
    case "mouse key press":
      return { icon: MousePointerClick, text: ctx.p1?.name };
  }

  // Lighting effects are exposed as one behavior per effect, named after the
  // devicetree node (fx_solid, fx_breathe, ...).
  const effect = /^fx[_-](.+)$/.exec(ctx.name);
  if (effect) {
    const name = effect[1].replace(/[_-]+/g, " ");
    return { header: "Effect", icon: effectIcon(name), text: name };
  }

  return lightingDisplay(ctx);
}

function genericDisplay(ctx: Context): Part {
  const hid: number[] = [];
  const text: string[] = [];

  for (const [description, value] of [
    [ctx.p1, ctx.param1],
    [ctx.p2, ctx.param2],
  ] as const) {
    if (!description) {
      continue;
    }

    if (description.hidUsage) {
      hid.push(value);
    } else if (description.layerId) {
      text.push(layerLabel(ctx.layers, value));
    } else if (description.range) {
      text.push(String(value));
    } else if (description.constant !== undefined && description.name) {
      text.push(description.name);
    }
  }

  // A key press of a media key (volume, play/pause, ...) is drawn as an icon.
  const media = hid.length === 1 && !text.length ? consumerIcon(hid[0]) : undefined;
  if (media) {
    return { ...media };
  }

  return { hid, text: text.join(" ") || undefined };
}

export function getBindingDisplay(
  binding: BehaviorBinding,
  behavior: GetBehaviorDetailsResponse | undefined,
  layers: LayerRef[],
): BindingDisplay {
  // The behavior details arrive after the keymap. Until then, draw the label
  // upstream draws (the first parameter as a HID usage) so keys do not flash
  // empty on connect.
  if (!behavior) {
    return { hid: [binding.param1], title: "Unknown" };
  }

  const ctx = buildContext(binding, behavior, layers);
  const display = specialDisplay(ctx) ?? genericDisplay(ctx);

  return { ...display, title: display.title ?? describe(ctx) };
}
