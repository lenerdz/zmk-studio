/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * The Files tab: everything the app edits (the keys, the colors of the lights and
 * the settings of the screens) saved into one file, and a file applied to the
 * keyboard. A file is shown as a plan first (what differs, what cannot be applied
 * and why) and nothing is written until the user says so. What is applied goes
 * through the undo of the app (see applyBackup.ts).
 */
import {
  useContext,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { FileDown, FileUp } from "lucide-react";
import { DisplayContext } from "../display/DisplayContext";
import { LedMapsContext } from "../lights/LedMapsContext";
import { useKeyboardView } from "../lights/useKeyboardView";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { UndoRedoContext } from "../undoRedo";
import { usePub } from "../usePubSub";
import {
  applyBackup,
  hasChanges,
  type ApplyReport,
  type Plans,
  type Section,
} from "./applyBackup";
import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from "./backupFile";
import {
  collectKeys,
  collectLights,
  collectScreens,
  planKeys,
  planLights,
  planScreens,
} from "./backupPlan";
import {
  count,
  describeKeys,
  describeLights,
  describeScreens,
  keysDetails,
  lightsDetails,
  screensDetails,
} from "./backupText";
import { downloadTextFile, readBackupText } from "./files";

const BUTTON =
  "flex items-center gap-1 rounded px-2 py-1 bg-base-100 hover:bg-base-300 disabled:opacity-50 disabled:hover:bg-base-100";

const SECTIONS: readonly Section[] = ["keys", "lights", "screens"];

const TITLE: Record<Section, string> = {
  keys: "Keys",
  lights: "Lights",
  screens: "Screens",
};

type Opened = { name: string; backup: Backup } | { name: string; error: string };

const ALL_ON: Record<Section, boolean> = {
  keys: true,
  lights: true,
  screens: true,
};

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

/** One part of a file in the preview: a switch, what differs and what cannot be applied. */
const PartCard = ({
  title,
  checked,
  onToggle,
  disabled,
  summary,
  details,
  problems,
}: {
  title: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled: boolean;
  summary: string;
  details: string[];
  problems: string[];
}) => (
  <section
    aria-label={title}
    className={`flex flex-col gap-1 rounded bg-base-100 p-2 ${disabled ? "opacity-70" : ""}`}
  >
    <label className="flex items-center gap-2 font-semibold">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onToggle(e.currentTarget.checked)}
      />
      {title}
    </label>
    <p>{summary}</p>
    {details.length > 0 && (
      <ul className="list-disc pl-5 font-mono opacity-80">
        {details.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    )}
    {problems.map((problem) => (
      <p key={problem} className="text-amber-600">
        {problem}
      </p>
    ))}
  </section>
);

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section
    aria-label={title}
    className="flex flex-col gap-3 rounded bg-base-200 p-3"
  >
    <h3 className="font-semibold">{title}</h3>
    {children}
  </section>
);

export interface FilesTabProps {
  /** The name the keyboard gave itself to the app. */
  keyboardName?: string;
  /** Saves the keys and the colors in the keyboard (Save of the header). */
  onSave?: () => void;
}

export const FilesTab = ({ keyboardName = "", onSave }: FilesTabProps) => {
  const connection = useContext(ConnectionContext);
  const doIt = useContext(UndoRedoContext);
  const ledMaps = useContext(LedMapsContext);
  const display = useContext(DisplayContext);
  const view = useKeyboardView();
  const pub = usePub();

  const behaviorsLoaded = Object.keys(view.behaviors).length > 0;
  const layerNames = useMemo(
    () => new Map((view.keymap?.layers ?? []).map((l) => [l.id, l.name])),
    [view.keymap],
  );

  // What the keyboard has now, as a file would keep it. Null for a part the
  // keyboard cannot give (yet).
  const have = useMemo(
    () => ({
      keys:
        view.keymap && behaviorsLoaded
          ? collectKeys(view.keymap, view.behaviors)
          : null,
      lights: ledMaps.status === "ready" ? collectLights(ledMaps, layerNames) : null,
      screens:
        display.status === "ready" ? collectScreens(display.settings) : null,
    }),
    [view.keymap, view.behaviors, behaviorsLoaded, ledMaps, layerNames, display],
  );

  const [saveParts, setSaveParts] = useState<Record<Section, boolean>>(ALL_ON);
  const [saved, setSaved] = useState<string | null>(null);

  const [opened, setOpened] = useState<Opened | null>(null);
  const [chosen, setChosen] = useState<Record<Section, boolean>>(ALL_ON);
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<ApplyReport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const plans: Plans = useMemo(() => {
    if (!opened || "error" in opened) {
      return {};
    }

    const { backup } = opened;
    return {
      keys:
        backup.keys && view.keymap && behaviorsLoaded
          ? planKeys(backup.keys, view.keymap, view.behaviors)
          : undefined,
      lights:
        backup.lights && ledMaps.status === "ready"
          ? planLights(backup.lights, ledMaps, layerNames)
          : undefined,
      screens:
        backup.screens && display.status === "ready"
          ? planScreens(backup.screens, display.settings)
          : undefined,
    };
  }, [opened, view.keymap, view.behaviors, behaviorsLoaded, ledMaps, layerNames, display]);

  const anythingToSave = SECTIONS.some((s) => saveParts[s] && have[s] !== null);

  const save = () => {
    const now = new Date();
    const backup = buildBackup({
      keyboard: keyboardName,
      now,
      keys: saveParts.keys ? (have.keys ?? undefined) : undefined,
      lights: saveParts.lights ? (have.lights ?? undefined) : undefined,
      screens: saveParts.screens ? (have.screens ?? undefined) : undefined,
    });
    const name = backupFileName(keyboardName, now);
    downloadTextFile(name, serializeBackup(backup));
    setSaved(name);
  };

  const open = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    // So that the same file can be picked again after it was changed.
    e.currentTarget.value = "";
    setReport(null);
    if (!file) {
      return;
    }

    try {
      const parsed = parseBackup(await readBackupText(file));
      setOpened(
        parsed.ok
          ? { name: file.name, backup: parsed.backup }
          : { name: file.name, error: parsed.error },
      );
      setChosen(ALL_ON);
    } catch (error) {
      setOpened({
        name: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const applyChosen = async () => {
    if (!connection.conn || !doIt) {
      return;
    }

    setApplying(true);
    setReport(null);
    try {
      setReport(
        await applyBackup(plans, chosen, {
          conn: connection.conn,
          doIt,
          paint: ledMaps.paint,
          setValues: display.setValues,
          reloadKeys: () => pub("keys.reload", undefined),
        }),
      );
    } finally {
      setApplying(false);
    }
  };

  const anythingToApply = SECTIONS.some(
    (s) => chosen[s] && hasChanges(plans, s),
  );
  const needsSave =
    report !== null &&
    ((report.applied.keys ?? 0) > 0 || (report.applied.lights ?? 0) > 0);

  const availability = (section: Section): string | null =>
    have[section] === null
      ? section === "keys"
        ? "Still reading the keys from the keyboard."
        : section === "lights"
          ? "This keyboard has no light maps."
          : "This keyboard has no screen settings."
      : null;

  const summary = (section: Section): string => {
    switch (section) {
      case "keys":
        return have.keys ? `${count(have.keys.layers.length, "layer")}, ${count(have.keys.layers.reduce((n, l) => n + l.bindings.length, 0), "key")}` : "";
      case "lights":
        return have.lights ? `${count(have.lights.layers.length, "color map")} of ${count(have.lights.slotCount, "color")}` : "";
      case "screens":
        return have.screens ? count(have.screens.settings.length, "setting") : "";
    }
  };

  const backup = opened && !("error" in opened) ? opened.backup : null;

  return (
    <div className="bg-base-300 min-h-0 min-w-0 overflow-y-auto p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="font-semibold">Files</h2>
          <p className="opacity-70">
            Save the keys, the colors of the lights and the settings of the
            screens into one file, to keep it or to put it on another keyboard,
            and apply such a file here. A file is shown first, with what would
            change, and nothing is written until you choose Apply.
          </p>
        </header>

        <Card title="Save to a file">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">What goes into the file</legend>
            {SECTIONS.map((section) => {
              const why = availability(section);

              return (
                <label
                  key={section}
                  className={`flex items-start gap-2 ${why ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={saveParts[section] && why === null}
                    disabled={why !== null}
                    onChange={(e) => {
                      const on = e.currentTarget.checked;
                      setSaveParts((p) => ({ ...p, [section]: on }));
                    }}
                  />
                  <span>
                    <span className="font-semibold">{TITLE[section]}</span>{" "}
                    <span className="opacity-70">{why ?? summary(section)}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={!anythingToSave}
              onClick={save}
            >
              <FileDown className="w-4" aria-hidden="true" />
              Save to a file
            </button>
            <span role="status" className="opacity-70">
              {saved
                ? `Saved as ${saved}.`
                : "The file has what the keyboard has now, changes that are not saved in the keyboard yet included."}
            </span>
          </div>
        </Card>

        <Card title="Apply a file">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={BUTTON}
              onClick={() => fileInput.current?.click()}
            >
              <FileUp className="w-4" aria-hidden="true" />
              Open a file
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Backup file"
              tabIndex={-1}
              onChange={(e) => void open(e)}
            />
            <span className="opacity-70">
              {opened ? opened.name : "A file made by this tab."}
            </span>
          </div>

          {opened && "error" in opened && (
            <p role="alert" className="text-red-600">
              {opened.error}
            </p>
          )}

          {backup && (
            <>
              <p className="opacity-70">
                {[
                  backup.keyboard ? `Made for ${backup.keyboard}` : "Made for a keyboard that did not say its name",
                  when(backup.createdAt) && `on ${when(backup.createdAt)}`,
                  backup.app && `by ${backup.app}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
                .
              </p>
              {backup.keyboard !== "" &&
                keyboardName !== "" &&
                backup.keyboard !== keyboardName && (
                  <p className="text-amber-600">
                    The keyboard now is called {keyboardName}. A file of another
                    keyboard can fail or look wrong here; check the plan below.
                  </p>
                )}

              <div className="flex flex-col gap-2">
                {SECTIONS.map((section) => {
                  if (!backup[section]) {
                    return null;
                  }

                  const plan = plans[section];
                  if (!plan) {
                    return (
                      <PartCard
                        key={section}
                        title={TITLE[section]}
                        checked={false}
                        disabled
                        onToggle={() => {}}
                        summary={availability(section) ?? "Reading the keyboard..."}
                        details={[]}
                        problems={[]}
                      />
                    );
                  }

                  return (
                    <PartCard
                      key={section}
                      title={TITLE[section]}
                      checked={chosen[section]}
                      disabled={!hasChanges(plans, section)}
                      onToggle={(on) => setChosen((c) => ({ ...c, [section]: on }))}
                      summary={
                        section === "keys" && plans.keys
                          ? describeKeys(plans.keys)
                          : section === "lights" && plans.lights
                            ? describeLights(plans.lights)
                            : plans.screens
                              ? describeScreens(plans.screens)
                              : ""
                      }
                      details={
                        section === "keys" && plans.keys
                          ? keysDetails(plans.keys)
                          : section === "lights" && plans.lights
                            ? lightsDetails(plans.lights)
                            : plans.screens
                              ? screensDetails(plans.screens)
                              : []
                      }
                      problems={plan.problems}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={BUTTON}
                  disabled={!anythingToApply || applying}
                  onClick={() => void applyChosen()}
                >
                  Apply the checked parts
                </button>
                <span className="opacity-70">
                  Undo in the header (Ctrl+Z) takes back the keys and the colors.
                  The screens are taken back with Undo in the Display or the OLED
                  tab.
                </span>
              </div>
            </>
          )}

          {report?.failed && (
            <p role="alert" className="text-red-600">
              {TITLE[report.failed.section]} failed: {report.failed.message}
            </p>
          )}
          {report && !report.failed && (
            <p role="status">
              {Object.keys(report.applied).length === 0
                ? "Nothing was applied."
                : `Applied: ${[
                    report.applied.keys !== undefined && count(report.applied.keys, "key"),
                    report.applied.lights !== undefined && count(report.applied.lights, "color"),
                    report.applied.screens !== undefined && count(report.applied.screens, "setting"),
                  ]
                    .filter(Boolean)
                    .join(", ")}.`}
            </p>
          )}
          {needsSave && onSave && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={BUTTON} onClick={onSave}>
                Save the keys and the colors in the keyboard
              </button>
              <span className="opacity-70">
                They are applied but not saved yet, like any change in the Keys
                or the Lights tab: Save in the header does the same, Discard
                throws them away.
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
