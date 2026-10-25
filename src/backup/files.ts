/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Saving a text file from the browser and reading one the user picked. The only
 * part of the Files tab that needs the browser's file APIs.
 */

/** A backup is some tens of KB; a file much bigger than this is not one. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

/** Makes the browser save `text` as a file called `name`. */
export function downloadTextFile(name: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The browser has started the download by now.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The text of a file the user picked; an error for one too big to be a backup. */
export async function readBackupText(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error(
      `The file is too big for a backup (${Math.round(file.size / 1024)} KiB; the most is ${MAX_BACKUP_BYTES / 1024} KiB).`,
    );
  }

  return file.text();
}
