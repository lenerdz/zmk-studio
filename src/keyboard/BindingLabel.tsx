/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 */
import { HidUsageLabel } from "./HidUsageLabel";
import type { BindingDisplay } from "./bindingDisplay";

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

export const BindingLabel = ({ display }: BindingLabelProps) => {
  const { icon: Icon, badge: Badge, text, hid = [], muted, title } = display;

  // A plain key press keeps the label upstream draws, untouched.
  if (!Icon && !text && hid.length === 1 && !muted) {
    return <HidUsageLabel hid_usage={hid[0]} />;
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
