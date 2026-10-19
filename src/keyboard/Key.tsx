// Modified by the lenerdz/zmk-studio fork: a key can be the one being dragged onto
// another key, or the one a dragged key is over (see keyDrag.ts).
import { PropsWithChildren } from "react";
import { ArrowLeftRight, Copy } from "lucide-react";
import BehaviorShortNames from "./behavior-short-names.json";
import type { DropMode } from "./keyDrag";

interface KeyProps {
  selected?: boolean;
  /** This key is the one being dragged. */
  dragging?: boolean;
  /** A dragged key is over this one; dropping it would swap or copy. */
  dropMode?: DropMode;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  onClick?: () => void;
}

interface BehaviorShortName {
  short?: string;
}

const MAX_HEADER_LENGTH = 9;
const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

const shortenHeader = (header: string | undefined) => {
  if(typeof header === "undefined"){
    return "";
  }
  // Empty string is a valid header for behaviors where we don't want to see a header, which is falsy
  // So we use an undefined check here
  if(typeof shortNames[header]?.short !== "undefined"){
    return shortNames[header].short;
  } else if(header.length > MAX_HEADER_LENGTH){
    const words = header.split(/[\s,-]+/);
    const lettersPerWord = Math.trunc(MAX_HEADER_LENGTH / words.length);
    return words.map((word) => (word.substring(0,lettersPerWord))).join("");
  } else {
    return header;
  }
}

export const Key = ({
  selected = false,
  dragging = false,
  dropMode,
  width,
  height,
  oneU,
  header,
  onClick,
  children,
}: PropsWithChildren<KeyProps>) => {
  const pixelWidth = width * oneU - 2;
  const pixelHeight = height * oneU - 2;
  const DropIcon = dropMode === "copy" ? Copy : ArrowLeftRight;

  return (
    <button
      // touch-none: a finger dragging from a key moves the key, not the page.
      className={`group rounded relative flex justify-center items-center cursor-pointer select-none touch-none transition-all hover:shadow-xl hover:ring-1 hover:ring-gray-300 hover:scale-125 ${selected ? "bg-primary text-primary-content" : "bg-base-100 text-base-content"
        } ${dragging ? "opacity-40 outline outline-2 outline-dashed outline-primary" : ""} ${dropMode ? "ring-2 ring-accent shadow-xl scale-125" : ""}`}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
      onClick={onClick}
    >
      <div className={`absolute text-xs ${selected ? "text-primary-content" : "z1text-base-content"} opacity-80 top-1 text-nowrap left-1/2 font-light -translate-x-1/2 text-center`}>{shortenHeader(header)}</div>
      {children}
      {dropMode && (
        <span className="absolute -top-2 -right-2 z-20 rounded-full bg-accent p-0.5 text-black shadow">
          <DropIcon size={12} strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
    </button>
  );
};
