import { useEffect, useMemo, useState } from "react";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { validateValue } from "./parameters";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  let matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);

  const metadata = useMemo(
    () => behaviors.find((b) => b.id == behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const sortedBehaviors = useMemo(
    () => behaviors.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [behaviors]
  );

  // Modified by the lenerdz/zmk-studio fork: the keyboard is told about a change
  // when the user makes it here (the handlers below call this function), not by
  // an effect. Upstream compared the picker's own copy of the binding with the
  // `binding` prop in an effect. A binding that changed from outside the picker
  // (dropping a key on the selected key, undo, redo) could then be written back
  // with its old value, and the old and the new value could keep replacing each
  // other for as long as the page stayed open.
  const changeBinding = (
    nextBehaviorId: number,
    nextParam1?: number,
    nextParam2?: number
  ) => {
    setBehaviorId(nextBehaviorId);
    setParam1(nextParam1);
    setParam2(nextParam2);

    if (
      binding.behaviorId === nextBehaviorId &&
      binding.param1 === nextParam1 &&
      binding.param2 === nextParam2
    ) {
      return;
    }

    const nextMetadata = behaviors.find((b) => b.id == nextBehaviorId)?.metadata;

    if (!nextMetadata) {
      console.error(
        "Can't find metadata for the selected behaviorId",
        nextBehaviorId
      );
      return;
    }

    if (
      validateBinding(
        nextMetadata,
        layers.map(({ id }) => id),
        nextParam1,
        nextParam2
      )
    ) {
      onBindingChanged({
        behaviorId: nextBehaviorId,
        param1: nextParam1 || 0,
        param2: nextParam2 || 0,
      });
    }
  };

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label>Behavior: </label>
        <select
          value={behaviorId}
          className="h-8 rounded"
          onChange={(e) => {
            changeBinding(parseInt(e.target.value), 0, 0);
          }}
        >
          {sortedBehaviors.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </select>
      </div>
      {metadata && (
        <BehaviorParametersPicker
          metadata={metadata}
          param1={param1}
          param2={param2}
          layers={layers}
          onParam1Changed={(value) => changeBinding(behaviorId, value, param2)}
          onParam2Changed={(value) => changeBinding(behaviorId, param1, value)}
        />
      )}
    </div>
  );
};
