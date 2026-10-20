/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The switch of the header between the Keys tab (the keymap editor of ZMK
 * Studio), the Lights tab and the Display tab (the settings of the screens).
 */
import type { ComponentType } from "react";
import { Keyboard, Lightbulb, Monitor, type LucideProps } from "lucide-react";
import { availableViews, type AppView } from "./appViews";

export interface ViewSwitchProps {
  view: AppView;
  onChange: (view: AppView) => void;
  /** The Lights tab only exists for a keyboard that has light maps. */
  lightsAvailable: boolean;
  /** The Display tab only exists for a keyboard that has display settings. */
  displayAvailable: boolean;
}

const VIEWS: Record<
  AppView,
  { label: string; Icon: ComponentType<LucideProps> }
> = {
  keys: { label: "Keys", Icon: Keyboard },
  lights: { label: "Lights", Icon: Lightbulb },
  display: { label: "Display", Icon: Monitor },
};

export const ViewSwitch = ({
  view,
  onChange,
  lightsAvailable,
  displayAvailable,
}: ViewSwitchProps) => {
  const offered = availableViews(lightsAvailable, displayAvailable);

  // With only the Keys tab there is nothing to switch to.
  if (offered.length < 2) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="View"
      className="flex items-center gap-0.5 ml-3 rounded bg-base-200 p-0.5"
    >
      {offered.map((id) => {
        const { label, Icon } = VIEWS[id];

        return (
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
        );
      })}
    </div>
  );
};
