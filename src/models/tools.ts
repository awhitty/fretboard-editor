import { Instance, types as t } from "mobx-state-tree";
import { DotNodeReference } from "./document";
import { Point2D } from "../types";
import { getTypedRoot } from "./root_store";
import { getUndoManager } from "./undo";
import {
  CreateDotMarkerInteraction,
  MarqueeSelectInteraction,
  PointerDot,
  TranslateInteraction,
} from "./interactions";
import { optionalLiteral } from "./optional_literal";

export const PointerTool = t
  .model("PointerTool", {
    type: optionalLiteral("POINTER_TOOL"),
    interaction: t.maybeNull(
      t.union(TranslateInteraction, MarqueeSelectInteraction)
    ),
    initialTarget: t.maybeNull(DotNodeReference),
    hoveredNode: t.maybeNull(DotNodeReference),
    isUsingShift: t.optional(t.boolean, false),
  })
  .actions((self) => ({
    down(point: Point2D, shiftKey?: boolean) {
      const root = getTypedRoot(self);
      getUndoManager().startGroup();

      const isPointInBoard = root.document.fretboard.layout.isPointInBoard(
        point.x,
        point.y
      );
      const nearestNote = root.document.fretboard.layout.findNearestNote(
        point.x,
        point.y
      );
      const node = isPointInBoard
        ? root.document.firstNodeAtCoord(nearestNote)
        : null;

      if (shiftKey) {
        self.isUsingShift = true;
      }

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
        self.interaction = MarqueeSelectInteraction.create({
          start: point,
          current: point,
          isUsingShift: shiftKey ?? false,
        });
      }

      self.interaction?.begin(root.document.selection.items);
    },
    move(point: Point2D) {
      const root = getTypedRoot(self);
      const notePlacement = root.document.fretboard.layout.findNearestNote(
        point.x,
        point.y
      );
      const isPointInBoard = root.document.fretboard.layout.isPointInBoard(
        point.x,
        point.y
      );

      if (self.interaction) {
        self.interaction.update(point);
      } else if (isPointInBoard) {
        self.hoveredNode =
          getTypedRoot(self).document.firstNodeAtCoord(notePlacement) ?? null;
      } else {
        self.hoveredNode = null;
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
  }));

export interface PointerToolInstance extends Instance<typeof PointerTool> {}

export const CreateTool = t
  .model("CreateTool", {
    type: optionalLiteral("CREATE_TOOL"),
    interaction: t.maybeNull(t.union(CreateDotMarkerInteraction)),
    hoveredPointer: t.maybeNull(PointerDot),
  })
  .actions((self) => ({
    down(point: Point2D, shiftKey?: boolean) {
      const root = getTypedRoot(self);
      getUndoManager().startGroup();

      const isPointInBoard = root.document.fretboard.layout.isPointInBoard(
        point.x,
        point.y
      );

      if (isPointInBoard) {
        self.hoveredPointer = null;

        self.interaction = CreateDotMarkerInteraction.create({
          start: point,
          current: point,
        });

        self.interaction.begin();
      }
    },
    move(point: Point2D) {
      const root = getTypedRoot(self);
      const notePlacement = root.document.fretboard.layout.findNearestNote(
        point.x,
        point.y
      );
      const isPointInBoard = root.document.fretboard.layout.isPointInBoard(
        point.x,
        point.y
      );

      if (self.interaction) {
        self.interaction.update(point);
      } else if (isPointInBoard) {
        self.hoveredPointer = PointerDot.create({
          props: {
            fret: notePlacement.fret,
            string: notePlacement.string,
          },
        });
      } else {
        self.hoveredPointer = null;
      }
    },
    up() {
      self.interaction?.commit();
      self.interaction = null;
      getUndoManager().stopGroup();
    },
  }));

export interface CreateToolInstance extends Instance<typeof CreateTool> {}
