import { FretboardLogic } from "./create_fretboard";
import * as d3 from "d3";
import { NoteCoordinate } from "../types";

const STRING_LENGTH = 1400;
const TOTAL_FRET_COUNT = 24;

const fretProportion = (fretNum: number): number => {
  if (fretNum <= 0) {
    return 0;
  }

  const nutToFretMinusOne = fretProportion(fretNum - 1);
  const bridgeToFretMinusOne = 1 - nutToFretMinusOne;

  return bridgeToFretMinusOne / 17.817 + nutToFretMinusOne;
};

export interface FretboardLayout {
  boardExtent: { top: number; left: number; bottom: number; right: number };
  findNearestNote: (x: number, y: number) => NoteCoordinate;
  fretToFingerX: (fret: number) => number;
  fretToX: (fret: number) => number;
  isPointInBoard: (x: number, y: number) => boolean;
  showFretNumbers: boolean;
  showStringNames: boolean;
  stringToY: (string: number) => number;
  totalHeight: number;
  totalWidth: number;
}

export function createFretboardLayout(
  fretboard: FretboardLogic,
  showFretNumbers = true,
  showStringNames = false,
  margin = {
    top: 16,
    right: 16,
    left: showStringNames ? 32 : 16,
    bottom: showFretNumbers ? 32 : 16,
  }
): FretboardLayout {
  const { numStrings, minFret, maxFret, allNotesOnBoard } = fretboard;

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

  const allCoordsOnBoard = allNotesOnBoard.map((note) => ({
    ...note,
    point: { x: fretToCenterX(note.fret), y: stringToY(note.string) },
  }));

  const delaunay = d3.Delaunay.from(
    allCoordsOnBoard,
    (d) => d.point.x,
    (d) => d.point.y
  );

  const findNearestNote = (x: number, y: number): NoteCoordinate => {
    return allCoordsOnBoard[delaunay.find(x, y)]!;
  };

  const isPointInBoard = (x: number, y: number) => {
    return (
      x >= boardExtent.left &&
      x <= boardExtent.right &&
      y >= boardExtent.top &&
      y <= boardExtent.bottom
    );
  };

  return {
    boardExtent,
    findNearestNote,
    fretToFingerX,
    fretToX,
    isPointInBoard,
    showFretNumbers,
    showStringNames,
    stringToY,
    totalHeight,
    totalWidth,
  };
}
