import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { IDebugTint } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";

/**
 * One pixel outline of a rectangle, created with the window it is nested in.
 */
export function DebugBorder(props: {
  x?: number;
  y?: number;
  width: number;
  height: number;
  tint: IDebugTint;
}): JSXNode {
  const { x = 0, y = 0, width, height, tint } = props;

  return (
    <Fragment>
      <DebugFill x={x} y={y} width={width} height={1} tint={tint} />
      <DebugFill x={x} y={y + height - 1} width={width} height={1} tint={tint} />
      <DebugFill x={x} y={y + 1} width={1} height={height - 2} tint={tint} />
      <DebugFill x={x + width - 1} y={y + 1} width={1} height={height - 2} tint={tint} />
    </Fragment>
  );
}
