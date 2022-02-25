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
type NodeInstance = IDot;

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

export const BaseInteraction = t.model("BaseInteraction", {
  targets: t.optional(Selection, {}),
  start: t.frozen<NotePlacement>(),
  current: t.frozen<NotePlacement>(),
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
        fret: self.current.fret - self.start.fret,
        string: self.current.string - self.start.string,
      };
    },
    get hasMoved(): boolean {
      return (
        self.current.fret !== self.start.fret ||
        self.current.string !== self.start.string
      );
    },
  }))
  .actions((self) => ({
    begin(targets: NodeInstance[]) {
      self.targets.replace(targets);
    },
    update(point?: NotePlacement) {
      if (point) {
        self.current = point;
        self.targets.items.forEach((target) =>
          target.setTransform(self.transform)
        );
      }
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
        fret: self.current.fret - self.start.fret,
        string: self.current.string - self.start.string,
      };
    },
    get hasMoved(): boolean {
      return (
        self.current.fret !== self.start.fret ||
        self.current.string !== self.start.string
      );
    },
  }))
  .actions((self) => ({
    begin() {
      const root = getTypedRoot(self);
      self.targets.replace([root.document.addDot(self.current)]);
    },
    update(point?: NotePlacement) {
      if (point) {
        self.current = point;
        self.targets.items.forEach((target) =>
          target.setTransform(self.transform)
        );
      }
    },
    commit() {
      self.targets.items.forEach((target) => target.commitTransform());
      const root = getTypedRoot(self);
      root.document.selection.replace(self.targets.items);
    },
  }));

export const PointerTool = t
  .model({
    interaction: t.maybeNull(t.union(TranslateInteraction, AddNoteInteraction)),
    initialTarget: t.maybeNull(DotNodeReference),
    hoveredNode: t.maybeNull(DotNodeReference),
    hoveredPointer: t.maybeNull(PointerDot),
    isUsingShift: t.optional(t.boolean, false),
  })
  .actions((self) => {
    return {
      down(point?: NotePlacement, shiftKey?: boolean) {
        const root = getTypedRoot(self);
        getUndoManager().startGroup();

        if (point) {
          const node = root.document.firstNodeAtCoord(point);

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

          self.interaction.begin(root.document.selection.items);
        } else {
          root.document.selection.clear();
        }
      },
      move(point?: NotePlacement) {
        self.interaction?.update(point);

        if (!self.interaction) {
          if (point) {
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
  }));

export interface IDocumentNodeInstance extends Instance<typeof DocumentNode> {}

export const RootStore = t.model({
  document: t.optional(DocumentNode, {}),
  tool: t.optional(PointerTool, {}),
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
