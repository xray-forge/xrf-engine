import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { DEBUG_OVERLAY_PANEL } from "@/engine/core/ui/debug/debug_layout";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";
import { XrRoot, XrStatic, XrText } from "@/engine/forms/components/base";
import {
  DEBUG_LABEL_COLOR,
  DEBUG_TEXT_COLOR,
  DEBUG_TINT,
  DebugFill,
  DebugPanel,
} from "@/engine/forms/menu/debug/components";

/**
 * Create the overlay templates: a translucent panel with an accent line along its top, and its rows of labelled values,
 * which the overlay places in each slot it shows. The panel has no outline, as the overlay fits its height to its rows.
 *
 * @returns Rendered overlay component.
 */
export function create(): JSXNode {
  const height: number = DEBUG_OVERLAY_PANEL.rows * DEBUG_OVERLAY_PANEL.rowHeight + DEBUG_OVERLAY_PANEL.padding * 2;

  return (
    <XrRoot width={SCREEN_BASE_WIDTH} height={SCREEN_BASE_HEIGHT}>
      <DebugPanel
        tag={"panel"}
        x={0}
        y={0}
        width={DEBUG_OVERLAY_PANEL.width}
        height={height}
        tint={{ ...DEBUG_TINT.surface, a: 190 }}
        isOutlined={false}
      >
        <DebugFill x={0} y={0} width={DEBUG_OVERLAY_PANEL.width} height={2} tint={DEBUG_TINT.accent} />
      </DebugPanel>
      <XrStatic tag={"row_label"} width={DEBUG_OVERLAY_PANEL.labelWidth} height={DEBUG_OVERLAY_PANEL.rowHeight}>
        <XrText label={""} font={fonts.letterica16} color={DEBUG_LABEL_COLOR} vertAlign={"c"} />
      </XrStatic>
      <XrStatic tag={"row_value"} width={DEBUG_OVERLAY_PANEL.valueWidth} height={DEBUG_OVERLAY_PANEL.rowHeight}>
        <XrText label={""} font={fonts.letterica16} color={DEBUG_TEXT_COLOR} vertAlign={"c"} />
      </XrStatic>
    </XrRoot>
  );
}
