import { useRootStore } from "../hooks/useRootStore";
import { Fretboard, NoteMarker } from "../fretboard/Fretboard";
import React from "react";

export const StaticFretboard = () => {
  const rootStore = useRootStore();
  return (
    <Fretboard>
      {rootStore.document.entities.map((model) => (
        <NoteMarker key={model.id} {...model.props} />
      ))}
    </Fretboard>
  );
};
