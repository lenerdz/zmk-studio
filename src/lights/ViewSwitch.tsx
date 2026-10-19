/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The switch of the header between the Keys tab (the keymap editor of ZMK
 * Studio) and the Lights tab.
 */
import type { ComponentType } from "react";
import { Keyboard, Lightbulb, type LucideProps } from "lucide-react";

export type AppView = "keys" | "lights";

export interface ViewSwitchProps {
  view: AppView;
  onChange: (view: AppView) => void;
  /** The Lights tab only exists for a keyboard that has light maps. */
  lightsAvailable: boolean;
}

const VIEWS: Array<{
  id: AppView;
  label: string;
  Icon: ComponentType<LucideProps>;
}> = [
  { id: "keys", label: "Keys", Icon: Keyboard },
  { id: "lights", label: "Lights", Icon: Lightbulb },
];

export const ViewSwitch = ({
  view,
  onChange,
  lightsAvailable,
}: ViewSwitchProps) => {
  if (!lightsAvailable) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="View"
      className="flex items-center gap-0.5 ml-3 rounded bg-base-200 p-0.5"
    >
      {VIEWS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          className={`flex items-center gap-1 rounded px-2 py-0.5 ${
            view === id
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
          onClick={() => onChange(id)}
        >
          <Icon className="w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
};
