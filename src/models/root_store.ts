import {
  getRoot,
  IAnyStateTreeNode,
  Instance,
  types as t,
} from "mobx-state-tree";
import { ZoomTransform } from "d3-zoom";
import * as d3 from "d3";
import { DocumentNode } from "./document";
import { CreateTool, PointerTool } from "./tools";

export function getTypedRoot(
  node: IAnyStateTreeNode
): Instance<typeof RootStore> {
  return getRoot(node) as Instance<typeof RootStore>;
}

export const ViewportData = t
  .model({
    isZooming: t.optional(t.boolean, false),
    zoomState: t.optional(t.frozen<ZoomTransform>(), () => d3.zoomIdentity),
    clientRect: t.optional(
      t.frozen<DOMRectReadOnly>(),
      () => new DOMRectReadOnly()
    ),
  })
  .views((self) => ({
    worldToViewport(x: number, y: number) {
      return self.zoomState.apply([x, y]);
    },
    viewportToWorld(x: number, y: number) {
      return self.zoomState.invert([x, y]);
    },
    screenToWorld(x: number, y: number) {
      return this.viewportToWorld(x - self.clientRect.x, y - self.clientRect.y);
    },
    worldValueToViewportValue(v: number) {
      return v * self.zoomState.k;
    },
    worldRectToViewportRect(rect: DOMRectReadOnly) {
      const [x, y] = this.worldToViewport(rect.x, rect.y);
      const w = this.worldValueToViewportValue(rect.width);
      const h = this.worldValueToViewportValue(rect.height);
      return new DOMRectReadOnly(x, y, w, h);
    },
    get viewportExtent(): DOMRectReadOnly {
      const [left, top] = this.screenToWorld(
        self.clientRect.left,
        self.clientRect.top
      );
      const [right, bottom] = this.screenToWorld(
        self.clientRect.right,
        self.clientRect.bottom
      );
      return new DOMRectReadOnly(left, top, right - left, bottom - top);
    },
  }))
  .actions((self) => ({
    setZoomState(state: d3.ZoomTransform) {
      self.zoomState = state;
    },
    setClientRect(rect: DOMRectReadOnly) {
      self.clientRect = rect;
    },
    setIsZooming(val: boolean) {
      self.isZooming = val;
    },
  }));

export const RootStore = t
  .model({
    document: t.optional(DocumentNode, {}),
    tool: t.optional(t.union(PointerTool, CreateTool), {}),
    viewport: t.optional(ViewportData, {}),
  })
  .actions((self) => ({
    setToolType(toolType: "POINTER_TOOL" | "CREATE_TOOL") {
      switch (toolType) {
        case "POINTER_TOOL":
          self.tool = PointerTool.create();
          return;
        case "CREATE_TOOL":
          self.tool = CreateTool.create();
          return;
      }
    },
  }));

export interface RootStoreInstance extends Instance<typeof RootStore> {}
