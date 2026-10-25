// Modified by the lenerdz/zmk-studio fork: keys are drawn with BindingLabel, which
// adds icons and readable labels for behaviors that are not plain key presses, and a key
// can be dragged onto another one, also on another layer.
import {
  PhysicalLayout,
  Keymap as KeymapMsg,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import {
  LayoutZoom,
  PhysicalLayout as PhysicalLayoutComp,
} from "./PhysicalLayout";
import { BindingLabel } from "./BindingLabel";
import { getBindingDisplay } from "./bindingDisplay";
import type { Drop } from "./keyDrag";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface KeymapProps {
  layout: PhysicalLayout;
  keymap: KeymapMsg;
  behaviors: BehaviorMap;
  scale: LayoutZoom;
  selectedLayerIndex: number;
  selectedKeyPosition: number | undefined;
  onKeyPositionClicked: (keyPosition: number) => void;
  /** A key was dragged onto another one, of this layer or of the one it came from. */
  onKeyPositionDropped?: (drop: Drop) => void;
  /** The dragged key is over a layer of the list (its id), or over none. */
  onKeyDragLayerOver?: (layerId: number | undefined) => void;
  /** A drag ended without a drop; `fromLayer` is the layer the key came from. */
  onKeyDragAbort?: (fromLayer: number | undefined) => void;
}

export const Keymap = ({
  layout,
  keymap,
  behaviors,
  scale,
  selectedLayerIndex,
  selectedKeyPosition,
  onKeyPositionClicked,
  onKeyPositionDropped,
  onKeyDragLayerOver,
  onKeyDragAbort,
}: KeymapProps) => {
  if (!keymap.layers[selectedLayerIndex]) {
    return <></>;
  }

  const positions = layout.keys.map((k, i) => {
    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        header: "Unknown",
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
      };
    }

    const binding = keymap.layers[selectedLayerIndex].bindings[i];
    const behavior = behaviors[binding.behaviorId];
    const display = getBindingDisplay(binding, behavior, keymap.layers);

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      header: display.header ?? (behavior?.displayName || "Unknown"),
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: <BindingLabel display={display} />,
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={48}
      hoverZoom={true}
      zoom={scale}
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
      onPositionDropped={onKeyPositionDropped}
      layerId={keymap.layers[selectedLayerIndex].id}
      // The same name the list of layers shows.
      layerName={
        keymap.layers[selectedLayerIndex].name || String(selectedLayerIndex)
      }
      onDragLayerOver={onKeyDragLayerOver}
      onDragAbort={onKeyDragAbort}
    />
  );
};
