import makeInspectable from "mobx-devtools-mst";

import React, { useEffect, useMemo } from "react";
import { RootStore } from "./state/root_store";
import { FretboardData } from "./Fretboard";
import { MarkerEditor } from "./MarkerEditor";
import { observer } from "mobx-react-lite";
import { setUndoManager } from "./state/undo";

const App = observer(() => {
  const rootStore = useMemo(() => {
    const root = RootStore.create({});
    setUndoManager(root.document);
    makeInspectable(root);
    return root;
  }, []);

  return (
    <FretboardData
      minFret={rootStore.document.boardConfig.minFret}
      maxFret={rootStore.document.boardConfig.maxFret}
      showFretNumbers={rootStore.document.boardConfig.showFretNumbers}
    >
      <MarkerEditor rootStore={rootStore} />
    </FretboardData>
  );
});

export default App;
