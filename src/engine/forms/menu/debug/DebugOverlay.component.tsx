import { JSXNode, JSXXML } from "jsx-xml";

import { WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { DEBUG_OVERLAY_PANEL } from "@/engine/core/ui/debug/debug_layout";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";
import { XrRoot, XrStatic, XrText } from "@/engine/forms/components/base";
import { XrTexture } from "@/engine/forms/components/base/XrTexture.component";
import { DEBUG_LABEL_COLOR } from "@/engine/forms/menu/debug/debug_layout";

/**
 * Create the overlay templates: a panel and its rows of labelled values, which the overlay places in each slot it shows.
 *
 * @returns Rendered overlay component.
 */
export function create(): JSXNode {
  const height: number = DEBUG_OVERLAY_PANEL.rows * DEBUG_OVERLAY_PANEL.rowHeight + DEBUG_OVERLAY_PANEL.padding * 2;
  const valueWidth: number =
    DEBUG_OVERLAY_PANEL.width - DEBUG_OVERLAY_PANEL.labelWidth - DEBUG_OVERLAY_PANEL.padding * 2;

  return (
    <XrRoot width={SCREEN_BASE_WIDTH} height={SCREEN_BASE_HEIGHT}>
      <XrStatic tag={"panel"} width={DEBUG_OVERLAY_PANEL.width} height={height}>
        <XrTexture id={"ui_icons_PDA_tooltips_back"} r={20} g={20} b={20} a={170} />
      </XrStatic>
      <XrStatic tag={"row_label"} width={DEBUG_OVERLAY_PANEL.labelWidth} height={DEBUG_OVERLAY_PANEL.rowHeight}>
        <XrText label={""} font={fonts.letterica16} color={DEBUG_LABEL_COLOR} vertAlign={"c"} />
      </XrStatic>
      <XrStatic tag={"row_value"} width={valueWidth} height={DEBUG_OVERLAY_PANEL.rowHeight}>
        <XrText label={""} font={fonts.letterica16} color={WHITE} vertAlign={"c"} />
      </XrStatic>
    </XrRoot>
  );
}
