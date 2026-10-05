import { JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { IRgbColor } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { DEBUG_ROW_HEIGHT } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_TEXT_COLOR } from "@/engine/forms/menu/debug/components/debug_theme";
import { THorizontalTextAlign } from "@/engine/forms/types";

/**
 * Static showing one line of text.
 */
export function DebugText(props: {
  tag: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  label?: TLabel;
  color?: IRgbColor;
  isLarge?: boolean;
  align?: THorizontalTextAlign;
}): JSXNode {
  const color: IRgbColor = props.color ?? DEBUG_TEXT_COLOR;

  return JSXXML(props.tag, { x: props.x, y: props.y, width: props.width, height: props.height ?? DEBUG_ROW_HEIGHT }, [
    <text
      font={props.isLarge ? fonts.letterica18 : fonts.letterica16}
      align={props.align}
      vert_align={"c"}
      r={color.r}
      g={color.g}
      b={color.b}
    >
      {props.label ?? ""}
    </text>,
  ]);
}
