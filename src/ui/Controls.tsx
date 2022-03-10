import React, { ReactNode } from "react";
import * as Lucide from "lucide-react";
import { LucideProps } from "lucide-react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  SetColorActionInstance,
  SetLabelActionInstance,
  SetShapeActionInstance,
} from "../models/document";
import { useRootStore } from "../hooks/useRootStore";
import { styled } from "../stitches.config";
import { observer } from "mobx-react-lite";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { getUndoManager } from "../models/undo";
import { match } from "ts-pattern";
import { Palette } from "./Palette";

const Box = styled("div");

const BottomControls = styled("div", {
  hStack: 8,
  position: "absolute",
  bottom: 12,
  left: 12,
  right: 12,
  padding: 8,
});

const TopControls = styled("div", {
  hStack: 8,
  justifyContent: "center",
  position: "absolute",
  top: 12,
  left: 12,
  right: 12,
  padding: 8,
});

const LeftControls = styled("div", {
  $$edgeButtonDirection: "row",
  vStack: 8,
  alignItems: "flex-start",
  justifyContent: "center",
  position: "absolute",
  top: 12,
  bottom: 12,
  left: 12,
  padding: 8,
});

const ControlSpacer = styled("div", {
  width: 8,
  height: 8,
});

const RightControls = styled("div", {
  $$edgeButtonDirection: "row-reverse",
  vStack: 8,
  alignItems: "flex-end",
  justifyContent: "center",
  position: "absolute",
  top: 12,
  bottom: 12,
  right: 12,
  padding: 8,
});

const EdgeButtonContainer = styled("button", {
  hStack: 12,
  padding: 0,
  border: 0,
  background: "none",
  outline: "none",
  color: "rgb(60,60,60)",
  appearance: "none",
  "-webkit-tap-highlight-color": "transparent",
  userSelect: "none",
  flexDirection: "$$edgeButtonDirection",
  "&:hover": { background: "none" },
  "&:disabled": {
    color: "rgb(180,180,180)",
  },
});

const EdgeButtonIcon = styled("div", {
  display: "flex",
  height: 48,
  width: 48,
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(180,180,180,0.3)",
  color: "rgb(80,80,80)",
  border: "none",
  borderRadius: 100,
  backdropFilter: "blur(4px)",
  boxShadow: "0 0 0 0 #009EE9aa",
  variants: {
    isSelected: {
      true: {
        color: "#009EE9ff",
        background: "rgba(255,255,255,.6)",
        boxShadow: "0 0 0 2px #009EE9aa",
        "&:hover:not(:disabled)": {
          color: "#009EE9ff",
          background: "rgba(255,255,255,.6)",
        },
      },
      false: {},
    },
    isDisabled: {
      true: {
        background: "rgba(60,60,60,0.05)",
        color: "rgb(180,180,180)",
      },
      false: {},
    },
    isFilled: {
      true: {
        "& svg": {
          fill: "$$fillColor",
          stroke: "$$fillColor",
        },
      },
    },
  },
});

const EdgeButtonLabel = styled("div", {
  fontSize: 13,
  fontWeight: 500,
});

const leftEdgeVariants: Variants = {
  initial: { x: -72 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.4,
      bounce: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      type: "tween",
    },
  },
};

const bottomEdgeVariants: Variants = {
  initial: { y: 72 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.4,
      bounce: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      type: "tween",
    },
  },
};

const topEdgeVariants: Variants = {
  initial: { y: -72 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.4,
      bounce: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      type: "tween",
    },
  },
};

const rightEdgeVariants: Variants = {
  initial: { x: 72 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.4,
      bounce: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      type: "tween",
    },
  },
};

const EdgeButton = ({
  Icon,
  label,
  fillColor,
  isSelected = false,
  isDisabled = false,
  iconOnly = false,
  onClick,
}: {
  Icon: React.FC<LucideProps>;
  label: ReactNode;
  isSelected?: boolean;
  isDisabled?: boolean;
  fillColor?: string;
  iconOnly?: boolean;
  onClick?: () => void;
}) => {
  return (
    <EdgeButtonContainer
      as={motion.button}
      whileTap={!isDisabled ? { scale: 0.9 } : undefined}
      whileHover={!isDisabled ? { scale: 1.1 } : undefined}
      disabled={isDisabled}
      onClick={onClick}
      css={{ $$fillColor: fillColor }}
    >
      {iconOnly ? (
        <>
          <EdgeButtonIcon
            isSelected={isSelected}
            isFilled={!!fillColor}
            isDisabled={isDisabled}
          >
            <Icon size={20} />
          </EdgeButtonIcon>
          <VisuallyHidden.Root>
            <EdgeButtonLabel>{label}</EdgeButtonLabel>
          </VisuallyHidden.Root>
        </>
      ) : (
        <>
          <EdgeButtonIcon isSelected={isSelected} isDisabled={isDisabled}>
            <Icon size={20} />
          </EdgeButtonIcon>
          <EdgeButtonLabel>{label}</EdgeButtonLabel>
        </>
      )}
    </EdgeButtonContainer>
  );
};

const SetLabelControls = (props: { action: SetLabelActionInstance }) => {
  const rootStore = useRootStore();
  return (
    <RightControls
      as={motion.div}
      key="set-label-buttons"
      variants={rightEdgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <EdgeButton
        key="back"
        Icon={Lucide.ArrowRight}
        label="Back"
        onClick={rootStore.document.selection.clearAction}
      />
      <ControlSpacer />
      <EdgeButton
        key="auto"
        Icon={Lucide.Asterisk}
        label="Automatic"
        onClick={() => props.action.setKind("note-name")}
      />
      <EdgeButton
        key="clear"
        Icon={Lucide.XCircle}
        label="Clear"
        onClick={props.action.clearLabel}
      />
    </RightControls>
  );
};

const SetColorControls = ({ action }: { action: SetColorActionInstance }) => {
  const rootStore = useRootStore();
  return (
    <RightControls
      as={motion.div}
      key="set-label-buttons"
      variants={rightEdgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <EdgeButton
        key="back"
        Icon={Lucide.ArrowRight}
        label="Back"
        onClick={rootStore.document.selection.clearAction}
      />
      <ControlSpacer />
      <EdgeButton
        key="black"
        Icon={Lucide.Circle}
        iconOnly
        label="Dark"
        fillColor={Palette.Dark}
        onClick={() => action.setColor(Palette.Dark)}
      />
      <EdgeButton
        key="black"
        Icon={Lucide.Circle}
        iconOnly
        label="Medium"
        fillColor={Palette.Medium}
        onClick={() => action.setColor(Palette.Medium)}
      />
      <EdgeButton
        key="blue"
        Icon={Lucide.Circle}
        iconOnly
        label="Blue"
        fillColor={Palette.Blue}
        onClick={() => action.setColor(Palette.Blue)}
      />
      <EdgeButton
        key="red"
        Icon={Lucide.Circle}
        iconOnly
        label="Red"
        fillColor={Palette.Red}
        onClick={() => action.setColor(Palette.Red)}
      />
      <EdgeButton
        key="green"
        Icon={Lucide.Circle}
        iconOnly
        label="Mustard"
        fillColor={Palette.Mustard}
        onClick={() => action.setColor(Palette.Mustard)}
      />
    </RightControls>
  );
};

const SetShapeControls = ({ action }: { action: SetShapeActionInstance }) => {
  const rootStore = useRootStore();
  return (
    <RightControls
      as={motion.div}
      key="set-label-buttons"
      variants={rightEdgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <EdgeButton
        key="back"
        Icon={Lucide.ArrowRight}
        label="Back"
        onClick={rootStore.document.selection.clearAction}
      />
      <ControlSpacer />
      <EdgeButton
        key="black"
        Icon={Lucide.Circle}
        label="Circle"
        onClick={() => action.setShape("circle")}
      />
      <EdgeButton
        key="black"
        Icon={Lucide.Square}
        label="Square"
        onClick={() => action.setShape("square")}
      />
    </RightControls>
  );
};

const ActionControls = observer(() => {
  const rootStore = useRootStore();
  const action = rootStore.document.selection.action;

  return (
    <AnimatePresence>
      {match(action)
        .with({ type: "SET_LABEL" }, (action) => (
          <SetLabelControls action={action} />
        ))
        .with({ type: "SET_COLOR" }, (action) => (
          <SetColorControls action={action} />
        ))
        .with({ type: "SET_SHAPE" }, (action) => (
          <SetShapeControls action={action} />
        ))
        .otherwise(() => null)}
    </AnimatePresence>
  );
});

const SelectionControls = observer(() => {
  const rootStore = useRootStore();
  const action = rootStore.document.selection.action;
  return (
    <AnimatePresence>
      {!action && rootStore.document.selection.hasItems && (
        <RightControls
          as={motion.div}
          key="selection-buttons"
          variants={rightEdgeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <EdgeButton
            key="deselect"
            Icon={Lucide.X}
            label="Deselect"
            onClick={rootStore.document.selection.clear}
          />
          <ControlSpacer />
          <EdgeButton
            key="label"
            Icon={Lucide.Type}
            label="Label"
            onClick={() => rootStore.document.selection.startAction("label")}
          />
          <EdgeButton
            key="shape"
            Icon={Lucide.Square}
            label="Shape"
            onClick={() => rootStore.document.selection.startAction("shape")}
          />
          <EdgeButton
            key="color"
            Icon={Lucide.Palette}
            label="Color"
            onClick={() => rootStore.document.selection.startAction("color")}
          />
          {/*<EdgeButton key="style" Icon={Lucide.Brush} label="Style" />*/}
          <ControlSpacer />
          <EdgeButton
            key="delete"
            Icon={Lucide.Trash}
            label="Delete"
            onClick={rootStore.document.deleteSelection}
          />
        </RightControls>
      )}
    </AnimatePresence>
  );
});

const ChooseToolControls = observer(() => {
  const rootStore = useRootStore();
  return (
    <AnimatePresence>
      <LeftControls
        key="tool-select"
        as={motion.div}
        variants={leftEdgeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <EdgeButton
          Icon={Lucide.MousePointer2}
          label="Select"
          onClick={() => rootStore.setToolType("POINTER_TOOL")}
          isSelected={rootStore.tool.type === "POINTER_TOOL"}
        />
        <EdgeButton
          Icon={Lucide.Pencil}
          label="Add"
          onClick={() => rootStore.setToolType("CREATE_TOOL")}
          isSelected={rootStore.tool.type === "CREATE_TOOL"}
        />
      </LeftControls>
    </AnimatePresence>
  );
});

const SetLabelInputControls = observer(() => {
  const rootStore = useRootStore();
  return (
    <AnimatePresence>
      {rootStore.document.selection.action?.type === "SET_LABEL" && (
        <TopControls
          key="label-editor"
          as={motion.div}
          variants={topEdgeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Box
            as="input"
            css={{
              border: "none",
              borderRadius: 8,
              marginTop: 24,
              boxShadow: "0px 0px 0px 0px #009EE9aa",
              transition: "box-shadow 0.2s ease-out",
              fontSize: 28,
              padding: 8,
              outline: "none",
              backdropFilter: "blur(4px)",
              background: "rgba(255,255,255,.8)",
              color: "rgb(80,80,80)",
              "&:focus": {
                boxShadow: "0px 0px 0px 2px #009EE9aa",
              },
            }}
            type="text"
            value={rootStore.document.selection.action.label}
            onChange={(e: any) =>
              (rootStore.document.selection.action! as any).setLabel(
                e.currentTarget.value
              )
            }
          />
        </TopControls>
      )}
    </AnimatePresence>
  );
});

const UndoRedoExportControls = observer(() => {
  const copyToClipboard = useCopyToClipboard();
  const undoManager = getUndoManager();
  return (
    <AnimatePresence>
      <BottomControls
        as={motion.div}
        variants={bottomEdgeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <EdgeButton
          key="undo"
          Icon={Lucide.Undo}
          iconOnly
          label="Undo"
          isDisabled={!undoManager.canUndo}
          onClick={undoManager.undo}
        />
        <EdgeButton
          key="redo"
          Icon={Lucide.Redo}
          iconOnly
          label="Redo"
          isDisabled={!undoManager.canRedo}
          onClick={undoManager.redo}
        />
        <Box css={{ marginLeft: "auto", hStack: 8 }}>
          <EdgeButton
            key="copy"
            Icon={Lucide.Clipboard}
            iconOnly
            label="Copy to clipboard"
            onClick={copyToClipboard}
          />
        </Box>
      </BottomControls>
    </AnimatePresence>
  );
});

export const Controls = observer(() => {
  return (
    <>
      <SelectionControls />
      <ActionControls />
      <ChooseToolControls />
      <SetLabelInputControls />
      <UndoRedoExportControls />
    </>
  );
});
