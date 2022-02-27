import { observer } from "mobx-react-lite";
import { useHotkeys } from "react-hotkeys-hook";
import { getUndoManager, IDot, IRootStore, NodeInstance } from "./models";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Feather from "react-feather";
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
import mergeRefs from "react-merge-refs";

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
  background: "rgba(0,0,0,0.1)",
  color: "rgba(0,0,0,0.8)",
  border: "none",
  borderRadius: 100,
  backdropFilter: "blur(4px)",
  "&:hover:not(:disabled)": {
    background: "rgba(0,0,0,0.2)",
  },
  "&:disabled": { color: "rgba(0,0,0,0.4)" },
});

const Knobs = styled("div", {
  vStack: 8,
  position: "absolute",
  top: 12,
  right: 12,
  background: "#fff",
  borderRadius: 12,
  padding: 8,
});

const Controls = styled("div", {
  hStack: 8,
  position: "absolute",
  bottom: 12,
  left: 12,
  right: 12,
  padding: 8,
});

const useId = () => {
  return useMemo(() => ulid(), []);
};

const TextField = ({
  label,
  disabled,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) => {
  const id = useId();
  return (
    <Box
      css={{
        vStack: 4,
        alignItems: "stretch",
        padding: "8px 12px",
      }}
    >
      <Box
        as="label"
        htmlFor={id}
        css={{ color: disabled ? "#999" : "black", fontWeight: 500 }}
      >
        {label}
      </Box>
      <input id={id} type="text" disabled={disabled} {...props} />
    </Box>
  );
};

const LabelWidget = observer(() => {
  const rootStore = useRootStore();

  const value = rootStore.document.selection.items.reduce(
    (prev, curr) => (prev === curr.props.label ? prev : "Mixed"),
    rootStore.document.selection.items.length > 0
      ? rootStore.document.selection.items[0].props.label
      : ""
  );

  return (
    <TextField
      disabled={rootStore.document.selection.isEmpty}
      label="Label"
      value={value ?? ""}
      onChange={(e) => {
        rootStore.document.selection.items.forEach((s) =>
          s.setLabel(e.currentTarget.value)
        );
      }}
    />
  );
});

const FretWidget = observer(() => {
  const rootStore = useRootStore();

  const value = rootStore.document.selection.items.reduce(
    (prev, curr) => (prev === curr.props.fret ? prev : "Mixed"),
    rootStore.document.selection.items.length > 0
      ? rootStore.document.selection.items[0].props.fret
      : ""
  );

  return (
    <TextField
      disabled={rootStore.document.selection.isEmpty}
      label="Fret"
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        rootStore.document.selection.items.forEach((s) =>
          s.setFret(+e.currentTarget.value)
        );
      }}
    />
  );
});

const StringWidget = observer(() => {
  const rootStore = useRootStore();

  const value = rootStore.document.selection.items.reduce(
    (prev, curr) => (prev === curr.props.string ? prev : "Mixed"),
    rootStore.document.selection.items.length > 0
      ? rootStore.document.selection.items[0].props.string
      : ""
  );

  return (
    <TextField
      disabled={rootStore.document.selection.isEmpty}
      label="String"
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        rootStore.document.selection.items.forEach((s) =>
          s.setString(+e.currentTarget.value)
        );
      }}
    />
  );
});

const getWidgetValue = <V extends any>(
  items: IDot[],
  accessor: (v: IDot) => V,
  emptyDefault: V,
  mixedDefault: V
): V =>
  items.reduce(
    (prev, curr) => (prev === accessor(curr) ? prev : mixedDefault),
    items.length > 0 ? accessor(items[0]) : emptyDefault
  );

const ColorRadioItem = ({ value }: { value: string }) => (
  <RadioGroup.Item value={value} asChild>
    <Box
      as="button"
      css={{
        background: "none",
        border: "none",
        padding: 0,
        display: "inline-flex",
      }}
    >
      <svg width={24} height={24}>
        <circle cx={12} cy={12} r={7} fill={value} />
        <RadioGroup.Indicator asChild>
          <circle
            cx={12}
            cy={12}
            r={10}
            strokeWidth={2}
            fill="none"
            stroke={value}
          />
        </RadioGroup.Indicator>
      </svg>
    </Box>
  </RadioGroup.Item>
);

const ColorWidget = observer(() => {
  const rootStore = useRootStore();

  const value = getWidgetValue(
    rootStore.document.selection.items,
    (v) => v.props.color,
    "black",
    undefined
  );

  return (
    <RadioGroup.Root
      value={value}
      defaultValue={value}
      onValueChange={(color) =>
        rootStore.document.selection.items.forEach((s) => s.setColor(color))
      }
      asChild
    >
      <Box css={{ hStack: 4 }}>
        <ColorRadioItem value="black" />
        <ColorRadioItem value="tomato" />
        <ColorRadioItem value="teal" />
      </Box>
    </RadioGroup.Root>
  );
});

observer(() => {
  const rootStore = useRootStore();
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (rootStore.document.selection.isEmpty) {
      setIsConfirming(false);
    }
  }, [rootStore.document.selection.isEmpty]);

  return (
    <Box css={{ hStack: 4, padding: "8px 12px" }}>
      {!isConfirming && (
        <button
          disabled={rootStore.document.selection.isEmpty}
          onClick={() => {
            setIsConfirming(true);
          }}
        >
          Delete
        </button>
      )}
      {isConfirming && (
        <>
          <button
            onClick={() => {
              setIsConfirming(false);
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              rootStore.document.deleteEntities(
                rootStore.document.selection.items
              );
              setIsConfirming(false);
            }}
          >
            Confirm
          </button>
        </>
      )}
    </Box>
  );
});

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

const ExportWidget = () => {
  const rootStore = useRootStore();
  const handleClick = () => {
    const text = renderToString(
      <RootStoreContext.Provider value={rootStore}>
        <FretboardData
          minFret={rootStore.document.board.minFret}
          maxFret={rootStore.document.board.maxFret}
          showFretNumbers={rootStore.document.board.showFretNumbers}
        >
          <StaticFretboard />
        </FretboardData>
      </RootStoreContext.Provider>
    );
    copyTextToClipboard(text);
  };

  return <NiceButton onClick={handleClick}>Copy SVG</NiceButton>;
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

function useD3Zoom(root: IRootStore) {
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
        root.zoom.setIsZooming(true);
      });

      zoomer.on("zoom", (e) => {
        root.zoom.setZoomState(e.transform);
      });

      zoomer.on("end", () => {
        root.zoom.setIsZooming(false);
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
      children,
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
        <g transform={root.zoom.zoomState.toString()}>
          <FretMarks />
          <DotMarks />
          <StringMarks />
          {showStringNames && <StringNames />}
          {showFretNumbers && <FretNumbers />}
          {children}
        </g>
      </StyledSVG>
    );
  },
  {
    forwardRef: true,
  }
);

const SelectionMarker = observer(({ node }: { node: NodeInstance }) => {
  const { fretToFingerX, stringToY } = useFretboardData();

  const cx = fretToFingerX(node.props.fret);
  const cy = stringToY(node.props.string);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={13}
      stroke="#009EE9ff"
      strokeWidth="2"
      fill="none"
      style={{ vectorEffect: "non-scaling-stroke" }}
    />
  );
});

const HoveredMarker = observer(({ node }: { node: NodeInstance }) => {
  const { fretToFingerX, stringToY } = useFretboardData();

  const cx = fretToFingerX(node.props.fret);
  const cy = stringToY(node.props.string);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={10}
      stroke="#009EE9ff"
      strokeWidth="2"
      fill="none"
      style={{ vectorEffect: "non-scaling-stroke" }}
    />
  );
});

const RootStoreContext = createContext<IRootStore | null>(null);
const useRootStore = () => {
  const rootStore = useContext(RootStoreContext);
  if (!rootStore) {
    throw new Error("useRootStore must be used within a RootStoreProvider");
  }
  return rootStore;
};

export const MarkerEditor = observer(
  ({ rootStore }: { rootStore: IRootStore }) => {
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
      rootStore.zoom.setClientRect(new DOMRectReadOnly(x, y, width, height));
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

    const handleDown = useCallback(
      (e: React.PointerEvent) => {
        if (spaceIsPressed.current) {
          return;
        }
        const [x, y] = rootStore.zoom.viewportToWorld(...d3.pointer(e));
        rootStore.tool.down({ x, y }, e.shiftKey);
      },
      [findNearestNote, rootStore.tool, rootStore.zoom.zoomState]
    );

    const handleMove = useCallback(
      (e: PointerEvent) => {
        const [x, y] = rootStore.zoom.screenToWorld(...d3.pointer(e));
        rootStore.tool.move({ x, y });
      },
      [findNearestNote, rootStore.tool, rootStore.zoom.zoomState]
    );

    const handleUp = useCallback(
      (e: PointerEvent) => {
        rootStore.tool.up();
      },
      [rootStore.tool]
    );

    useEffect(() => {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);

      return () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
    });

    const undoManager = getUndoManager();

    useHotkeys("cmd+z", () => {
      if (undoManager.canUndo) {
        undoManager.undo();
      }
    });

    const selectAllRef = useHotkeys("cmd+a", (e) => {
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

    const interaction = rootStore.tool.interaction;

    return (
      <RootStoreContext.Provider value={rootStore}>
        <EditorLayout>
          <Workspace ref={measureRef}>
            <ScalingFretboard
              tabIndex={0}
              ref={mergeRefs([svgRef, selectAllRef])}
              width={width}
              height={height}
              onPointerDown={handleDown}
            >
              {rootStore.document.entities.map((model) => (
                <NoteMarker key={model.id} {...model.props} />
              ))}
              {rootStore.tool.hoveredPointer && (
                <NoteMarker
                  shape="circle"
                  fret={rootStore.tool.hoveredPointer.props.fret}
                  string={rootStore.tool.hoveredPointer.props.string}
                />
              )}
              {rootStore.document.selection.items.map((model) => (
                <SelectionMarker key={"selected_" + model.id} node={model} />
              ))}
              {rootStore.tool.hoveredNode && (
                <HoveredMarker node={rootStore.tool.hoveredNode} />
              )}
              {interaction?.type === "MARQUEE_SELECT" && (
                <rect
                  x={interaction.rect.x}
                  y={interaction.rect.y}
                  width={interaction.rect.width}
                  height={interaction.rect.height}
                  stroke={"#009EE966"}
                  fill={"#009EE911"}
                />
              )}
            </ScalingFretboard>
          </Workspace>
          <Knobs>
            <ColorWidget />
            <ExportWidget />
          </Knobs>
          <Controls>
            <RoundButton
              disabled={!undoManager.canUndo}
              onClick={undoManager.undo}
            >
              <Feather.CornerUpLeft />
            </RoundButton>
            <RoundButton
              disabled={!undoManager.canRedo}
              onClick={undoManager.redo}
            >
              <Feather.CornerUpRight />
            </RoundButton>
            <Box css={{ marginLeft: "auto" }}>
              <RoundButton
                disabled={!rootStore.document.selection.hasItems}
                onClick={() =>
                  rootStore.document.deleteEntities(
                    rootStore.document.selection.items
                  )
                }
              >
                <Feather.Trash />
              </RoundButton>
            </Box>
          </Controls>
        </EditorLayout>
      </RootStoreContext.Provider>
    );
  }
);
