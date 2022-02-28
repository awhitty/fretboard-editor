import { Instance, types as t } from "mobx-state-tree";
import { optionalLiteral } from "./optional_literal";
import { ulid } from "ulid";
import { NoteTransform, StringAndFret } from "../types";
import { identityTransform } from "./note_transforms";
import { getTypedRoot } from "./root_store";

export const DotMarkerNode = t
  .model("DotMarkerNode", {
    type: optionalLiteral("DOT_MARKER_NODE"),
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

export interface DotMarkerNodeInstance extends Instance<typeof DotMarkerNode> {}

export const BoardConfig = t.model({
  minFret: t.optional(t.number, 0),
  maxFret: t.optional(t.number, 9),
  showFretNumbers: t.optional(t.boolean, true),
});

export const DotNodeReference = t.safeReference(DotMarkerNode, {
  acceptsUndefined: false,
});

export type AnyNodeInstance = DotMarkerNodeInstance;

export const Selection = t
  .model({
    items: t.optional(t.array(DotNodeReference), []),
  })
  .actions((self) => ({
    replace(nodes: AnyNodeInstance[]) {
      self.items.replace(nodes);
    },
    add(nodes: AnyNodeInstance[]) {
      nodes.forEach((node) => {
        if (!self.items.includes(node)) {
          self.items.push(node);
        }
      });
    },
    toggle(nodes: AnyNodeInstance[]) {
      nodes.forEach((node) => {
        if (!self.items.includes(node)) {
          self.items.push(node);
        } else {
          self.items.remove(node);
        }
      });
    },
    remove(nodes: AnyNodeInstance[]) {
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
    contains(node: AnyNodeInstance) {
      return self.items.includes(node);
    },
  }));

export const DocumentNode = t
  .model("DocumentNode", {
    boardConfig: t.optional(BoardConfig, {}),
    entities: t.array(DotMarkerNode),
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
    findNodesInRect(rect: DOMRectReadOnly): AnyNodeInstance[] {
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
      const dot = DotMarkerNode.create({
        name: `Marker ${self.entities.length + 1}`,
        _fret: fret,
        _string: string,
      });

      self.entities.push(dot);
      return dot;
    },
    deleteEntities(entities: DotMarkerNodeInstance[]) {
      entities.forEach((entity) => {
        self.selection.remove([entity]);
        self.entities.remove(entity);
      });
    },
    selectAll() {
      self.selection.replace(self.entities);
    },
  }));

export interface DocumentNodeInstance extends Instance<typeof DocumentNode> {}
