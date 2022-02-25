import { Note as _NoteType } from "@tonaljs/core";

export type NoteType = _NoteType;

export interface NotePlacement {
  note: NoteType;
  fret: number;
  string: number;
  isOpen: boolean;
  x: number;
  y: number;
}

export interface StringAndFret {
  string: number;
  fret: number;
}
