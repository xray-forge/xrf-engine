import { JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { fonts, TFontId } from "@/engine/constants/fonts";
import { DEBUG_BUTTON_HEIGHT, DEBUG_BUTTON_WIDTH } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugBorder } from "@/engine/forms/menu/debug/components/DebugBorder.component";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";
import { DebugStateTextures } from "@/engine/forms/menu/debug/components/DebugStateTextures.component";
import { DebugTextColors } from "@/engine/forms/menu/debug/components/DebugTextColors.component";
import { THorizontalTextAlign } from "@/engine/forms/types";

/**
 * Flat button: a filled, outlined control turning amber under the cursor.
 */
export function DebugButton(props: {
  tag: string;
  label: TLabel;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  align?: THorizontalTextAlign;
  font?: TFontId;
}): JSXNode {
  const { width = DEBUG_BUTTON_WIDTH, height = DEBUG_BUTTON_HEIGHT, align = "c" } = props;

  return JSXXML(props.tag, { x: props.x ?? 0, y: props.y ?? 0, width, height, stretch: 1 }, [
    <DebugFill x={0} y={0} width={width} height={height} tint={DEBUG_TINT.control} />,
    <DebugBorder width={width} height={height} tint={DEBUG_TINT.controlBorder} />,
    <text font={props.font ?? fonts.letterica16} align={align} vert_align={"c"} x={align === "l" ? 8 : 0}>
      {props.label}
    </text>,
    <DebugStateTextures />,
    <DebugTextColors />,
  ]);
}
