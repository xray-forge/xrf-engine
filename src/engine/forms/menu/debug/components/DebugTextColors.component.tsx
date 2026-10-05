import { JSXNode, JSXXML } from "jsx-xml";

import { IRgbColor } from "@/engine/constants/colors";
import { DEBUG_MUTED_COLOR, DEBUG_TEXT_COLOR } from "@/engine/forms/menu/debug/components/debug_theme";

/**
 * Text colours of a control in each state: enabled, white under the cursor, pressed or selected, and muted disabled.
 */
export function DebugTextColors(props: { enabled?: IRgbColor }): JSXNode {
  const { enabled = DEBUG_TEXT_COLOR } = props;

  return (
    <text_color>
      <e r={enabled.r} g={enabled.g} b={enabled.b} />
      <h r={255} g={255} b={255} />
      <t r={255} g={255} b={255} />
      <d r={DEBUG_MUTED_COLOR.r} g={DEBUG_MUTED_COLOR.g} b={DEBUG_MUTED_COLOR.b} />
    </text_color>
  );
}
