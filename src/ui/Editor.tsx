import { observer } from "mobx-react-lite";
import { RootStoreInstance } from "../models/root_store";
import React, { useCallback, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { styled } from "../stitches.config";
import useMeasure from "react-use-measure";
import { RootStoreContext } from "../hooks/useRootStore";
import { GlobalHotKeys } from "./GlobalHotKeys";
import { isTouchDevice } from "../utils/IsTouchDevice";
import { useSpaceIsPressed } from "../hooks/useSpaceIsPressed";
import { useD3Zoom } from "../hooks/useD3Zoom";
import { ScalingFretboard } from "./Canvas";
import { Controls } from "./Controls";

const EditorLayout = styled("div", {
  height: "100%",
  width: "100%",
});

const Workspace = styled("div", {
  width: "100%",
  height: "100%",
  touchAction: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gridArea: "workspace",
  background: "#eee",
  overflow: "auto",
});

export const Editor = observer(
  ({ rootStore }: { rootStore: RootStoreInstance }) => {
    const spaceIsPressed = useSpaceIsPressed();
    const { totalWidth, totalHeight } = rootStore.document.fretboard.layout;
    const [measureRef, { x, y, width, height }] = useMeasure();
    const [svgRef, zoomTo] = useD3Zoom(rootStore);

    useEffect(() => {
      if (width !== 0 && height !== 0) {
        const k = 1.5;
        zoomTo((width - totalWidth * k) / 2, (height - totalHeight * k) / 2, k);
      }
    }, [width, height, zoomTo]);

    useEffect(() => {
      rootStore.viewport.setClientRect(
        new DOMRectReadOnly(x, y, width, height)
      );
    }, [rootStore, x, y, width, height]);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        if (spaceIsPressed.current) {
          return;
        }
        const [x, y] = rootStore.viewport.viewportToWorld(...d3.pointer(e));
        rootStore.tool.down({ x, y }, e.shiftKey);
      },
      [rootStore.tool, rootStore.viewport.zoomState]
    );

    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        e.preventDefault();
        console.log("touchstart");
        const [x, y] = rootStore.viewport.viewportToWorld(...d3.pointers(e)[0]);
        rootStore.tool.down({ x, y }, e.shiftKey);
      },
      [rootStore.tool, rootStore.viewport.zoomState]
    );

    const handleMove = useCallback(
      (e: MouseEvent | TouchEvent) => {
        const [x, y] = rootStore.viewport.screenToWorld(...d3.pointer(e));
        rootStore.tool.move({ x, y });
      },
      [rootStore.tool, rootStore.viewport.zoomState]
    );

    const handleUp = useCallback(() => {
      rootStore.tool.up();
    }, [rootStore.tool]);

    useEffect(() => {
      if (isTouchDevice()) {
        window.addEventListener("touchmove", handleMove);
        window.addEventListener("touchend", handleUp);
        return () => {
          window.removeEventListener("touchmove", handleMove);
          window.removeEventListener("touchend", handleUp);
        };
      } else {
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
        };
      }
    }, [handleMove, handleUp]);

    const touchProps = useMemo(() => {
      if (isTouchDevice()) {
        return {
          onTouchStart: handleTouchStart,
        };
      } else {
        return {
          onMouseDown: handleMouseDown,
        };
      }
    }, [handleTouchStart, handleMouseDown]);

    return (
      <RootStoreContext.Provider value={rootStore}>
        <GlobalHotKeys />
        <EditorLayout>
          <Workspace ref={measureRef}>
            <ScalingFretboard
              tabIndex={0}
              ref={svgRef}
              width={width}
              height={height}
              {...touchProps}
            />
          </Workspace>
          <Controls />
        </EditorLayout>
      </RootStoreContext.Provider>
    );
  }
);
