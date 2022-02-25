import { observer } from "mobx-react-lite";
import { useHotkeys } from "react-hotkeys-hook";
import { getUndoManager, IDot, IRootStore } from "./models";
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
  InputHTMLAttributes,
  ReactNode,
  SVGAttributes,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as d3 from "d3";
import { styled } from "./stitches.config";
import { ulid } from "ulid";
import useMeasure from "react-use-measure";
import { renderToString } from "react-dom/server";

const Box = styled("div");

const EditorLayout = styled("div", {
  height: "100%",
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(180px, 280px) 1fr minmax(180px, 280px)",
  gridTemplateRows: "min-content 1fr",
  gridTemplateAreas: '"toolbar toolbar toolbar" "outline workspace sidebar"',
});

const Toolbar = styled("div", {
  gridArea: "toolbar",
  background: "#333",
  hStack: 8,
  padding: 8,
});

const Outline = styled("div", {
  gridArea: "outline",
  background: "#fff",
  overflow: "auto",
});

const OutlineItem = styled("div", {
  userSelect: "none",
  border: "3px solid transparent",
  padding: "4px 8px",
  "&:hover": {
    borderColor: "#009EE966",
  },
  variants: {
    isSelected: {
      true: {
        background: "#009EE966",
      },
      false: {},
    },
  },
});

const Workspace = styled("div", {
  touchAction: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gridArea: "workspace",
  background: "#eee",
  overflow: "auto",
});

const Sidebar = styled("div", {
  gridArea: "sidebar",
  background: "#fff",
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

const ColorWidget = observer(() => {
  const rootStore = useRootStore();

  const value = getWidgetValue(
    rootStore.document.selection.items,
    (v) => v.props.color,
    "Mixed",
    ""
  );

  return (
    <TextField
      disabled={rootStore.document.selection.isEmpty}
      label="Color"
      type="color"
      value={value ?? ""}
      onChange={(e) => {
        rootStore.document.selection.items.forEach((s) =>
          s.setColor(e.currentTarget.value)
        );
      }}
    />
  );
});

const DeleteWidget = observer(() => {
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

  return <button onClick={handleClick}>Copy SVG</button>;
};

export const ScalingFretboard = ({
  width,
  height,
  children,
  ...props
}: SVGAttributes<SVGSVGElement>) => {
  const { totalWidth, totalHeight, showFretNumbers, showStringNames } =
    useFretboardData();

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={width}
      height={height}
      {...(props as any)}
    >
      <FretMarks />
      <DotMarks />
      <StringMarks />
      {showStringNames && <StringNames />}
      {showFretNumbers && <FretNumbers />}
      {children}
    </svg>
  );
};

const RootStoreContext = createContext<IRootStore | null>(null);
const useRootStore = () => {
  const rootStore = useContext(RootStoreContext);
  if (!rootStore) {
    throw new Error("useRootStore must be used within a RootStoreProvider");
  }
  return rootStore;
};

export const MarkerEditor = observer<{ rootStore: IRootStore }>(
  ({ rootStore }) => {
    const { findNearestNote } = useFretboardData();
    const [ref, { width, height }] = useMeasure();

    const handleDown = (e: React.PointerEvent) => {
      const point = findNearestNote(...d3.pointer(e));
      rootStore.tool.down(point, e.shiftKey);
    };

    const handleMove = (e: React.PointerEvent) => {
      const point = findNearestNote(...d3.pointer(e));
      rootStore.tool.move(point);
    };

    const handleUp = (e: React.PointerEvent) => {
      rootStore.tool.up();
    };

    const undoManager = getUndoManager();

    useHotkeys("cmd+z", () => {
      if (undoManager.canUndo) {
        undoManager.undo();
      }
    });

    useHotkeys("cmd+shift+z", () => {
      if (undoManager.canRedo) {
        undoManager.redo();
      }
    });

    return (
      <RootStoreContext.Provider value={rootStore}>
        <EditorLayout>
          <Toolbar>
            <button disabled={!undoManager.canUndo} onClick={undoManager.undo}>
              Undo
            </button>
            <button disabled={!undoManager.canRedo} onClick={undoManager.redo}>
              Redo
            </button>
          </Toolbar>
          <Outline>
            {rootStore.document.entities.map((model) => {
              return (
                <OutlineItem
                  key={model.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      rootStore.document.selection.add([model]);
                    } else {
                      rootStore.document.selection.replace([model]);
                    }
                  }}
                  isSelected={rootStore.document.selection.contains(model)}
                >
                  {model.name}{" "}
                  {model.props.label.length > 0 && (
                    <small>({model.props.label})</small>
                  )}
                </OutlineItem>
              );
            })}
          </Outline>
          <Workspace ref={ref}>
            <ScalingFretboard
              width={width}
              height={height}
              onPointerDown={handleDown}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
            >
              {rootStore.document.entities.map((model) => (
                <NoteMarker
                  key={model.id}
                  {...model.props}
                  outline={rootStore.document.selection.contains(model)}
                />
              ))}
              {rootStore.tool.hoveredPointer && (
                <NoteMarker
                  shape="circle"
                  fret={rootStore.tool.hoveredPointer.props.fret}
                  string={rootStore.tool.hoveredPointer.props.string}
                />
              )}
            </ScalingFretboard>
          </Workspace>
          <Sidebar>
            <LabelWidget />
            <FretWidget />
            <StringWidget />
            <ColorWidget />
            <DeleteWidget />
            <ExportWidget />
          </Sidebar>
        </EditorLayout>
      </RootStoreContext.Provider>
    );
  }
);
