import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Keymap } from "./Keymap";
import { corneBehaviors, corneKeymap, corneLayout } from "./corne.mock";

// The keymap of a Corne running https://github.com/lenerdz/corne-zmk, one story
// per layer. It shows how each behavior is drawn: key presses as text, and
// layers, Bluetooth, lighting effects and the like with an icon.
const meta = {
  title: "Keyboard/Keymap (Corne)",
  component: Keymap,
  parameters: {
    layout: "centered",
  },
  args: {
    layout: corneLayout,
    keymap: corneKeymap,
    behaviors: corneBehaviors,
    scale: 1,
    selectedLayerIndex: 0,
    selectedKeyPosition: undefined,
    onKeyPositionClicked: fn(),
  },
} satisfies Meta<typeof Keymap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Qwerty: Story = {
  args: { selectedLayerIndex: 0 },
};

export const Fn1: Story = {
  args: { selectedLayerIndex: 1 },
};

export const Raise: Story = {
  args: { selectedLayerIndex: 2 },
};

export const Nav: Story = {
  args: { selectedLayerIndex: 3 },
};

export const Sys: Story = {
  args: { selectedLayerIndex: 4 },
};

export const Media: Story = {
  args: { selectedLayerIndex: 5 },
};

export const SelectedKey: Story = {
  args: { selectedLayerIndex: 4, selectedKeyPosition: 14 },
};
