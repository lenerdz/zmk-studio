// Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
// Studio.
//
// Generates two files of the Lights tab from config/led_colors.dtsi of
// lenerdz/corne-zmk:
//
//   src/lights/dtsiTemplate.ts     the start of that file (the explanation, the
//                                  palette and the LED_SLOTS macros), which the
//                                  "Export led_colors.dtsi" button writes before
//                                  the block of each layer
//   src/lights/demo/demoColors.ts  the colors the demo keyboard starts with
//
// Usage (from the root of this repository):
//
//   node scripts/generate-led-data.mjs <path to led_colors.dtsi>
//
// The colors are read after the C preprocessor expanded the palette names and
// LED_SLOTS, which is what the devicetree compiler sees. The preprocessor is
// `cc` from the PATH (gcc and clang work); set CPP to use another one:
//
//   CPP="zig cc" node scripts/generate-led-data.mjs <path>
//
// Run it again whenever that file changes, then run "npm test": the tests read
// the exporter's output back and compare it with the demo colors.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The label of the effect that holds the map of each layer id: the layer-id of
// each node in config/corne.keymap. src/lights/exportDtsi.ts has the same list.
const LAYER_IDS = {
  fx_static: 0,
  map_fn1: 1,
  map_raise: 2,
  map_nav: 3,
  map_sys: 4,
  map_media: 5,
  map_steno: 6,
  map_gemini: 7,
};
const SLOTS = 54;

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/generate-led-data.mjs <path to led_colors.dtsi>");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(input), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------- the template

const firstLayer = source.indexOf("/* Camada 0");
if (firstLayer < 0) {
  console.error('Could not find the block of the first layer ("/* Camada 0").');
  process.exit(1);
}

const header = source.slice(0, firstLayer).trimEnd() + "\n";
if (header.includes("`") || header.includes("${")) {
  // The header goes inside a String.raw template literal.
  console.error("The start of the file has a backtick or ${, which the template cannot hold.");
  process.exit(1);
}

const template = `/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * GENERATED, do not edit by hand (scripts/generate-led-data.mjs). The part of
 * config/led_colors.dtsi of lenerdz/corne-zmk that does not depend on the
 * colors: the explanation, the palette and the LED_SLOTS macros. It is a copy of
 * the start of that file (everything before the block of the first layer); the
 * exported file is this text followed by the block of each layer.
 */
export const DTSI_HEADER = String.raw\`${header}\`;
`;

// ------------------------------------------------------------------ the colors

const temp = mkdtempSync(join(tmpdir(), "led-data-"));
let expanded;
try {
  const file = join(temp, "led_colors.dtsi");
  writeFileSync(file, source);

  const [command, ...commandArgs] = (process.env.CPP ?? "cc").split(/\s+/);
  expanded = execFileSync(
    command,
    [
      ...commandArgs,
      "-E",
      "-P",
      "-x",
      "assembler-with-cpp",
      "-nostdinc",
      "-undef",
      file,
    ],
    { encoding: "utf8" },
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const maps = {};
const block = /&(\w+)\s*\{\s*slot-colors\s*=\s*<([^>]*)>\s*;\s*\}\s*;/g;
for (const [, label, values] of expanded.matchAll(block)) {
  maps[label] = values.trim().split(/\s+/).map(Number);
}

const found = Object.keys(maps).sort().join(" ");
const wanted = Object.keys(LAYER_IDS).sort().join(" ");
if (found !== wanted) {
  console.error(`Expected the maps "${wanted}" but found "${found}".`);
  process.exit(1);
}
for (const [label, colors] of Object.entries(maps)) {
  if (colors.length !== SLOTS || colors.some((c) => !Number.isInteger(c))) {
    console.error(`The map ${label} has ${colors.length} values, not ${SLOTS} colors.`);
    process.exit(1);
  }
}

const hex = (value) => "0x" + value.toString(16).padStart(6, "0");
const layers = Object.entries(LAYER_IDS)
  .sort(([, a], [, b]) => a - b)
  .map(([label, id]) => {
    const rows = [];
    for (let row = 0; row < SLOTS; row += 6) {
      rows.push(`    ${maps[label].slice(row, row + 6).map(hex).join(", ")},`);
    }
    return `  // ${label}\n  ${id}: [\n${rows.join("\n")}\n  ],`;
  });

const demoColors = `/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * GENERATED, do not edit by hand (scripts/generate-led-data.mjs). The default
 * colors of the demo keyboard: the slot colors of config/led_colors.dtsi in
 * lenerdz/corne-zmk (after the C preprocessor expanded LED_SLOTS), by layer id.
 * See src/lights/demo/README.md.
 */
export const DEMO_DEFAULT_COLORS: Readonly<Record<number, readonly number[]>> = {
${layers.join("\n")}
};
`;

// ---------------------------------------------------------------------- output

const outputs = {
  "src/lights/dtsiTemplate.ts": template,
  "src/lights/demo/demoColors.ts": demoColors,
};
for (const [path, text] of Object.entries(outputs)) {
  writeFileSync(join(root, path), text);
  console.log("written", path);
}
