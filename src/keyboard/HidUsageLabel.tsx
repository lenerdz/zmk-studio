// Modified by the lenerdz/zmk-studio fork: what the key prints with Shift held is drawn
// in parentheses after the label, and a usage with the Shift of its own (LS(N1)) is
// drawn as what it prints (see shiftLegend.ts).
import { useContext } from "react";
import {
  hid_usage_get_labels,
  hid_usage_page_and_id_from_usage,
} from "../hid-usages";
import { ShiftLayoutContext } from "./ShiftLayoutContext";
import { keyLegend, withShiftLegend } from "./shiftLegend";

export interface HidUsageLabelProps {
  hid_usage: number;
}

function remove_prefix(s?: string) {
  return s?.replace(/^Keyboard /, "");
}

export const HidUsageLabel = ({ hid_usage }: HidUsageLabelProps) => {
  const layout = useContext(ShiftLayoutContext);
  let [page, id] = hid_usage_page_and_id_from_usage(hid_usage);

  // Implicit modifiers other than Shift are not drawn (see keyLegend).
  page &= 0xff;

  let labels = hid_usage_get_labels(page, id);
  const legend = keyLegend(hid_usage, layout);

  return (
    <span
      className="@[10em]:before:content-[attr(data-long-content)] @[6em]:before:content-[attr(data-med-content)] before:content-[attr(aria-label)]"
      aria-label={withShiftLegend(remove_prefix(labels.short), legend)}
      data-med-content={withShiftLegend(
        remove_prefix(labels.med || labels.short),
        legend
      )}
      data-long-content={withShiftLegend(
        remove_prefix(labels.long || labels.med || labels.short),
        legend
      )}
    />
  );
};
