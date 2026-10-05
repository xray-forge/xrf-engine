import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_FILL_TEXTURE, IDebugTint } from "@/engine/forms/menu/debug/components/debug_theme";

/**
 * Flat rectangle of one tint, created with the window it is nested in.
 */
export function DebugFill(props: { x: number; y: number; width: number; height: number; tint: IDebugTint }): JSXNode {
  const { tint } = props;

  return (
    <auto_static x={props.x} y={props.y} width={props.width} height={props.height} stretch={1}>
      <texture r={tint.r} g={tint.g} b={tint.b} a={tint.a}>
        {DEBUG_FILL_TEXTURE}
      </texture>
    </auto_static>
  );
}
