import { JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { fonts } from "@/engine/constants/fonts";
import { DEBUG_CARD } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_HEADING_COLOR, DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";
import { DebugPanel } from "@/engine/forms/menu/debug/components/DebugPanel.component";

/**
 * Raised card with a title bar, which groups related controls placed over it.
 */
export function DebugCard(props: {
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: TLabel;
}): JSXNode {
  return (
    <DebugPanel
      tag={props.tag}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      tint={DEBUG_TINT.raised}
    >
      <auto_static
        x={DEBUG_CARD.padding}
        y={0}
        width={props.width - DEBUG_CARD.padding * 2}
        height={DEBUG_CARD.titleHeight}
      >
        <text
          font={fonts.letterica16}
          vert_align={"c"}
          r={DEBUG_HEADING_COLOR.r}
          g={DEBUG_HEADING_COLOR.g}
          b={DEBUG_HEADING_COLOR.b}
        >
          {props.title}
        </text>
      </auto_static>
      <DebugFill x={1} y={DEBUG_CARD.titleHeight} width={props.width - 2} height={1} tint={DEBUG_TINT.separator} />
    </DebugPanel>
  );
}
