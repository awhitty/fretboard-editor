import { Note as _NoteType } from "@tonaljs/core";

export type NoteType = _NoteType;

export interface NotePlacement {
  note: NoteType;
  fret: number;
  string: number;
  isOpen: boolean;
}

export interface NoteCoordinate extends NotePlacement {
  point: Point2D;
}

export interface StringAndFret {
  string: number;
  fret: number;
}

export type Point2D = {
  x: number;
  y: number;
};

export interface NoteTransform {
  fret: number;
  string: number;
}
