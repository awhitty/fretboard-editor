import React, { useEffect, useMemo } from "react";
import { RootStore, setUndoManager } from "./models";
import { FretboardData } from "./Fretboard";
import { MarkerEditor } from "./MarkerEditor";
import { observer } from "mobx-react-lite";

const App = observer(() => {
  const rootStore = useMemo(() => {
    const root = RootStore.create({});
    setUndoManager(root.document);
    return root;
  }, []);

  return (
    <FretboardData
      minFret={rootStore.document.board.minFret}
      maxFret={rootStore.document.board.maxFret}
      showFretNumbers={rootStore.document.board.showFretNumbers}
    >
      <MarkerEditor rootStore={rootStore} />
    </FretboardData>
  );
});

export default App;
