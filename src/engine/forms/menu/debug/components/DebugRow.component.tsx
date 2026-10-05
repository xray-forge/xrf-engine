import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";
import { DebugStateTextures } from "@/engine/forms/menu/debug/components/DebugStateTextures.component";
import { DebugTextColors } from "@/engine/forms/menu/debug/components/DebugTextColors.component";

/**
 * Flat list row: clear, with a line under it, turning amber under the cursor.
 */
export function DebugRow(props: { tag: string; x: number; y: number; width: number; height: number }): JSXNode {
  return JSXXML(props.tag, { x: props.x, y: props.y, width: props.width, height: props.height, stretch: 1 }, [
    <DebugFill x={0} y={props.height - 1} width={props.width} height={1} tint={DEBUG_TINT.separator} />,
    <text font={fonts.letterica16} align={"l"} vert_align={"c"} x={8}></text>,
    <DebugStateTextures />,
    <DebugTextColors />,
  ]);
}
