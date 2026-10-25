/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The switch of the header between the Keys tab (the keymap editor of ZMK
 * Studio), the Lights tab, the Display tab (the settings of the screens), the
 * OLED tab (what the screens show and where), the Files tab (save everything to
 * a file, or apply a file) and the Diagnostics tab (the firmware and its memory,
 * and the state of the keyboard).
 */
import type { ComponentType } from "react";
import {
  Activity,
  FolderOpen,
  Keyboard,
  LayoutPanelLeft,
  Lightbulb,
  Monitor,
  type LucideProps,
} from "lucide-react";
import { availableViews, type AppView, type ViewOffers } from "./appViews";

export interface ViewSwitchProps {
  view: AppView;
  onChange: (view: AppView) => void;
  /** The tabs the keyboard has something for (the Keys tab is always there). */
  offers: ViewOffers;
}

const VIEWS: Record<
  AppView,
  { label: string; Icon: ComponentType<LucideProps> }
> = {
  keys: { label: "Keys", Icon: Keyboard },
  lights: { label: "Lights", Icon: Lightbulb },
  display: { label: "Display", Icon: Monitor },
  oled: { label: "OLED", Icon: LayoutPanelLeft },
  files: { label: "Files", Icon: FolderOpen },
  diagnostics: { label: "Diagnostics", Icon: Activity },
};

export const ViewSwitch = ({ view, onChange, offers }: ViewSwitchProps) => {
  const offered = availableViews(offers);

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
