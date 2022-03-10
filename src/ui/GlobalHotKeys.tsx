import { observer } from "mobx-react-lite";
import { useRootStore } from "../hooks/useRootStore";
import { getUndoManager } from "../models/undo";
import { useHotkeys } from "react-hotkeys-hook";

export const GlobalHotKeys = observer(() => {
  const rootStore = useRootStore();
  const undoManager = getUndoManager();

  useHotkeys("cmd+z", () => {
    if (undoManager.canUndo) {
      undoManager.undo();
    }
  });

  useHotkeys("cmd+a", (e) => {
    e.preventDefault();
    rootStore.document.selectAll();
  });

  useHotkeys("cmd+shift+z", () => {
    if (undoManager.canRedo) {
      undoManager.redo();
    }
  });

  useHotkeys("backspace", () => {
    if (rootStore.document.selection.hasItems) {
      rootStore.document.deleteEntities(rootStore.document.selection.items);
    }
  });

  return null;
});
