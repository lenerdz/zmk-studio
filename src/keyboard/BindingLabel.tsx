/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { ArrowBigUp } from "lucide-react";
import { HidUsageLabel } from "./HidUsageLabel";
import type { BindingDisplay } from "./bindingDisplay";
import { shiftName, shiftSide, shiftTitle, type ShiftSide } from "./keyFace";

export interface BindingLabelProps {
  display: BindingDisplay;
}

// Long names get a smaller type so they fit the key instead of being cut off.
function textSize(text: string) {
  if (text.length <= 6) {
    return "text-[0.65rem]";
  }

  return text.length <= 9 ? "text-[0.55rem]" : "text-[0.5rem]";
}

// A Shift key on its own: an up arrow with its name under it. The key has no
// header above (a key press has none), so the pair sits in the middle.
const ShiftKeyFace = ({ side }: { side: ShiftSide }) => (
  <div
    data-shift-key={side}
    className="flex flex-col items-center justify-center gap-0.5 max-w-full px-0.5 leading-none"
    title={shiftTitle(side)}
  >
    <ArrowBigUp size={16} strokeWidth={2} aria-hidden="true" />
    <span className="text-[0.65rem]">{shiftName(side)}</span>
  </div>
);

export const BindingLabel = ({ display }: BindingLabelProps) => {
  const { icon: Icon, badge: Badge, text, hid = [], muted, title } = display;

  // A plain key press keeps the label upstream draws, with what it prints with
  // Shift held above it; the Shift keys themselves get an arrow.
  if (!Icon && !text && hid.length === 1 && !muted) {
    const side = shiftSide(hid[0]);

    return side ? (
      <ShiftKeyFace side={side} />
    ) : (
      <HidUsageLabel hid_usage={hid[0]} legend />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 max-w-full px-0.5 mt-3 leading-none ${
        muted ? "opacity-50" : ""
      }`}
      title={title}
    >
      {Icon && (
        <div className="flex items-center gap-px">
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
          {Badge && <Badge size={10} strokeWidth={3} aria-hidden="true" />}
        </div>
      )}
      {hid.map((usage, index) => (
        <span key={index} className="text-xs">
          <HidUsageLabel hid_usage={usage} />
        </span>
      ))}
      {text && (
        <span className={`${textSize(text)} max-w-full truncate`}>{text}</span>
      )}
    </div>
  );
};
