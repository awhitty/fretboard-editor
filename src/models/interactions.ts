import { Instance, types as t } from "mobx-state-tree";
import { optionalLiteral } from "./optional_literal";
import { NotePlacement, NoteTransform, Point2D } from "../types";
import { AnyNodeInstance, Selection } from "./document";
import { getTypedRoot } from "./root_store";

export const PointerDot = t.model("PointerDot", {
  type: optionalLiteral("POINTER_DOT"),
  props: t.model({
    fret: t.number,
    string: t.number,
  }),
});

export interface PointerDotInstance extends Instance<typeof PointerDot> {}

export const BaseInteraction = t
  .model("BaseInteraction", {
    targets: t.optional(Selection, {}),
    start: t.frozen<Point2D>(),
    current: t.frozen<Point2D>(),
  })
  .views((self) => ({
    get currentNote(): NotePlacement {
      const root = getTypedRoot(self);
      return root.document.fretboard.layout.findNearestNote(
        self.current.x,
        self.current.y
      );
    },
    get startNote(): NotePlacement {
      const root = getTypedRoot(self);
      return root.document.fretboard.layout.findNearestNote(
        self.start.x,
        self.start.y
      );
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
    get transform(): NoteTransform {
      return {
        fret: this.currentNote.fret - this.startNote.fret,
        string: this.currentNote.string - this.startNote.string,
      };
    },
    get hasMovedNote(): boolean {
      return (
        this.currentNote.fret !== this.startNote.fret ||
        this.currentNote.string !== this.startNote.string
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
  .actions((self) => ({
    begin(targets: AnyNodeInstance[]) {
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

export const CreateDotMarkerInteraction = t
  .compose(
    BaseInteraction,
    t.model({
      type: optionalLiteral("CREATE_DOT_MARKER"),
    })
  )
  .named("CreateDotMarkerInteraction")
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
