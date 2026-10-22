/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * A whole number the keyboard accepts, in a field. Shared by the panel of the
 * selected widget (position) and the editor of the crop of the picture.
 */
import { useId, useState } from "react";

interface Props {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}

/**
 * A whole number the keyboard accepts. What is typed goes to the keyboard as soon
 * as it is a number; the field shows what the keyboard has again when it loses
 * the focus (a value out of the range is held inside it). Without a draft the
 * field always shows the value it is given, so a drag, the arrows or another
 * widget never leave an old number in it.
 */
export const NumberField = ({
  label,
  hint,
  value,
  min,
  max,
  disabled,
  onCommit,
}: Props) => {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="opacity-70" title={hint}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className="w-20 rounded bg-base-100 px-2 py-1 tabular-nums"
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        disabled={disabled}
        aria-describedby={`${id}-range`}
        onChange={(e) => {
          setDraft(e.currentTarget.value);
          const wanted = e.currentTarget.valueAsNumber;
          if (Number.isFinite(wanted)) {
            onCommit(Math.round(wanted));
          }
        }}
        onBlur={() => setDraft(null)}
      />
      <span id={`${id}-range`} className="sr-only">
        From {min} to {max}
      </span>
    </div>
  );
};
