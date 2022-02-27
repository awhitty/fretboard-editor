import {
  getRoot,
  IAnyStateTreeNode,
  Instance,
  types as t,
} from "mobx-state-tree";
import { ulid } from "ulid";
import { NotePlacement, StringAndFret } from "./types";
import { action, IObservableValue, observable } from "mobx";
import { UndoManager, UndoManagerInstance } from "./undo_manager";
import { ZoomTransform } from "d3-zoom";
import * as d3 from "d3";

export type Point2D = {
  x: number;
  y: number;
};

const optionalLiteral = <T extends string | number | boolean | Date>(v: T) =>
  t.optional(t.literal(v), v);

interface NoteTransform {
  fret: number;
  string: number;
}

const identityTransform = {
  fret: 0,
  string: 0,
};

export const Dot = t
  .model("Dot", {
    type: optionalLiteral("DOT"),
    id: t.optional(t.identifier, () => ulid()),
    name: t.string,
    transform: t.optional(t.frozen<NoteTransform>(), identityTransform),
    _fret: t.number,
    _string: t.number,
    _label: t.optional(t.string, ""),
    _shape: t.optional(t.enumeration(["circle", "square"]), "circle"),
    _color: t.optional(t.string, "#000"),
    _outline: t.optional(t.boolean, false),
  })
  .views((self) => ({
    get props() {
      return {
        fret: self._fret + self.transform.fret,
        string: self._string + self.transform.string,
        label: self._label,
        shape: self._shape,
        color: self._color,
        outline: self._outline,
      };
    },
  }))
  .actions((self) => ({
    setLabel(label: string) {
      self._label = label;
    },
    setFret(fret: number) {
      self._fret = fret;
    },
    setString(string: number) {
      self._string = string;
    },
    setColor(color: string) {
      self._color = color;
    },
    setTransform(t: NoteTransform) {
      self.transform = t;
    },
    commitTransform() {
      self._fret = self._fret + self.transform.fret;
      self._string = self._string + self.transform.string;
      self.transform = identityTransform;
    },
  }));

export interface IDot extends Instance<typeof Dot> {}

export const PointerDot = t.model({
  type: optionalLiteral("POINTER"),
  props: t.model({
    fret: t.number,
    string: t.number,
  }),
});

export interface IPointerDot extends Instance<typeof PointerDot> {}

export const Board = t.model({
  minFret: t.optional(t.number, 0),
  maxFret: t.optional(t.number, 9),
  showFretNumbers: t.optional(t.boolean, true),
});

export function getTypedRoot(
  node: IAnyStateTreeNode
): Instance<typeof RootStore> {
  return getRoot(node) as Instance<typeof RootStore>;
}

export const DotNodeReference = t.safeReference(Dot, {
  acceptsUndefined: false,
});

export type NodeInstance = IDot;

export const Selection = t
  .model({
    items: t.optional(t.array(DotNodeReference), []),
  })
  .actions((self) => ({
    replace(nodes: NodeInstance[]) {
      self.items.replace(nodes);
    },
    add(nodes: NodeInstance[]) {
      nodes.forEach((node) => {
        if (!self.items.includes(node)) {
          self.items.push(node);
        }
      });
    },
    toggle(nodes: NodeInstance[]) {
      nodes.forEach((node) => {
        if (!self.items.includes(node)) {
          self.items.push(node);
        } else {
          self.items.remove(node);
        }
      });
    },
    remove(nodes: NodeInstance[]) {
      nodes.forEach((node) => {
        self.items.remove(node);
      });
    },
    clear() {
      self.items.replace([]);
    },
  }))
  .views((self) => ({
    get isEmpty(): boolean {
      return self.items.length === 0;
    },
    get hasItems(): boolean {
      return self.items.length > 0;
    },
    contains(node: NodeInstance) {
      return self.items.includes(node);
    },
  }));

export const BaseInteraction = t
  .model("BaseInteraction", {
    targets: t.optional(Selection, {}),
    start: t.frozen<Point2D>(),
    current: t.frozen<Point2D>(),
  })
  .views((self) => ({
    get currentNote(): NotePlacement {
      const root = getTypedRoot(self);
      return root.board.findNearestNote(self.current.x, self.current.y);
    },
    get startNote(): NotePlacement {
      const root = getTypedRoot(self);
      return root.board.findNearestNote(self.start.x, self.start.y);
    },
    get hasMoved(): boolean {
      return self.start.x !== self.current.x || self.start.y !== self.current.y;
    },
    get rect(): DOMRectReadOnly {
      return new DOMRectReadOnly(
        Math.min(self.start.x, self.current.x),
        Math.min(self.start.y, self.current.y),
        Math.abs(self.start.x - self.current.x),
        Math.abs(self.start.y - self.current.y)
      );
    },
  }));

export const MarqueeSelectInteraction = t
  .compose(
    BaseInteraction,
    t.model({
      type: optionalLiteral("MARQUEE_SELECT"),
      isUsingShift: t.boolean,
    })
  )
  .named("MarqueeSelectInteraction")
  .actions((self) => {
    function selectNodesInRect() {
      const root = getTypedRoot(self);
      const nodesInRect = root.document.findNodesInRect(self.rect);

      if (self.isUsingShift) {
        self.targets.add(nodesInRect);
      } else {
        self.targets.replace(nodesInRect);
      }
    }

    return {
      begin() {
        selectNodesInRect();
      },
      update(point: Point2D) {
        self.current = point;
        selectNodesInRect();
        getTypedRoot(self).document.selection.replace(self.targets.items);
      },
      commit() {
        selectNodesInRect();
        getTypedRoot(self).document.selection.replace(self.targets.items);
      },
    };
  });

export const TranslateInteraction = t
  .compose(
    BaseInteraction,
    t.model({
      type: optionalLiteral("TRANSLATE"),
    })
  )
  .named("TranslateInteraction")
  .views((self) => ({
    get transform(): NoteTransform {
      return {
        fret: self.currentNote.fret - self.startNote.fret,
        string: self.currentNote.string - self.startNote.string,
      };
    },
    get hasMoved(): boolean {
      return (
        self.currentNote.fret !== self.startNote.fret ||
        self.currentNote.string !== self.startNote.string
      );
    },
  }))
  .actions((self) => ({
    begin(targets: NodeInstance[]) {
      self.targets.replace(targets);
    },
    update(point: Point2D) {
      self.current = point;
      self.targets.items.forEach((target) =>
        target.setTransform(self.transform)
      );
    },
    commit() {
      self.targets.items.forEach((target) => target.commitTransform());
    },
  }));

export const AddNoteInteraction = t
  .compose(
    BaseInteraction,
    t.model({
      type: optionalLiteral("ADD_NOTE"),
    })
  )
  .named("AddNoteInteraction")
  .views((self) => ({
    get transform(): NoteTransform {
      return {
        fret: self.currentNote.fret - self.startNote.fret,
        string: self.currentNote.string - self.startNote.string,
      };
    },
    get hasMoved(): boolean {
      return (
        self.currentNote.fret !== self.startNote.fret ||
        self.currentNote.string !== self.startNote.string
      );
    },
  }))
  .actions((self) => ({
    begin() {
      const root = getTypedRoot(self);
      self.targets.replace([root.document.addDot(self.currentNote)]);
    },
    update(point: Point2D) {
      self.current = point;
      self.targets.items.forEach((target) =>
        target.setTransform(self.transform)
      );
    },
    commit() {
      self.targets.items.forEach((target) => target.commitTransform());
      const root = getTypedRoot(self);
      root.document.selection.replace(self.targets.items);
    },
  }));

export const PointerTool = t
  .model({
    interaction: t.maybeNull(
      t.union(
        TranslateInteraction,
        MarqueeSelectInteraction,
        AddNoteInteraction
      )
    ),
    initialTarget: t.maybeNull(DotNodeReference),
    hoveredNode: t.maybeNull(DotNodeReference),
    hoveredPointer: t.maybeNull(PointerDot),
    isUsingShift: t.optional(t.boolean, false),
  })
  .actions((self) => {
    return {
      down(point: Point2D, shiftKey?: boolean) {
        const root = getTypedRoot(self);
        getUndoManager().startGroup();

        const isPointInBoard = root.board.isPointInBoard(point.x, point.y);
        const nearestNote = root.board.findNearestNote(point.x, point.y);
        const node = root.document.firstNodeAtCoord(nearestNote);

        if (isPointInBoard) {
          if (shiftKey) {
            self.isUsingShift = true;
          }

          self.hoveredPointer = null;
          self.hoveredNode = null;

          if (node) {
            self.initialTarget = node;

            if (root.document.selection.isEmpty || self.isUsingShift) {
              root.document.selection.toggle([node]);
            } else if (!root.document.selection.contains(node)) {
              root.document.selection.replace([node]);
            }

            self.interaction = TranslateInteraction.create({
              start: point,
              current: point,
            });
          } else {
            self.interaction = AddNoteInteraction.create({
              start: point,
              current: point,
            });
          }
        } else {
          self.hoveredPointer = null;
          self.hoveredNode = null;

          self.interaction = MarqueeSelectInteraction.create({
            start: point,
            current: point,
            isUsingShift: shiftKey ?? false,
          });
        }
        self.interaction.begin(root.document.selection.items);
      },
      move(p2: Point2D) {
        const root = getTypedRoot(self);
        const point = root.board.findNearestNote(p2.x, p2.y);
        const isPointInBoard = root.board.isPointInBoard(p2.x, p2.y);
        self.interaction?.update(p2);

        if (!self.interaction) {
          if (isPointInBoard) {
            const nodes = getTypedRoot(self).document.entitiesAtCoord(point);
            if (nodes.length > 0) {
              self.hoveredNode = nodes[0];
              self.hoveredPointer = null;
            } else {
              self.hoveredNode = null;
              self.hoveredPointer = PointerDot.create({
                props: {
                  fret: point.fret,
                  string: point.string,
                },
              });
            }
          } else {
            self.hoveredPointer = null;
            self.hoveredNode = null;
          }
        }
      },
      up() {
        if (
          !self.interaction?.hasMoved &&
          !self.isUsingShift &&
          self.initialTarget
        ) {
          getTypedRoot(self).document.selection.replace([self.initialTarget]);
        }

        self.interaction?.commit();
        self.interaction = null;
        self.isUsingShift = false;
        self.initialTarget = null;
        getUndoManager().stopGroup();
      },
    };
  });

export const DocumentNode = t
  .model("DocumentNode", {
    board: t.optional(Board, {}),
    entities: t.array(Dot),
    selection: t.optional(Selection, {}),
  })
  .views((self) => ({
    entitiesAtCoord({ fret, string }: StringAndFret) {
      return self.entities.filter(
        (e) => e.props.fret === fret && e.props.string === string
      );
    },
    firstNodeAtCoord({ fret, string }: StringAndFret) {
      return self.entities.find(
        (e) => e.props.fret === fret && e.props.string === string
      );
    },
    findNodesInRect(rect: DOMRectReadOnly): NodeInstance[] {
      return self.entities.filter((e) => {
        const root = getTypedRoot(self);
        const { fret, string } = e.props;
        const x = root.board.fretToX(fret);
        const y = root.board.stringToY(string);
        return (
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        );
      });
    },
  }))
  .actions((self) => ({
    addDot({ fret, string }: StringAndFret) {
      const dot = Dot.create({
        name: `Marker ${self.entities.length + 1}`,
        _fret: fret,
        _string: string,
      });

      self.entities.push(dot);
      return dot;
    },
    deleteEntities(entities: IDot[]) {
      entities.forEach((entity) => {
        self.selection.remove([entity]);
        self.entities.remove(entity);
      });
    },
    selectAll() {
      self.selection.replace(self.entities);
    },
  }));

export interface IDocumentNodeInstance extends Instance<typeof DocumentNode> {}

export const ZoomState = t
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

const BoardData = t
  .model()
  .volatile((self) => ({
    findNearestNote(x: number, y: number): NotePlacement {
      throw new Error("Please call setFindNearestNote first");
    },
    extent: new DOMRectReadOnly(),
    stringToY(string: number): number {
      throw new Error("Please call setStringToY first");
    },
    fretToX(fret: number): number {
      throw new Error("Please call setStringToY first");
    },
  }))
  .actions((self) => ({
    setFindNearestNote(fn: (x: number, y: number) => NotePlacement) {
      self.findNearestNote = fn;
    },
    setStringToY(fn: (string: number) => number) {
      self.stringToY = fn;
    },
    setFretToX(fn: (fret: number) => number) {
      self.fretToX = fn;
    },
    setExtent(extent: DOMRectReadOnly) {
      self.extent = extent;
    },
  }))
  .views((self) => ({
    isPointInBoard(x: number, y: number) {
      return (
        x >= self.extent.left &&
        x <= self.extent.right &&
        y >= self.extent.top &&
        y <= self.extent.bottom
      );
    },
  }));

export const RootStore = t.model({
  document: t.optional(DocumentNode, {}),
  tool: t.optional(PointerTool, {}),
  zoom: t.optional(ZoomState, {}),
  board: t.optional(BoardData, {}),
});

export interface IRootStore extends Instance<typeof RootStore> {}

const undoManagerContainer: IObservableValue<UndoManagerInstance | null> =
  observable.box(null);

export const setUndoManager = action(
  (targetStore: IDocumentNodeInstance): void => {
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
