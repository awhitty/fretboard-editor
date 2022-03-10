import { Interval, Note, NoteLiteral, Scale } from "@tonaljs/tonal";
import { NotePlacement, NoteType, StringAndFret } from "../types";
import { isDefined } from "../utils/is_defined";

export const STANDARD_TUNING = ["E4", "B3", "G3", "D3", "A2", "E2"];

export interface FretboardLogic {
  tuning: NoteType[];
  numStrings: number;
  minString: number;
  maxString: number;
  minFret: number;
  maxFret: number;
  fretIsVisible: (fret: number) => boolean;
  placeNote: (noteLiteral: NoteLiteral) => NotePlacement[];
  minNote: NoteType;
  maxNote: NoteType;
  allNotesOnBoard: FlatArray<NotePlacement[][], 1>[];
  placementToNote: ({ string, fret }: StringAndFret) => NoteType | null;
  octaveMarkerFrets: number[];
  secondaryMarkerFrets: number[];
}

export function createFretboardLogic(
  tuning: string[] = STANDARD_TUNING,
  minFret: number = 0,
  maxFret: number = 12
): FretboardLogic {
  const parsedTuning = tuning.map((note) => Note.get(note) as NoteType);

  const numStrings = parsedTuning.length;
  const minString = 1;
  const maxString = numStrings;

  const placeNote = (noteLiteral: NoteLiteral): NotePlacement[] => {
    const note = Note.get(noteLiteral);
    if (note.empty) {
      return [];
    } else {
      return parsedTuning
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
        }));
    }
  };

  const fretIsVisible = (fretNum: number) =>
    fretNum >= minFret && fretNum <= maxFret;

  const minNote = Note.get(
    Note.sortedNames(
      parsedTuning.map((n) =>
        Note.transpose(n, Interval.fromSemitones(minFret))
      )
    )[0]
  ) as NoteType;

  const maxNote = Note.get(
    Note.sortedNames(
      parsedTuning.map((n) =>
        Note.transpose(n, Interval.fromSemitones(maxFret))
      )
    )[parsedTuning.length - 1]
  ) as NoteType;

  const allNotesOnBoard = Scale.rangeOf("C chromatic")(
    minNote.name,
    maxNote.name
  )
    .filter(isDefined)
    .map(placeNote)
    .flat();

  const placementToNote = ({ string, fret }: StringAndFret) => {
    const stringIndex = string - 1;
    if (!(stringIndex < 0 || stringIndex >= parsedTuning.length)) {
      const note = parsedTuning[stringIndex];
      return Note.get(
        Note.transpose(note, Interval.fromSemitones(fret))
      ) as NoteType;
    } else {
      return null;
    }
  };

  const octaveMarkerFrets = [12, 24].filter(fretIsVisible);
  const secondaryMarkerFrets = [3, 5, 7, 9, 15, 17, 19, 21].filter(
    fretIsVisible
  );

  return {
    tuning: parsedTuning,
    numStrings,
    minString,
    maxString,
    fretIsVisible,
    placeNote,
    minNote,
    maxNote,
    minFret,
    maxFret,
    allNotesOnBoard,
    placementToNote,
    octaveMarkerFrets,
    secondaryMarkerFrets,
  };
}
