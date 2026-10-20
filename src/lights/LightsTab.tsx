/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The Lights tab: edit the color of every LED of every layer on a drawing of the
 * keyboard. The app shows the colors while you paint and sends each stroke to
 * the keyboard when it ends; the keyboard shows them at once, and keeps them in
 * its memory with the Save button of the header, like the keys.
 */
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  PaintBucket,
  Paintbrush,
  Pipette,
  RotateCcw,
} from "lucide-react";
import { BindingLabel } from "../keyboard/BindingLabel";
import { getBindingDisplay } from "../keyboard/bindingDisplay";
import {
  deserializeLayoutZoom,
  type LayoutZoom,
} from "../keyboard/PhysicalLayout";
import { useLocalStorageState } from "../misc/useLocalStorageState";
import { buildDtsi, canExportDtsi, type DtsiLayer } from "./exportDtsi";
import { bindingName } from "./keyNames";
import { LedBoard } from "./LedBoard";
import { PALETTE, hexToRgb, paletteName, rgbToHex } from "./ledColors";
import { buildLedSlots, type LedSlotView } from "./ledLayout";
import { LedMapsContext } from "./LedMapsContext";
import type { LedEntry } from "./ledProtocol";
import { useKeyboardView } from "./useKeyboardView";

type Tool = "paint" | "pick";

/** A color that was sent to the keyboard and is not in the maps yet. */
interface Pending {
  rgb: number;
  token: number;
}

interface Stroke {
  tool: Tool;
  layerId: number;
  rgb: number;
  token: number;
}

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const Notice = ({ children }: { children: ReactNode }) => (
  <div className="grid place-items-center bg-base-300 min-h-0 min-w-0 p-6 text-center">
    <div className="max-w-prose">{children}</div>
  </div>
);

export const LightsTab = () => {
  const leds = useContext(LedMapsContext);
  const { paint, restoreDefaults } = leds;
  const view = useKeyboardView();

  const [layerId, setLayerId] = useState<number | undefined>(undefined);
  const [color, setColor] = useState(0xffffff);
  // What is being typed in the hex field, while it is not a color of its own yet.
  const [hexDraft, setHexDraft] = useState<string | undefined>(undefined);

  const chooseColor = (rgb: number) => {
    setColor(rgb);
    setHexDraft(undefined);
  };
  const [tool, setTool] = useState<Tool>("paint");
  const [zoom, setZoom] = useLocalStorageState<LayoutZoom>(
    "ledBoardScale",
    "auto",
    { deserialize: deserializeLayoutZoom },
  );
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const stroke = useRef<Stroke | null>(null);
  const lastToken = useRef(0);

  // The layers that have a map, in the order of the keymap.
  const layers = useMemo(() => {
    const keymapLayers = view.keymap?.layers ?? [];
    const names = new Map(keymapLayers.map((l) => [l.id, l.name]));
    const ordered = keymapLayers
      .map((l) => l.id)
      .filter((id) => leds.layerIds.includes(id));
    const rest = leds.layerIds.filter((id) => !ordered.includes(id));

    return [...ordered, ...rest].map((id) => ({
      id,
      name: names.get(id) || `Layer ${id}`,
    }));
  }, [view.keymap, leds.layerIds]);

  useEffect(() => {
    if (layers.length === 0) return;

    if (layerId === undefined || !layers.some((l) => l.id === layerId)) {
      setLayerId(layers[0].id);
    }
  }, [layers, layerId]);

  const slots = useMemo(
    () =>
      view.layout && leds.slotCount
        ? buildLedSlots(view.layout, leds.slotCount)
        : [],
    [view.layout, leds.slotCount],
  );

  // The colors of the layer, with the edits that are on their way to the keyboard.
  const colors = useMemo(() => {
    if (layerId === undefined) return [];

    const shown = [...(leds.maps[layerId] ?? [])];
    for (const [key, edit] of Object.entries(pending)) {
      const [layer, slot] = key.split(":").map(Number);
      if (layer === layerId) {
        shown[slot] = edit.rgb;
      }
    }
    return shown;
  }, [leds.maps, pending, layerId]);

  // What each key does on the layer, to write it on the key.
  const labels = useMemo(() => {
    const keymap = view.keymap;
    const layer = keymap?.layers.find((l) => l.id === layerId);
    if (!keymap || !layer) return undefined;

    const result: Record<number, ReactNode> = {};
    layer.bindings.forEach((binding, position) => {
      const behavior = view.behaviors[binding.behaviorId];
      if (behavior) {
        result[position] = (
          <BindingLabel
            display={getBindingDisplay(binding, behavior, keymap.layers)}
          />
        );
      }
    });
    return result;
  }, [view.keymap, view.behaviors, layerId]);

  const preview = useCallback(
    (layer: number, slotList: number[], rgb: number, token: number) => {
      setPending((previous) => {
        const next = { ...previous };
        for (const slot of slotList) {
          next[`${layer}:${slot}`] = { rgb, token };
        }
        return next;
      });
    },
    [],
  );

  const commit = useCallback(
    async (layer: number, entries: LedEntry[], token: number) => {
      try {
        setProblem(undefined);
        await paint(layer, entries);
      } catch (e) {
        setProblem(`The colors could not be set: ${messageOf(e)}`);
      } finally {
        // The maps have the colors now (or the keyboard refused them).
        setPending((previous) => {
          const next = { ...previous };
          for (const { slot } of entries) {
            const key = `${layer}:${slot}`;
            if (next[key]?.token === token) {
              delete next[key];
            }
          }
          return next;
        });
      }
    },
    [paint],
  );

  const onStrokeStart = (slot: number) => {
    if (layerId === undefined) return;

    if (tool === "pick") {
      chooseColor(colors[slot] ?? 0);
      stroke.current = { tool, layerId, rgb: color, token: 0 };
      return;
    }

    const token = ++lastToken.current;
    stroke.current = { tool, layerId, rgb: color, token };
    preview(layerId, [slot], color, token);
  };

  const onStrokeMove = (slot: number) => {
    const current = stroke.current;
    if (!current || current.tool === "pick") return;

    preview(current.layerId, [slot], current.rgb, current.token);
  };

  const onStrokeEnd = (touched: number[]) => {
    const current = stroke.current;
    stroke.current = null;
    if (!current || current.tool === "pick") return;

    void commit(
      current.layerId,
      touched.map((slot) => ({ slot, rgb: current.rgb })),
      current.token,
    );
  };

  const fill = (include: (slot: LedSlotView) => boolean) => {
    if (layerId === undefined) return;

    const chosen = slots.filter(include).map((s) => s.slot);
    const token = ++lastToken.current;
    preview(layerId, chosen, color, token);
    void commit(
      layerId,
      chosen.map((slot) => ({ slot, rgb: color })),
      token,
    );
  };

  const restore = async () => {
    if (layerId === undefined) return;

    try {
      setProblem(undefined);
      await restoreDefaults(layerId);
    } catch (e) {
      setProblem(`The default colors could not be restored: ${messageOf(e)}`);
    }
  };

  const exportable = canExportDtsi(leds.slotCount, leds.layerIds);

  const exportDtsi = () => {
    const keymap = view.keymap;

    const dtsiLayers: DtsiLayer[] = leds.layerIds.map((id) => {
      const layer = keymap?.layers.find((l) => l.id === id);

      return {
        id,
        name: layer?.name || `Layer ${id}`,
        colors: leds.maps[id] ?? [],
        keyNames:
          layer && keymap
            ? layer.bindings.map((binding) =>
                bindingName(
                  binding,
                  view.behaviors[binding.behaviorId],
                  keymap.layers,
                ),
              )
            : [],
      };
    });

    download("led_colors.dtsi", buildDtsi(dtsiLayers));
  };

  if (leds.status === "idle") {
    return <Notice>Unlock the keyboard to edit its lights.</Notice>;
  }

  if (leds.status === "loading") {
    return <Notice>Reading the light maps from the keyboard...</Notice>;
  }

  if (leds.status === "unsupported") {
    return (
      <Notice>
        This firmware does not have editable light maps. They come with the
        zmk-rgb-matrix module of lenerdz and the zmk-studio-messages fork (see
        the README of this app).
      </Notice>
    );
  }

  if (leds.status === "error") {
    return (
      <Notice>
        The light maps could not be read from the keyboard: {leds.error}
      </Notice>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] bg-base-300 max-w-full min-w-0 min-h-0">
      <div className="p-2 flex flex-col gap-2 bg-base-200 row-span-2 min-w-[10rem]">
        <h2 className="px-1">Layers</h2>
        <ul className="flex flex-col gap-1">
          {layers.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                className={`w-full text-left rounded px-2 py-1 ${
                  layer.id === layerId
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
                aria-pressed={layer.id === layerId}
                onClick={() => setLayerId(layer.id)}
              >
                {layer.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-2 col-start-2 row-start-1 relative min-w-0 min-h-0 overflow-hidden">
        {slots.length > 0 && colors.length > 0 ? (
          <LedBoard
            slots={slots}
            colors={colors}
            labels={labels}
            zoom={zoom}
            picking={tool === "pick"}
            onStrokeStart={onStrokeStart}
            onStrokeMove={onStrokeMove}
            onStrokeEnd={onStrokeEnd}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <p>Reading the keyboard...</p>
          </div>
        )}
        <select
          className="absolute top-2 right-2 h-8 rounded px-2"
          aria-label="Zoom"
          value={zoom}
          onChange={(e) => setZoom(deserializeLayoutZoom(e.target.value))}
        >
          <option value="auto">Auto</option>
          <option value={0.25}>25%</option>
          <option value={0.5}>50%</option>
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>
      </div>

      <div className="p-2 col-start-2 row-start-2 bg-base-200 flex flex-col gap-2 max-h-[45vh] overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1">Color</span>
          {PALETTE.map((entry) => (
            <button
              key={entry.id}
              type="button"
              title={entry.name}
              aria-label={entry.name}
              aria-pressed={entry.rgb === color}
              className={`size-6 rounded border border-gray-500 ${
                entry.rgb === color ? "ring-2 ring-primary scale-110" : ""
              }`}
              style={{ backgroundColor: rgbToHex(entry.rgb) }}
              onClick={() => chooseColor(entry.rgb)}
            />
          ))}
          <input
            type="color"
            aria-label="Pick any color"
            title="Pick any color"
            className="h-6 w-8 cursor-pointer bg-transparent"
            value={rgbToHex(color)}
            onChange={(e) => chooseColor(hexToRgb(e.target.value) ?? color)}
          />
          <input
            type="text"
            aria-label="Color as hex"
            className="w-24 rounded px-2 py-0.5 font-mono"
            value={hexDraft ?? rgbToHex(color)}
            spellCheck={false}
            onChange={(e) => {
              setHexDraft(e.target.value);
              const rgb = hexToRgb(e.target.value);
              if (rgb !== undefined) {
                setColor(rgb);
              }
            }}
            onBlur={() => setHexDraft(undefined)}
          />
          <span className="px-1 opacity-70">
            {paletteName(color) ?? "Custom"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${BUTTON} ${tool === "paint" ? "ring-2 ring-primary" : ""}`}
            aria-pressed={tool === "paint"}
            onClick={() => setTool("paint")}
          >
            <Paintbrush className="w-4" aria-hidden="true" />
            Paint
          </button>
          <button
            type="button"
            className={`${BUTTON} ${tool === "pick" ? "ring-2 ring-primary" : ""}`}
            aria-pressed={tool === "pick"}
            title="Click an LED to take its color"
            onClick={() => setTool("pick")}
          >
            <Pipette className="w-4" aria-hidden="true" />
            Pick
          </button>

          <span className="px-1 ml-2">Fill</span>
          <button
            type="button"
            className={BUTTON}
            onClick={() => fill(() => true)}
          >
            <PaintBucket className="w-4" aria-hidden="true" />
            All
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => fill((s) => s.kind === "key")}
          >
            Keys
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => fill((s) => s.kind === "extra")}
          >
            Underglow
          </button>

          <button
            type="button"
            className={`${BUTTON} ml-2`}
            title="Put this layer back to the colors the firmware was built with"
            onClick={restore}
          >
            <RotateCcw className="w-4" aria-hidden="true" />
            Restore layer defaults
          </button>
          <button
            type="button"
            className={BUTTON}
            disabled={!exportable}
            title={
              exportable
                ? "Download these colors as config/led_colors.dtsi, to build them into the firmware"
                : "Only for the keyboard of lenerdz/corne-zmk: 54 LEDs per layer and layers 0 to 7"
            }
            onClick={exportDtsi}
          >
            <Download className="w-4" aria-hidden="true" />
            Export led_colors.dtsi
          </button>
        </div>

        <p className="px-1 opacity-70">
          Drag across the LEDs to paint them; the keyboard shows the colors when
          you let go. Round cells are the underglow LEDs.
          {leds.unsaved
            ? " The light changes are not saved: use Save (top right) to keep them after the keyboard restarts."
            : ""}
        </p>
        {problem && (
          <p role="alert" className="px-1 text-red-600">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
};
