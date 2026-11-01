// Modified by the lenerdz/zmk-studio fork: a key on its own can carry what it prints with
// Shift held, above the label and dimmed (see shiftLegend.ts), a usage with the Shift of its
// own (LS(N1)) is drawn as what it prints, and the Return key and the spacebar read "Enter"
// and "Space" (see keyFace.ts).
import { useContext } from "react";
import { hid_usage_page_and_id_from_usage } from "../hid-usages";
import { faceLabels } from "./keyFace";
import { ShiftLayoutContext } from "./ShiftLayoutContext";
import { keyLegend, printedLabel } from "./shiftLegend";

export interface HidUsageLabelProps {
  hid_usage: number;
  /**
   * Draw what the key prints with Shift held above the label, dimmed. It is for
   * the label of a key on its own (BindingLabel passes it): a label drawn in a
   * column with others has no room above it.
   */
  legend?: boolean;
}

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

export const HidUsageLabel = ({
  hid_usage,
  legend: withLegend = false,
}: HidUsageLabelProps) => {
  const layout = useContext(ShiftLayoutContext);
  let [page, id] = hid_usage_page_and_id_from_usage(hid_usage);

  // Implicit modifiers other than Shift are not drawn (see keyLegend).
  page &= 0xff;

  const labels = faceLabels(page, id);
  const legend = keyLegend(hid_usage, layout);

  const label = (
    <span
      className="@[10em]:before:content-[attr(data-long-content)] @[6em]:before:content-[attr(data-med-content)] before:content-[attr(aria-label)]"
      aria-label={printedLabel(remove_prefix(labels.short), legend)}
      data-med-content={printedLabel(
        remove_prefix(labels.med || labels.short),
        legend
      )}
      data-long-content={printedLabel(
        remove_prefix(labels.long || labels.med || labels.short),
        legend
      )}
    />
  );

  if (!withLegend || legend.shifted === undefined) {
    return label;
  }

  // The label stays where it is on every key (in the middle); the legend sits
  // at the top, like the shifted sign on a keycap, dimmer and smaller.
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span
        data-shift-legend=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1 text-center text-[0.65rem] leading-none opacity-60"
      >
        {legend.shifted}
      </span>
      {label}
    </span>
  );
};
