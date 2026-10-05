import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_FILL_TEXTURE, DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";

/**
 * Marker of the selected row or cell: an amber tint with an accent bar along its left edge.
 */
export function DebugSelection(props: { tag: string; width: number; height: number }): JSXNode {
  const { selection } = DEBUG_TINT;

  return JSXXML(props.tag, { x: 0, y: 0, width: props.width, height: props.height, stretch: 1 }, [
    <texture r={selection.r} g={selection.g} b={selection.b} a={selection.a}>
      {DEBUG_FILL_TEXTURE}
    </texture>,
    <DebugFill x={0} y={0} width={3} height={props.height} tint={DEBUG_TINT.accent} />,
  ]);
}
