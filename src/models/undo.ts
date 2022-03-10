import { UndoManager, UndoManagerInstance } from "./undo_manager";
import { action, IObservableValue, observable } from "mobx";
import { DocumentNodeInstance } from "./document";

const undoManagerContainer: IObservableValue<UndoManagerInstance | null> =
  observable.box(null);

export const setUndoManager = action(
  (targetStore: DocumentNodeInstance): void => {
    undoManagerContainer.set(UndoManager.create({}, { targetStore }));
  }
);

export const getUndoManager = (): UndoManagerInstance => {
  const value = undoManagerContainer.get();

  if (!value) {
    throw new Error("Attempting to get UndoManager before initialization");
  }

  return value;
};
