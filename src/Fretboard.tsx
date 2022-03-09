import React, {
  createContext,
  CSSProperties,
  HTMLProps,
  useContext,
} from "react";
import { colors } from "./stitches.config";
import { Interval, Note, NoteLiteral, Scale } from "@tonaljs/tonal";
import { NotePlacement, NoteType, StringAndFret } from "./types";
import * as d3 from "d3";
import { isDefined } from "./is_defined";

const STANDARD_TUNING = ["E4", "B3", "G3", "D3", "A2", "E2"];
const STRING_LENGTH = 1400;
const TOTAL_FRET_COUNT = 24;

function transposeBySemitones(note: string, semitones: number) {
  return Note.fromMidi(Note.midi(note)! + semitones);
}

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
  findNearestNote: (x: number, y: number) => NotePlacement;
  placementToNote: (placement: StringAndFret) => NoteType | null;
}

const FretboardDataContext = createContext<FretboardData>({} as any);

interface FretboardProps {
  showFretNumbers: boolean;
  showStringNames: boolean;
  margin: {
    top: number;
    right: number;
    left: number;
    bottom: number;
  };
  minFret: number;
  maxFret: number;
  tuning: string[];
  children: React.ReactNode;
}

const fretProportion = (fretNum: number): number => {
  if (fretNum <= 0) {
    return 0;
  }

  const nutToFretMinusOne = fretProportion(fretNum - 1);
  const bridgeToFretMinusOne = 1 - nutToFretMinusOne;

  return bridgeToFretMinusOne / 17.817 + nutToFretMinusOne;
};

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
export const FretboardData = ({
  showFretNumbers = true,
  showStringNames = false,
  minFret = 0,
  maxFret = TOTAL_FRET_COUNT,
  margin = {
    top: 16,
    right: 16,
    left: showStringNames ? 32 : 16,
    bottom: showFretNumbers ? 32 : 16,
  },
  tuning: rawTuning = STANDARD_TUNING,
  children,
}: Partial<FretboardProps>) => {
  const tuning = rawTuning.map((note) => Note.get(note) as NoteType);

  const numStrings = rawTuning.length;
  const minString = 1;
  const maxString = numStrings;

  const stringInset = 12;
  const fretPadding = 8;
  const fretMarginLeft = minFret === 0 ? 0 : fretPadding;
  const fretMarginRight = maxFret === TOTAL_FRET_COUNT ? 0 : fretPadding;

  const totalWidth =
    STRING_LENGTH * (fretProportion(maxFret) - fretProportion(minFret)) +
    margin.left +
    margin.right +
    fretMarginLeft +
    fretMarginRight;

  const totalHeight = 200;

  const boardExtent = {
    top: margin.top,
    right: totalWidth - margin.right,
    bottom: totalHeight - margin.bottom,
    left: margin.left,
  };

  const fretToXInternal = d3
    .scaleLinear()
    .domain([fretProportion(minFret), fretProportion(maxFret)])
    .range([
      boardExtent.left + fretMarginLeft,
      boardExtent.right - fretMarginRight,
    ]);

  const fretToX = (fretNum: number) => {
    return fretToXInternal(fretProportion(fretNum));
  };

  const fretToFingerX = (fret: number) =>
    fret === minFret
      ? fretToX(fret)
      : d3.interpolate(fretToX(fret - 1), fretToX(fret))(0.66);

  const fretToCenterX = (fretNum: number) =>
    fretNum === minFret
      ? fretToX(fretNum)
      : (fretToX(fretNum - 1) + fretToX(fretNum)) / 2;

  const stringToY = d3
    .scaleLinear()
    .domain([1, numStrings])
    .range([margin.top + stringInset, boardExtent.bottom - stringInset]);

  const placeNote = (noteLiteral: NoteLiteral): NotePlacement[] => {
    const note = Note.get(noteLiteral);
    if (note.empty) {
      return [];
    } else {
      return tuning
        .map((stringNote, stringNumber) => [
          note.height - stringNote.height,
          stringNumber + 1,
        ])
        .filter(([fret]) => fretIsVisible(fret))
        .map(([fret, string]) => ({
          note,
          fret,
          string,
          isOpen: fret === 0,
          x: fretToCenterX(fret),
          y: stringToY(string),
        }));
    }
  };

  const fretIsVisible = (fretNum: number) =>
    fretNum >= minFret && fretNum <= maxFret;

  const minNote = Note.get(
    Note.sortedNames(
      tuning.map((n) => Note.transpose(n, Interval.fromSemitones(minFret)))
    )[0]
  ) as NoteType;

  const maxNote = Note.get(
    Note.sortedNames(
      tuning.map((n) => Note.transpose(n, Interval.fromSemitones(maxFret)))
    )[tuning.length - 1]
  ) as NoteType;

  const allNotesOnBoard = Scale.rangeOf("C chromatic")(
    minNote.name,
    maxNote.name
  )
    .filter(isDefined)
    .map(placeNote)
    .flat();

  const delaunay = d3.Delaunay.from(
    allNotesOnBoard,
    (d) => d.x,
    (d) => d.y
  );

  const findNearestNote = (x: number, y: number): NotePlacement => {
    return allNotesOnBoard[delaunay.find(x, y)]!;
  };

  const placementToNote = ({ string, fret }: StringAndFret) => {
    const stringIndex = string - 1;
    if (!(stringIndex < 0 || stringIndex >= tuning.length)) {
      const note = tuning[stringIndex];
      return Note.get(
        Note.transpose(note, Interval.fromSemitones(fret))
      ) as NoteType;
    } else {
      return null;
    }
  };

  const octaveMarkerFrets = [12, 24];
  const secondaryMarkerFrets = [3, 5, 7, 9, 15, 17, 19, 21];

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
