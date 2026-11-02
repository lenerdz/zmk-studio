// Modified by the lenerdz/zmk-studio fork: the list of keys opens scrolled to the key
// that is set, in the middle of the list, instead of at its top (see UsageList below
// and ./listScroll.ts).
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Collection,
  ComboBox,
  ComboBoxStateContext,
  Header,
  Input,
  Key,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Section,
} from "react-aria-components";
import {
  hid_usage_from_page_and_id,
  hid_usage_page_get_ids,
} from "../hid-usages";
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { ChevronDown } from "lucide-react";
import { scrollSelectedToCenter } from "./listScroll";

export interface HidUsagePage {
  id: number;
  min?: number;
  max?: number;
}

export interface HidUsagePickerProps {
  label?: string;
  value?: number;
  usagePages: HidUsagePage[];
  onValueChanged: (value?: number) => void;
}

type UsageSectionProps = HidUsagePage;

const UsageSection = ({ id, min, max }: UsageSectionProps) => {
  const info = useMemo(() => hid_usage_page_get_ids(id), [id]);

  let usages = useMemo(() => {
    let usages = info?.UsageIds || [];
    if (max || min) {
      usages = usages.filter(
        (i) =>
          (i.Id <= (max || Number.MAX_SAFE_INTEGER) && i.Id >= (min || 0)) ||
          (id === 7 && i.Id >= 0xe0 && i.Id <= 0xe7)
      );
    }

    return usages;
  }, [id, min, max, info]);

  return (
    <Section id={id}>
      <Header className="text-base-content/50">{info?.Name}</Header>
      <Collection items={usages}>
        {(i) => (
          <ListBoxItem
            className="rac-hover:bg-base-300 pl-3 relative rac-focus:bg-base-300 cursor-default select-none rac-selected:before:content-['✔'] before:absolute before:left-[0] before:top-[0]"
            id={hid_usage_from_page_and_id(id, i.Id)}
          >
            {i.Name}
          </ListBoxItem>
        )}
      </Collection>
    </Section>
  );
};

interface UsageListProps {
  usagePages: HidUsagePage[];
  // True while the list is open because the user typed in the box (see below).
  openedByTyping: { current: boolean };
}

// The list of keys. It is in the page only while it is open, so each time it opens it
// is built again and the first effect below runs.
//
// React Aria scrolls to the key that is set only when the list is opened with the
// keyboard (Arrow Down). Opened with the mouse, the list stayed at its top, and the key
// that is set was one among six hundred, out of sight. So it is brought to the middle
// here, unless the list was opened by typing: then the keys that match what was typed
// are shown from the top.
const UsageList = ({ usagePages, openedByTyping }: UsageListProps) => {
  const list = useRef<HTMLDivElement>(null);
  const typed = useContext(ComboBoxStateContext)?.inputValue;
  const lastTyped = useRef(typed);

  useLayoutEffect(() => {
    if (list.current && !openedByTyping.current) {
      scrollSelectedToCenter(list.current);
    }
  }, [openedByTyping]);

  // Typing while the list is open filters it: show the matches from the top again.
  useLayoutEffect(() => {
    if (typed !== lastTyped.current) {
      lastTyped.current = typed;
      if (list.current) {
        list.current.scrollTop = 0;
      }
    }
  }, [typed]);

  return (
    <ListBox
      ref={list}
      items={usagePages}
      className="block max-h-[30vh] min-h-[unset] overflow-auto p-2"
      selectionMode="single"
    >
      {({ id, min, max }) => <UsageSection id={id} min={min} max={max} />}
    </ListBox>
  );
};

enum Mods {
  LeftControl = 0x01,
  LeftShift = 0x02,
  LeftAlt = 0x04,
  LeftGUI = 0x08,
  RightControl = 0x10,
  RightShift = 0x20,
  RightAlt = 0x40,
  RightGUI = 0x80,
}

const mod_labels: Record<Mods, string> = {
  [Mods.LeftControl]: "L Ctrl",
  [Mods.LeftShift]: "L Shift",
  [Mods.LeftAlt]: "L Alt",
  [Mods.LeftGUI]: "L GUI",
  [Mods.RightControl]: "R Ctrl",
  [Mods.RightShift]: "R Shift",
  [Mods.RightAlt]: "R Alt",
  [Mods.RightGUI]: "R GUI",
};

const all_mods = [
  Mods.LeftControl,
  Mods.LeftShift,
  Mods.LeftAlt,
  Mods.LeftGUI,
  Mods.RightControl,
  Mods.RightShift,
  Mods.RightAlt,
  Mods.RightGUI,
];

function mods_to_flags(mods: Mods[]): number {
  return mods.reduce((a, v) => a + v, 0);
}

function mask_mods(value: number) {
  return value & ~(mods_to_flags(all_mods) << 24);
}

export const HidUsagePicker = ({
  label,
  value,
  usagePages,
  onValueChanged,
}: HidUsagePickerProps) => {
  const mods = useMemo(() => {
    let flags = value ? value >> 24 : 0;

    return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
  }, [value]);

  const selectionChanged = useCallback(
    (e: Key | null) => {
      let value = typeof e == "number" ? e : undefined;
      if (value !== undefined) {
        let mod_flags = mods_to_flags(mods.map((m) => parseInt(m)));
        value = value | (mod_flags << 24);
      }

      onValueChanged(value);
    },
    [onValueChanged, mods]
  );

  // How the list was opened. The combo box says it when it opens the list: "manual" for
  // the button and the arrow keys, "input" for typing. The list scrolls to the key that
  // is set only in the first case (see UsageList).
  const openedByTyping = useRef(false);
  const openChanged = useCallback((isOpen: boolean, trigger?: string) => {
    if (isOpen) {
      openedByTyping.current = trigger === "input";
    }
  }, []);

  const modifiersChanged = useCallback(
    (m: string[]) => {
      if (!value) {
        return;
      }

      let mod_flags = mods_to_flags(m.map((m) => parseInt(m)));
      let new_value = mask_mods(value) | (mod_flags << 24);
      onValueChanged(new_value);
    },
    [value]
  );

  return (
    <div className="flex gap-2 relative">
      {label && <Label id="hid-usage-picker">{label}:</Label>}
      <ComboBox
        selectedKey={value ? mask_mods(value) : null}
        onSelectionChange={selectionChanged}
        onOpenChange={openChanged}
        aria-labelledby="hid-usage-picker"
      >
        <div className="flex">
          <Input className="p-1 rounded-l" />
          <Button className="rounded-r bg-primary text-primary-content w-8 h-8 flex justify-center items-center">
            <ChevronDown className="size-4" />
          </Button>
        </div>
        <Popover className="w-[var(--trigger-width)] max-h-4 shadow-md text-base-content rounded border-base-content bg-base-100">
          <UsageList usagePages={usagePages} openedByTyping={openedByTyping} />
        </Popover>
      </ComboBox>
      <CheckboxGroup
        aria-label="Implicit Modifiers"
        className="grid grid-flow-col gap-x-px auto-cols-[minmax(min-content,1fr)] content-stretch divide-x rounded-md"
        value={mods}
        onChange={modifiersChanged}
      >
        {all_mods.map((m) => (
          <Checkbox
            key={m}
            value={m.toLocaleString()}
            className="text-nowrap cursor-pointer grid px-2 content-center justify-center rac-selected:bg-primary border-base-100 bg-base-300 hover:bg-base-100 first:rounded-s-md last:rounded-e-md rac-selected:text-primary-content"
          >
            {mod_labels[m]}
          </Checkbox>
        ))}
      </CheckboxGroup>
    </div>
  );
};
