import { JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { fonts } from "@/engine/constants/fonts";
import { DebugTextColors } from "@/engine/forms/menu/debug/components/DebugTextColors.component";

/**
 * Flat check box, a crossed box when checked, with its label on the right.
 */
export function DebugCheckBox(props: { tag: string; x: number; y: number; label: TLabel }): JSXNode {
  return JSXXML(props.tag, { x: props.x, y: props.y, width: 17, height: 17, stretch: 1 }, [
    <texture>ui_PDA_checker</texture>,
    <text font={fonts.letterica16} x={8} vert_align={"c"}>
      {props.label}
    </text>,
    <DebugTextColors />,
  ]);
}
