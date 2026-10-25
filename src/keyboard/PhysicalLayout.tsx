// Modified by the lenerdz/zmk-studio fork: a key can be dragged onto another key, also
// on another layer (see keyDrag.ts and useKeyDrag.ts).
import {
  CSSProperties,
  PropsWithChildren,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Key } from "./Key";
import { KeyDragGhost } from "./KeyDragGhost";
import { type Drop, ghostTag, layerToOpen } from "./keyDrag";
import { useKeyDrag } from "./useKeyDrag";

export type KeyPosition = PropsWithChildren<{
  id: string;
  header?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
}>;

export type LayoutZoom = number | "auto";

export function deserializeLayoutZoom(value: string): LayoutZoom {
  if (value === "auto") {
    return "auto";
  }
  return parseFloat(value) || "auto";
}

interface PhysicalLayoutProps {
  positions: Array<KeyPosition>;
  selectedPosition?: number;
  oneU?: number;
  hoverZoom?: boolean;
  zoom?: LayoutZoom;
  onPositionClicked?: (position: number) => void;
  /** A key was dragged onto another one. Dragging is off when this is not given. */
  onPositionDropped?: (drop: Drop) => void;
  /** The id of the layer these keys belong to, when they belong to one. */
  layerId?: number;
  /** The name of that layer, for the tag of a key dragged from another layer. */
  layerName?: string;
  /**
   * The dragged key is over a layer of the list (its id), or over none
   * (undefined, also when the drag ends).
   */
  onDragLayerOver?: (layerId: number | undefined) => void;
  /** A drag ended without a drop; `fromLayer` is the layer the key came from. */
  onDragAbort?: (fromLayer: number | undefined) => void;
}

interface PhysicalLayoutPositionLocation {
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
}

function scalePosition(
  { x, y, r, rx, ry }: PhysicalLayoutPositionLocation,
  oneU: number,
): CSSProperties {
  let left = x * oneU;
  let top = y * oneU;
  let transformOrigin = undefined;
  let transform = undefined;
  const transformStyle = "preserve-3d";

  if (r) {
    // Use `??` so an explicit rotation origin of 0 is honored; `rx || x`
    // collapsed a legitimate 0 back to the key's own position, pivoting the
    // key around its own corner instead of the layout origin (#97).
    let transformX = ((rx ?? x) - x) * oneU;
    let transformY = ((ry ?? y) - y) * oneU;
    transformOrigin = `${transformX}px ${transformY}px`;
    transform = `rotate(${r}deg)`;
  }

  return {
    top,
    left,
    transformOrigin,
    transform,
    transformStyle,
  };
}

export const PhysicalLayout = ({
  positions,
  selectedPosition,
  oneU = 48,
  onPositionClicked,
  onPositionDropped,
  layerId,
  layerName,
  onDragLayerOver,
  onDragAbort,
  ...props
}: PhysicalLayoutProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useKeyDrag({
    onDrop: onPositionDropped,
    layerId,
    onLayerOver: onDragLayerOver,
    onAbort: onDragAbort,
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const parent = element.parentElement;
    if (!parent) return;

    const calculateScale = () => {
      if (props.zoom === "auto") {
        const padding = Math.min(window.innerWidth, window.innerHeight) * 0.05; // Padding when in auto mode
        const newScale = Math.min(
          parent.clientWidth / (element.clientWidth + 2 * padding),
          parent.clientHeight / (element.clientHeight + 2 * padding),
        );
        setScale(newScale);
      } else {
        setScale(props.zoom || 1);
      }
    };

    calculateScale(); // Initial calculation

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(element);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [props.zoom]);

  // TODO: Add a bit of padding for rotation when supported
  let rightMost = positions
    .map((k) => k.x + k.width)
    .reduce((a, b) => Math.max(a, b), 0);
  let bottomMost = positions
    .map((k) => k.y + k.height)
    .reduce((a, b) => Math.max(a, b), 0);

  const dragged = drag.state.phase === "dragging" ? drag.state : undefined;

  // The copy that follows the pointer keeps what the key looked like when it was
  // picked up: the layer on the screen can change while the key is held, and the
  // key at the same position of the new layer is not the one in the hand.
  const grabbed = useRef<{ key: KeyPosition; layerName?: string }>();
  if (!dragged) {
    grabbed.current = undefined;
  } else if (!grabbed.current && positions[dragged.from]) {
    grabbed.current = { key: positions[dragged.from], layerName };
  }
  const draggedKey = grabbed.current?.key;

  // The dragged key belongs to another layer than the one on the screen: its
  // position here is another key, and a drop on it crosses layers.
  const fromOtherLayer = dragged !== undefined && dragged.fromLayer !== layerId;
  // The pointer is over a layer of the list that is not the one on the screen.
  const opening =
    dragged !== undefined && layerToOpen(dragged.overLayer, layerId) !== undefined;

  const positionItems = positions.map((p, idx) => (
    <div
      key={p.id}
      className="absolute hover:z-10"
      style={scalePosition(p, oneU)}
    >
      <div
        data-key-position={idx}
        onPointerDown={(e) => drag.press(idx, e)}
        onClick={() => {
          // The click that ends a drag is not a click on the key.
          if (!drag.consumeClick()) {
            onPositionClicked?.(idx);
          }
        }}
      >
        <Key
          oneU={oneU}
          selected={idx === selectedPosition}
          dragging={dragged?.from === idx && !fromOtherLayer}
          dropMode={dragged?.over === idx ? dragged.mode : undefined}
          {...p}
        />
      </div>
    </div>
  ));

  return (
    <div
      className="relative"
      style={{
        height: bottomMost * oneU + "px",
        width: rightMost * oneU + "px",
        transform: `scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
      ref={ref}
      {...props}
    >
      {positionItems}
      {dragged && draggedKey && (
        <KeyDragGhost
          x={dragged.x}
          y={dragged.y}
          width={(draggedKey.width * oneU - 2) * scale}
          height={(draggedKey.height * oneU - 2) * scale}
          mode={dragged.mode}
          tag={ghostTag({
            mode: dragged.mode,
            droppable: dragged.over !== undefined,
            fromLayer: fromOtherLayer ? grabbed.current?.layerName : undefined,
            opening,
          })}
          droppable={dragged.over !== undefined}
          opening={opening}
        >
          {draggedKey.children}
        </KeyDragGhost>
      )}
    </div>
  );
};
