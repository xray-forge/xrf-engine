import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { DEBUG_BUTTON_HEIGHT } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugBorder } from "@/engine/forms/menu/debug/components/DebugBorder.component";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";

/**
 * Flat single line text input.
 */
export function DebugEditBox(props: { tag: string; x: number; y: number; width: number; height?: number }): JSXNode {
  const { height = DEBUG_BUTTON_HEIGHT } = props;

  return JSXXML(props.tag, { x: props.x, y: props.y, width: props.width, height, max_symb_count: 1000 }, [
    <DebugFill x={0} y={0} width={props.width} height={height} tint={DEBUG_TINT.sunken} />,
    <DebugBorder width={props.width} height={height} tint={DEBUG_TINT.controlBorder} />,
    <text font={fonts.letterica16} x={6} vert_align={"c"} r={255} g={255} b={255} />,
  ]);
}
