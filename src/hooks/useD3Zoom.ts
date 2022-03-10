import { RootStoreInstance } from "../models/root_store";
import { useSpaceIsPressed } from "./useSpaceIsPressed";
import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";
import { ZoomBehavior } from "d3";

export function useD3Zoom(root: RootStoreInstance) {
  const spaceIsPressed = useSpaceIsPressed();
  const zoomerRef = useRef<ZoomBehavior<Element, any> | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const canvas = ref.current;

    if (canvas) {
      zoomerRef.current = d3
        .zoom()
        .scaleExtent([0.1, 1000])
        .filter((e) => {
          if (e.type === "mousedown") {
            return spaceIsPressed.current;
          } else if (e.touches) {
            return e.touches.length > 1;
          } else {
            return true;
          }
        });

      const zoomer = zoomerRef.current;
      const selection = d3.select(canvas as any);

      zoomer.on("start", () => {
        root.viewport.setIsZooming(true);
      });

      zoomer.on("zoom", (e) => {
        root.viewport.setZoomState(e.transform);
      });

      zoomer.on("end", () => {
        root.viewport.setIsZooming(false);
      });

      zoomer(selection);
      selection.on("dblclick.zoom", null);

      return () => {
        zoomer.on("zoom", null);
        zoomer.on("start", null);
        zoomer.on("end", null);
      };
    }
  }, []);

  const zoomTo = useCallback((x: number, y: number, k: number) => {
    if (zoomerRef.current && ref.current) {
      zoomerRef.current.transform(
        d3.select(ref.current as any),
        d3.zoomIdentity.translate(x, y).scale(k)
      );
    }
  }, []);

  return [ref, zoomTo] as const;
}
