import makeInspectable from "mobx-devtools-mst";

import React, { useMemo } from "react";
import { RootStore } from "./models/root_store";
import { Editor } from "./ui/Editor";
import { observer } from "mobx-react-lite";
import { setUndoManager } from "./models/undo";

const App = observer(() => {
  const rootStore = useMemo(() => {
    const root = RootStore.create({});
    setUndoManager(root.document);
    makeInspectable(root);
    return root;
  }, []);

  return <Editor rootStore={rootStore} />;
});

export default App;
