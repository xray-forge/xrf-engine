import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_FILL_TEXTURE, DEBUG_TINT, IDebugTint } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugBorder } from "@/engine/forms/menu/debug/components/DebugBorder.component";

/**
 * Flat panel with an outline: `sunken` behind lists, `raised` for bars and cards.
 */
export function DebugPanel(props: {
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tint?: IDebugTint;
  isOutlined?: boolean;
  children?: JSXNode;
}): JSXNode {
  const { tint = DEBUG_TINT.sunken, isOutlined = true } = props;

  return JSXXML(props.tag, { x: props.x, y: props.y, width: props.width, height: props.height, stretch: 1 }, [
    <texture r={tint.r} g={tint.g} b={tint.b} a={tint.a}>
      {DEBUG_FILL_TEXTURE}
    </texture>,
    isOutlined ? <DebugBorder width={props.width} height={props.height} tint={DEBUG_TINT.border} /> : null,
    props.children ?? null,
  ]);
}
