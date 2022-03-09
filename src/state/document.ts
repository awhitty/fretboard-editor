import { Instance, types as t } from "mobx-state-tree";
import { optionalLiteral } from "./optional_literal";
import { ulid } from "ulid";
import { NoteTransform, StringAndFret } from "../types";
import { identityTransform } from "./note_transforms";
import { getTypedRoot } from "./root_store";

const LabelKind = t.union(t.literal("note-name"), t.literal("manual"));

export const DotMarkerNode = t
  .model("DotMarkerNode", {
    type: optionalLiteral("DOT_MARKER_NODE"),
    id: t.optional(t.identifier, () => ulid()),
    name: t.string,
    transform: t.optional(t.frozen<NoteTransform>(), identityTransform),
    _fret: t.number,
    _string: t.number,
    _labelKind: t.optional(LabelKind, "manual"),
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
        labelKind: self._labelKind,
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
    setLabelKind(kind: "note-name" | "manual") {
      self._labelKind = kind;
    },
    setShape(shape: "circle" | "square") {
      self._shape = shape;
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

const getWidgetValue = <V extends any>(
  items: DotMarkerNodeInstance[],
  accessor: (v: DotMarkerNodeInstance) => V,
  emptyDefault: V,
  mixedDefault: V
): V =>
  items.reduce(
    (prev, curr) => (prev === accessor(curr) ? prev : mixedDefault),
    items.length > 0 ? accessor(items[0]) : emptyDefault
  );

const SetLabelAction = t
  .model("SetLabelAction", {
    type: optionalLiteral("SET_LABEL"),
  })
  .views((self) => ({
    get labelKind(): "note-name" | "manual" | "mixed" {
      const root = getTypedRoot(self);
      return getWidgetValue(
        root.document.selection.items,
        (v) => v._labelKind,
        "note-name",
        "mixed"
      );
    },
    get label(): string | "mixed" {
      const root = getTypedRoot(self);
      return getWidgetValue(
        root.document.selection.items,
        (v) => v._label,
        "",
        "mixed"
      );
    },
  }))
  .actions((self) => ({
    setLabel(label: string): void {
      this.setKind("manual");
      const root = getTypedRoot(self);
      root.document.selection.items.forEach((item) => item.setLabel(label));
    },
    setKind(kind: "note-name" | "manual"): void {
      const root = getTypedRoot(self);
      root.document.selection.items.forEach((item) => item.setLabelKind(kind));
    },
    clearLabel(): void {
      this.setLabel("");
    },
  }));

const SetShapeAction = t
  .model("SetShapeAction", {
    type: optionalLiteral("SET_SHAPE"),
  })
  .views((self) => ({
    get shape(): "circle" | "square" | "mixed" {
      const root = getTypedRoot(self);
      return getWidgetValue(
        root.document.selection.items,
        (v) => v._shape,
        "circle",
        "mixed"
      );
    },
  }))
  .actions((self) => ({
    setShape(shape: "circle" | "square"): void {
      const root = getTypedRoot(self);
      root.document.selection.items.forEach((item) => item.setShape(shape));
    },
  }));

const SetColorAction = t
  .model("SetColorAction", {
    type: optionalLiteral("SET_COLOR"),
  })
  .views((self) => ({
    get color(): string | "mixed" {
      const root = getTypedRoot(self);
      return getWidgetValue(
        root.document.selection.items,
        (v) => v._color,
        "black",
        "mixed"
      );
    },
  }))
  .actions((self) => ({
    setColor(color: string): void {
      const root = getTypedRoot(self);
      root.document.selection.items.forEach((item) => item.setColor(color));
    },
  }));

export const Selection = t
  .model({
    items: t.optional(t.array(DotNodeReference), []),
    action: t.maybeNull(
      t.union(SetLabelAction, SetShapeAction, SetColorAction)
    ),
  })

  .actions((self) => ({
    startAction(action: "label" | "shape" | "color"): void {
      switch (action) {
        case "label":
          self.action = SetLabelAction.create({});
          break;
        case "shape":
          self.action = SetShapeAction.create({});
          break;
        case "color":
          self.action = SetColorAction.create({});
          break;
      }
    },
    clearAction(): void {
      self.action = null;
    },
    clearActionIfEmpty() {
      if (self.items.length === 0) {
        this.clearAction();
      }
    },
    replace(nodes: AnyNodeInstance[]) {
      self.items.replace(nodes);
      this.clearActionIfEmpty();
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
      this.clearActionIfEmpty();
    },
    remove(nodes: AnyNodeInstance[]) {
      nodes.forEach((node) => {
        self.items.remove(node);
      });
      this.clearActionIfEmpty();
    },
    clear() {
      self.items.replace([]);
      this.clearActionIfEmpty();
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
    deleteSelection() {
      self.selection.items.forEach((entity) => {
        self.selection.remove([entity]);
        self.entities.remove(entity);
      });
    },
    selectAll() {
      self.selection.replace(self.entities);
    },
  }));

export interface DocumentNodeInstance extends Instance<typeof DocumentNode> {}
