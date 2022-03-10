import { createContext, useContext } from "react";
import { RootStoreInstance } from "../models/root_store";

export const RootStoreContext = createContext<RootStoreInstance | null>(null);

export const useRootStore = () => {
  const rootStore = useContext(RootStoreContext);
  if (!rootStore) {
    throw new Error("useRootStore must be used within a RootStoreProvider");
  }
  return rootStore;
};
