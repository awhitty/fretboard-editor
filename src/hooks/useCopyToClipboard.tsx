import { RootStoreContext, useRootStore } from "./useRootStore";
import React, { useCallback } from "react";
import { renderToString } from "react-dom/server";
import { FretboardDataProvider } from "../fretboard/Fretboard";
import { StaticFretboard } from "../export/StaticFretboard";
import { copyTextToClipboard } from "../export/copyTextToClipboard";

export const useCopyToClipboard = () => {
  const rootStore = useRootStore();
  return useCallback(() => {
    const text = renderToString(
      <RootStoreContext.Provider value={rootStore}>
        <FretboardDataProvider
          logic={rootStore.document.fretboard.logic}
          layout={rootStore.document.fretboard.layout}
        >
          <StaticFretboard />
        </FretboardDataProvider>
      </RootStoreContext.Provider>
    );
    copyTextToClipboard(text);
  }, [rootStore]);
};
