import { observer } from "mobx-react-lite";
import { AnyNodeInstance } from "../models/document";
import {
  DotMarks,
  FretboardDataProvider,
  FretMarks,
  FretNumbers,
  NoteMarker,
  StringMarks,
  StringNames,
  useFretboardData,
} from "../fretboard/Fretboard";
import { useRootStore } from "../hooks/useRootStore";
import React, { ForwardedRef, SVGAttributes } from "react";
import { CreateToolInstance, PointerToolInstance } from "../models/tools";
import { styled } from "../stitches.config";

const StyledSVG = styled("svg", {
  outline: "none",
  userSelect: "none",
});

export const ScalingFretboard = observer(
  (
    {
      width,
      height,
      ...props
    }: { width: number; height: number } & SVGAttributes<SVGSVGElement>,
    ref: ForwardedRef<SVGSVGElement>
  ) => {
    const root = useRootStore();

    return (
      <FretboardDataProvider
        logic={root.document.fretboard.logic}
        layout={root.document.fretboard.layout}
      >
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
            {root.document.fretboard.layout.showStringNames && <StringNames />}
            {root.document.fretboard.layout.showFretNumbers && <FretNumbers />}
            <ScalingGraphics />
          </g>
          <NonScalingGraphics />
        </StyledSVG>
      </FretboardDataProvider>
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
