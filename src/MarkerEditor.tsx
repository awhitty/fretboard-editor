import { observer } from "mobx-react-lite";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { useHotkeys } from "react-hotkeys-hook";
import { RootStoreInstance } from "./state/root_store";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Lucide from "lucide-react";
import { LucideProps } from "lucide-react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  DotMarks,
  Fretboard,
  FretboardData,
  FretMarks,
  FretNumbers,
  NoteMarker,
  StringMarks,
  StringNames,
  useFretboardData,
} from "./Fretboard";
import React, {
  createContext,
  ForwardedRef,
  InputHTMLAttributes,
  ReactNode,
  SVGAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as d3 from "d3";
import { ZoomBehavior } from "d3";
import { styled } from "./stitches.config";
import { ulid } from "ulid";
import useMeasure from "react-use-measure";
import { renderToString } from "react-dom/server";
import { AnyNodeInstance, DotMarkerNodeInstance } from "./state/document";
import { getUndoManager } from "./state/undo";
import { CreateToolInstance, PointerToolInstance } from "./state/tools";

const Box = styled("div");

const EditorLayout = styled("div", {
  height: "100%",
  width: "100%",
});

const StyledSVG = styled("svg", {
  outline: "none",
  userSelect: "none",
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

const NiceButton = styled("button", {
  background: "#eee",
  padding: "4px 8px",
  border: "none",
  borderRadius: 4,
});

const RoundButton = styled("button", {
  display: "flex",
  height: 48,
  width: 48,
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(120,120,120,0.2)",
  color: "rgb(123,123,124)",
  border: "none",
  borderRadius: 100,
  backdropFilter: "blur(4px)",
  "&:hover:not(:disabled)": {
    background: "rgba(0,0,0,0.15)",
    color: "rgb(80,80,80)",
  },
  "&:disabled": { background: "rgba(0,0,0,0.05)", color: "rgb(180,180,180)" },
  variants: {
    isActive: {
      true: {
        color: "#009EE9ff",
        background: "rgba(255,255,255,.6)",
        boxShadow: "0px 0px 0px 2px #009EE9aa",
        "&:hover:not(:disabled)": {
          color: "#009EE9ff",
          background: "rgba(255,255,255,.6)",
        },
      },
      false: {},
    },
  },
});

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

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

const StaticFretboard = () => {
  const rootStore = useRootStore();
  return (
    <Fretboard>
      {rootStore.document.entities.map((model) => (
        <NoteMarker key={model.id} {...model.props} />
      ))}
    </Fretboard>
  );
};

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    const msg = successful ? "successful" : "unsuccessful";
    console.log("Fallback: Copying text command was " + msg);
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(
    function () {
      console.log("Async: Copying to clipboard was successful!");
    },
    function (err) {
      console.error("Async: Could not copy text: ", err);
    }
  );
}

const useCopyToClipboard = () => {
  const rootStore = useRootStore();
  return useCallback(() => {
    const text = renderToString(
      <RootStoreContext.Provider value={rootStore}>
        <FretboardData
          minFret={rootStore.document.boardConfig.minFret}
          maxFret={rootStore.document.boardConfig.maxFret}
          showFretNumbers={rootStore.document.boardConfig.showFretNumbers}
        >
          <StaticFretboard />
        </FretboardData>
      </RootStoreContext.Provider>
    );
    copyTextToClipboard(text);
  }, [rootStore]);
};

function useSpaceIsPressed() {
  const spaceIsPressed = useRef(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        spaceIsPressed.current = true;
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        spaceIsPressed.current = false;
      }
    };

    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });
  return spaceIsPressed;
}

function useD3Zoom(root: RootStoreInstance) {
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

export const ScalingFretboard = observer(
  (
    {
      width,
      height,
      ...props
    }: { width: number; height: number } & SVGAttributes<SVGSVGElement>,
    ref: ForwardedRef<SVGSVGElement>
  ) => {
    const { showFretNumbers, showStringNames } = useFretboardData();

    const root = useRootStore();

    return (
      <StyledSVG
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        {...(props as any)}
      >
        <g transform={root.viewport.zoomState.toString()}>
          <FretMarks />
          <DotMarks />
          <StringMarks />
          {showStringNames && <StringNames />}
          {showFretNumbers && <FretNumbers />}
          <ScalingGraphics />
        </g>
        <NonScalingGraphics />
      </StyledSVG>
    );
  },
  {
    forwardRef: true,
  }
);

const SelectionMarker = observer(({ node }: { node: AnyNodeInstance }) => {
  const { fretToFingerX, stringToY } = useFretboardData();
  const root = useRootStore();

  const [cx, cy] = root.viewport.worldToViewport(
    fretToFingerX(node.props.fret),
    stringToY(node.props.string)
  );

  const r = root.viewport.worldValueToViewportValue(13);

  return (
    <>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="#009EE9ff"
        strokeWidth="1.5"
        fill="none"
      />
      {/*<circle*/}
      {/*  cx={cx}*/}
      {/*  cy={cy - r}*/}
      {/*  r={4}*/}
      {/*  stroke="#009EE9ff"*/}
      {/*  strokeWidth="1.5"*/}
      {/*  fill="#fff"*/}
      {/*/>*/}
      {/*<circle*/}
      {/*  cx={cx}*/}
      {/*  cy={cy + r}*/}
      {/*  r={4}*/}
      {/*  stroke="#009EE9ff"*/}
      {/*  strokeWidth="1.5"*/}
      {/*  fill="#fff"*/}
      {/*/>*/}
    </>
  );
});

const HoveredMarker = observer(({ node }: { node: AnyNodeInstance }) => {
  const { fretToFingerX, stringToY } = useFretboardData();
  const root = useRootStore();

  const [cx, cy] = root.viewport.worldToViewport(
    fretToFingerX(node.props.fret),
    stringToY(node.props.string)
  );

  const r = root.viewport.worldValueToViewportValue(10);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      stroke="#009EE9ff"
      strokeWidth="2"
      fill="none"
    />
  );
});

const RootStoreContext = createContext<RootStoreInstance | null>(null);
const useRootStore = () => {
  const rootStore = useContext(RootStoreContext);
  if (!rootStore) {
    throw new Error("useRootStore must be used within a RootStoreProvider");
  }
  return rootStore;
};

const PointerToolUI = observer(({ tool }: { tool: PointerToolInstance }) => {
  const root = useRootStore();
  const interaction = tool.interaction;
  const rect =
    interaction?.type === "MARQUEE_SELECT"
      ? root.viewport.worldRectToViewportRect(interaction.rect)
      : null;

  return (
    <>
      {tool.hoveredNode && <HoveredMarker node={tool.hoveredNode} />}
      {rect && (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          stroke={"#009EE966"}
          fill={"#009EE911"}
        />
      )}
    </>
  );
});

const CreateToolUI = observer(({ tool }: { tool: CreateToolInstance }) => {
  const { fretToFingerX, stringToY } = useFretboardData();
  const root = useRootStore();

  if (tool.hoveredPointer) {
    const [cx, cy] = root.viewport.worldToViewport(
      fretToFingerX(tool.hoveredPointer.props.fret),
      stringToY(tool.hoveredPointer.props.string)
    );

    const r = root.viewport.worldValueToViewportValue(10);

    return (
      <>
        {tool.hoveredPointer && (
          <circle cx={cx} cy={cy} r={r} fill="black" opacity={0.5} />
        )}
      </>
    );
  } else {
    return null;
  }
});

const ScalingGraphics = observer(() => {
  const rootStore = useRootStore();
  return (
    <>
      {rootStore.document.entities.map((model) => (
        <NoteMarker key={model.id} {...model.props} />
      ))}
    </>
  );
});

const NonScalingGraphics = observer(() => {
  const rootStore = useRootStore();
  return (
    <>
      {rootStore.document.selection.items.map((model) => (
        <SelectionMarker key={"selected_" + model.id} node={model} />
      ))}
      {rootStore.tool.type === "POINTER_TOOL" && (
        <PointerToolUI tool={rootStore.tool} />
      )}
      {rootStore.tool.type === "CREATE_TOOL" && (
        <CreateToolUI tool={rootStore.tool} />
      )}
    </>
  );
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

const SelectionControls = observer(() => {
  const rootStore = useRootStore();
  const action = rootStore.document.selection.action;
  if (action) {
    switch (action.type) {
      case "SET_LABEL":
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
              onClick={() => action.setKind("note-name")}
            />
            <EdgeButton
              key="clear"
              Icon={Lucide.XCircle}
              label="Clear"
              onClick={action.clearLabel}
            />
          </RightControls>
        );
      case "SET_COLOR":
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
              label="Black"
              fillColor="black"
              onClick={() => action.setColor("black")}
            />
            <EdgeButton
              key="blue"
              Icon={Lucide.Circle}
              iconOnly
              label="Blue"
              fillColor="blue"
              onClick={() => action.setColor("blue")}
            />
            <EdgeButton
              key="red"
              Icon={Lucide.Circle}
              iconOnly
              label="Red"
              fillColor="red"
              onClick={() => action.setColor("red")}
            />
            <EdgeButton
              key="green"
              Icon={Lucide.Circle}
              iconOnly
              label="Green"
              fillColor="green"
              onClick={() => action.setColor("green")}
            />
          </RightControls>
        );
      case "SET_SHAPE":
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
    }
  } else {
    return (
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
    );
  }
});

const Controls = observer(() => {
  const copyToClipboard = useCopyToClipboard();
  const undoManager = getUndoManager();
  const rootStore = useRootStore();
  return (
    <>
      <AnimatePresence>
        {rootStore.document.selection.hasItems && <SelectionControls />}
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
              onChange={(e) =>
                rootStore.document.selection.action!.setLabel(
                  e.currentTarget.value
                )
              }
            />
          </TopControls>
        )}
      </AnimatePresence>
      <AnimatePresence>
        <BottomControls
          as={motion.div}
          variants={bottomEdgeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <RoundButton
            key="undo"
            as={motion.button}
            layout
            initial={{ y: 72 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            disabled={!undoManager.canUndo}
            onClick={undoManager.undo}
          >
            <Lucide.Undo size={20} />
          </RoundButton>
          <RoundButton
            key="redo"
            as={motion.button}
            layout
            initial={{ y: 72 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            disabled={!undoManager.canRedo}
            onClick={undoManager.redo}
          >
            <Lucide.Redo size={20} />
          </RoundButton>
          <Box css={{ marginLeft: "auto", hStack: 8 }}>
            <RoundButton
              key="copy"
              as={motion.button}
              layout
              initial={{ y: 72 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={copyToClipboard}
            >
              <Lucide.Clipboard size={20} />
            </RoundButton>
            {/*<RoundButton*/}
            {/*  as={motion.button}*/}
            {/*  layout*/}
            {/*  initial={{ y: 72 }}*/}
            {/*  animate={{ y: 0, opacity: 1 }}*/}
            {/*  exit={{ opacity: 0 }}*/}
            {/*  whileTap={{ scale: 0.9 }}*/}
            {/*>*/}
            {/*  <Lucide.Settings size={20} />*/}
            {/*</RoundButton>*/}
          </Box>
        </BottomControls>
      </AnimatePresence>
    </>
  );
});

export const MarkerEditor = observer(
  ({ rootStore }: { rootStore: RootStoreInstance }) => {
    const spaceIsPressed = useSpaceIsPressed();
    const {
      findNearestNote,
      totalWidth,
      totalHeight,
      stringToY,
      fretToFingerX,
    } = useFretboardData();
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

    useEffect(() => {
      rootStore.board.setFindNearestNote(findNearestNote);
    }, [rootStore, findNearestNote]);

    useEffect(() => {
      rootStore.board.setStringToY(stringToY);
    }, [rootStore, stringToY]);

    useEffect(() => {
      rootStore.board.setFretToX(fretToFingerX);
    }, [rootStore, fretToFingerX]);

    useEffect(() => {
      rootStore.board.setExtent(
        new DOMRectReadOnly(0, 0, totalWidth, totalHeight)
      );
    }, [rootStore, totalHeight, totalWidth]);

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

    const handleUp = useCallback(
      (e: MouseEvent | TouchEvent) => {
        rootStore.tool.up();
      },
      [rootStore.tool]
    );

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

    const undoManager = getUndoManager();

    useHotkeys("cmd+z", () => {
      if (undoManager.canUndo) {
        undoManager.undo();
      }
    });

    useHotkeys("cmd+a", (e) => {
      e.preventDefault();
      rootStore.document.selectAll();
    });

    useHotkeys("cmd+shift+z", () => {
      if (undoManager.canRedo) {
        undoManager.redo();
      }
    });

    useHotkeys("backspace", () => {
      if (rootStore.document.selection.hasItems) {
        rootStore.document.deleteEntities(rootStore.document.selection.items);
      }
    });

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
