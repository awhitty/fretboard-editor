import { Fretboard, NoteMarker, useFretboardData } from "./Fretboard";
import React, { useState } from "react";
import { NotePlacement, NoteType } from "./types";
import { Chord, Note, Scale } from "@tonaljs/tonal";
import { isDefined } from "./IsDefined";

const Board = () => {
  const { findNearestNote, minNote, maxNote, placeNote } = useFretboardData();
  const [note, setNote] = useState<NotePlacement | null>(null);
  const [chordName, setChordName] = useState<string>("A minor");

  const chord = Chord.get(chordName);
  const getOrd = (note: NoteType) =>
    chord.notes.findIndex((n) => Note.chroma(n) === note.chroma);

  const scaleNotes = Scale.rangeOf(chord.notes)(minNote.name, maxNote.name)
    .filter(isDefined)
    .map(placeNote)
    .flat();

  return (
    <>
      <Fretboard>
        {scaleNotes.map((note) => (
          <NoteMarker
            fret={note.fret}
            string={note.string}
            shape="circle"
            label={chord.intervals[getOrd(note.note)]}
            outline
          />
        ))}
      </Fretboard>
      <input
        type="text"
        value={chordName}
        onChange={(e) => setChordName(e.currentTarget.value)}
      />
      <pre>{JSON.stringify(chord, null, 2)}</pre>
    </>
  );
};
