import { createContext, useMemo, useState } from "react";

export type UndoCallback = () => Promise<void>;

export type DoCallback = () => Promise<UndoCallback>;

export function useUndoRedo(): [
  (dc: DoCallback) => Promise<void>,
  () => Promise<void>,
  () => Promise<void>,
  boolean,
  boolean,
  () => void
] {
  const [locked, setLocked] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<Array<[DoCallback, UndoCallback]>>(
    []
  );
  const [redoStack, setRedoStack] = useState<Array<DoCallback>>([]);

  const canUndo = useMemo(
    () => !locked && undoStack.length > 0,
    [locked, undoStack]
  );
  const canRedo = useMemo(
    () => !locked && redoStack.length > 0,
    [locked, redoStack]
  );

  const doIt = async (doCb: DoCallback, preserveRedo?: boolean) => {
    setLocked(true);

    // Modified by the lenerdz/zmk-studio fork: a failed operation (the keyboard
    // refused a color change, for example) must not leave undo and redo locked.
    let undo: UndoCallback;
    try {
      undo = await doCb();
    } catch (e) {
      setLocked(false);
      throw e;
    }

    // Modified by the lenerdz/zmk-studio fork: build the new stack from the latest
    // one, not from the stack this function saw when it was created. Two
    // operations that finish close together would otherwise lose one entry.
    setUndoStack((stack) => [[doCb, undo], ...stack]);
    if (!preserveRedo) {
      setRedoStack([]);
    }
    setLocked(false);
  };

  const undo = async () => {
    if (locked) {
      throw new Error("undo invoked when existing operation in progress");
    }

    if (undoStack.length === 0) {
      throw new Error("undo invoked with no operations to undo");
    }

    setLocked(true);
    let [doCb, undoCb] = undoStack[0];
    setUndoStack(undoStack.slice(1));
    setRedoStack([doCb, ...redoStack]);

    await undoCb();

    setLocked(false);
  };

  const redo = async () => {
    if (locked) {
      throw new Error("redo invoked when existing operation in progress");
    }

    if (redoStack.length === 0) {
      throw new Error("redo invoked with no operations to redo");
    }

    let doCb = redoStack[0];

    setRedoStack(redoStack.slice(1));

    return await doIt(doCb, true);
  };

  const reset = () => {
    setRedoStack([]);
    setUndoStack([]);
  };

  return [doIt, undo, redo, canUndo, canRedo, reset];
}

export const UndoRedoContext = createContext<
  ((dc: DoCallback) => Promise<void>) | null
>(null);
