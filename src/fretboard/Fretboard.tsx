import React, {
  createContext,
  CSSProperties,
  HTMLProps,
  useContext,
} from "react";
import { colors } from "../stitches.config";
import { NoteLiteral } from "@tonaljs/tonal";
import {
  NoteCoordinate,
  NotePlacement,
  NoteType,
  StringAndFret,
} from "../types";
import * as d3 from "d3";
import { FretboardLogic } from "./create_fretboard";
import { FretboardLayout } from "./create_fretboard_layout";

interface FretboardData {
  boardExtent: { top: number; left: number; bottom: number; right: number };
  fretIsVisible: (fretNum: number) => boolean;
  fretToX: (fretNum: number) => number;
  fretToFingerX: (fretNum: number) => number;
  maxFret: number;
  maxNote: NoteType;
  maxString: number;
  minFret: number;
  minNote: NoteType;
  minString: number;
  numStrings: number;
  octaveMarkerFrets: number[];
  placeNote: (noteLiteral: NoteLiteral) => NotePlacement[];
  secondaryMarkerFrets: number[];
  showFretNumbers: boolean;
  showStringNames: boolean;
  stringToY: (strNum: number) => number;
  totalHeight: number;
  totalWidth: number;
  tuning: NoteType[];
  findNearestNote: (x: number, y: number) => NoteCoordinate;
  placementToNote: (placement: StringAndFret) => NoteType | null;
}

const FretboardDataContext = createContext<FretboardData>({} as any);

export const FretMarks = () => {
  const { minFret, maxFret, boardExtent, fretToX } = useFretboardData();
  const fretRange = d3.range(minFret, maxFret + 1);
  return (
    <>
      {fretRange.map((d) => (
        <line
          key={`fret_${d}`}
          y1={boardExtent.top}
          y2={boardExtent.bottom}
          x1={fretToX(d)}
          x2={fretToX(d)}
          stroke={colors.sand8.value}
          strokeWidth={d === 0 ? 5 : 3}
          strokeLinecap="round"
        />
      ))}
    </>
  );
};

export const DotMarks = () => {
  const {
    minFret,
    maxFret,
    fretToX,
    stringToY,
    numStrings,
    octaveMarkerFrets,
    secondaryMarkerFrets,
  } = useFretboardData();
  const fretIsVisibleExcludingMinimum = (fretNum: number) =>
    fretNum > minFret && fretNum <= maxFret;

  const markerSize = Math.min((stringToY(1) - stringToY(0)) / 2 - 2, 4);

  return (
    <>
      {secondaryMarkerFrets.filter(fretIsVisibleExcludingMinimum).map((d) => (
        <circle
          key={`marker_${d}`}
          cx={(fretToX(d) + fretToX(d - 1)) / 2}
          cy={stringToY((numStrings + 1) / 2)}
          r={markerSize}
          fill={colors.sand5.value}
        />
      ))}
      {octaveMarkerFrets.filter(fretIsVisibleExcludingMinimum).map((d) => (
        <React.Fragment key={`marker_${d}`}>
          <circle
            cx={(fretToX(d) + fretToX(d - 1)) / 2}
            cy={(stringToY(3) + stringToY(2)) / 2}
            r={markerSize}
            fill={colors.sand5.value}
          />
          <circle
            cx={(fretToX(d) + fretToX(d - 1)) / 2}
            cy={(stringToY(4) + stringToY(5)) / 2}
            r={markerSize}
            fill={colors.sand5.value}
          />
        </React.Fragment>
      ))}
    </>
  );
};

export const StringNames = () => {
  const { minString, maxString, tuning, stringToY, boardExtent } =
    useFretboardData();
  const stringRange = d3.range(minString, maxString + 1);
  return (
    <>
      {stringRange.map((d) => {
        const parts = tuning[d];
        return (
          <text
            key={`string_number_${d}`}
            x={boardExtent.left - 12}
            y={stringToY(d)}
            dominantBaseline="middle"
            textAnchor="end"
            fontSize={10}
            fontFamily="sans-serif"
            style={{ fill: colors.sand11.value }}
          >
            {parts.letter}
          </text>
        );
      })}
    </>
  );
};

export const FretNumbers = () => {
  const {
    octaveMarkerFrets,
    secondaryMarkerFrets,
    fretIsVisible,
    fretToX,
    boardExtent,
  } = useFretboardData();

  const displayFretNumbers = [
    ...octaveMarkerFrets,
    ...secondaryMarkerFrets,
  ].filter(fretIsVisible);

  return (
    <>
      {displayFretNumbers.map((d) => (
        <text
          key={`string_number_${d}`}
          x={fretToX(d)}
          y={boardExtent.bottom + 20}
          textAnchor="middle"
          fontSize={12}
          fontFamily="sans-serif"
          style={{ fill: colors.sand11.value }}
        >
          {d}
        </text>
      ))}
    </>
  );
};
export const StringMarks = () => {
  const { minString, maxString, minFret, stringToY, boardExtent } =
    useFretboardData();
  const stringRange = d3.range(minString, maxString + 1);

  return (
    <>
      {stringRange.map((d) => (
        <line
          key={`string_${d}`}
          x1={minFret === 0 ? boardExtent.left - 2.5 : boardExtent.left}
          x2={boardExtent.right}
          y1={stringToY(d)}
          y2={stringToY(d)}
          strokeLinecap="round"
          strokeWidth={1.5 + d / 4}
          stroke={colors.sand10.value}
        />
      ))}
    </>
  );
};
export const Fretboard: React.FC<
  { width?: number; height?: number } & HTMLProps<SVGSVGElement>
> = ({ width, height, children, ...props }) => {
  const { totalWidth, totalHeight, showFretNumbers, showStringNames } =
    useFretboardData();
  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={width ?? totalWidth}
      height={height ?? totalHeight}
      {...(props as any)}
    >
      <FretMarks />
      <DotMarks />
      <StringMarks />
      {showStringNames && <StringNames />}
      {showFretNumbers && <FretNumbers />}
      {children}
    </svg>
  );
};

interface FretboardProps {
  logic: FretboardLogic;
  layout: FretboardLayout;
  children?: React.ReactNode;
}

export const FretboardDataProvider = ({
  logic,
  layout,
  children,
}: FretboardProps) => {
  const {
    fretIsVisible,
    maxFret,
    maxNote,
    maxString,
    minFret,
    minNote,
    minString,
    numStrings,
    octaveMarkerFrets,
    placeNote,
    placementToNote,
    secondaryMarkerFrets,
    tuning,
  } = logic;

  const {
    boardExtent,
    findNearestNote,
    fretToFingerX,
    fretToX,
    showFretNumbers,
    showStringNames,
    stringToY,
    totalHeight,
    totalWidth,
  } = layout;

  return (
    <FretboardDataContext.Provider
      value={{
        boardExtent,
        findNearestNote,
        fretIsVisible,
        fretToX,
        placementToNote,
        fretToFingerX,
        maxFret,
        maxNote,
        maxString,
        minFret,
        minNote,
        minString,
        numStrings,
        octaveMarkerFrets,
        placeNote,
        secondaryMarkerFrets,
        showFretNumbers,
        showStringNames,
        stringToY,
        totalHeight,
        totalWidth,
        tuning,
      }}
    >
      {children}
    </FretboardDataContext.Provider>
  );
};
export const useFretboardData = (): FretboardData =>
  useContext(FretboardDataContext);

export interface NoteMarkerProps {
  fret: number;
  string: number;
  outline?: boolean;
  shape?: "square" | "circle";
  label?: string;
  labelKind?: "note-name" | "manual";
  color?: any;
}

const formatNoteName = (note: NoteType) => {
  const letter = note.letter;
  const alt = note.alt === -1 ? "b" : note.alt === 1 ? "#" : "";
  return `${letter}${alt}`;
};

export const NoteMarker = ({
  fret,
  string,
  label,
  labelKind = "manual",
  outline = false,
  shape = "square",
  color = colors.sand11,
}: NoteMarkerProps) => {
  const { fretToFingerX, stringToY, placementToNote } = useFretboardData();

  const cx = fretToFingerX(fret);
  const cy = stringToY(string);

  const halfWidth = outline ? 11 : 12;

  const shapeCSS: CSSProperties = outline
    ? { fill: "white", stroke: color, strokeWidth: 2 }
    : { fill: color };

  const textCSS: CSSProperties = outline ? { fill: color } : { fill: "white" };

  const note = placementToNote({ fret, string });
  const labelText =
    labelKind === "note-name" ? (note ? formatNoteName(note) : "") : label;

  return (
    <g>
      {shape === "square" ? (
        <rect
          width={halfWidth * 2}
          height={halfWidth * 2}
          x={cx - halfWidth}
          y={cy - halfWidth}
          rx={2}
          ry={2}
          style={shapeCSS}
        />
      ) : (
        <circle cx={cx} cy={cy} r={halfWidth} style={shapeCSS} />
      )}
      {labelText && (
        <text
          x={cx}
          y={cy + 1}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={10}
          fontFamily="sans-serif"
          fontWeight="bold"
          style={textCSS}
        >
          {labelText}
        </text>
      )}
    </g>
  );
};
