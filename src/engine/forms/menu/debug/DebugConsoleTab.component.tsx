import { JSXNode, JSXXML } from "jsx-xml";

import { WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { DEBUG_BUTTON_HEIGHT, DEBUG_ROW_HEIGHT, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrEditBox, XrRoot, XrStatic, XrText } from "@/engine/forms/components/base";
import { DEBUG_LABEL_COLOR, DebugButton, DebugList, DebugText } from "@/engine/forms/menu/debug/debug_layout";

const INPUT_Y: number = DEBUG_TAB_AREA.height - 52;
const RUN_WIDTH: number = 110;

/**
 * Create the console tab: what Lua returned above, the line to run below.
 *
 * @returns Rendered console tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"output"} x={0} y={0} width={DEBUG_TAB_AREA.width} height={INPUT_Y - 8} />
      <XrStatic tag={"output_line"} width={DEBUG_TAB_AREA.width - 24} height={DEBUG_ROW_HEIGHT}>
        <XrText label={""} font={fonts.letterica16} color={WHITE} />
      </XrStatic>

      <XrEditBox
        tag={"input"}
        x={0}
        y={INPUT_Y}
        width={DEBUG_TAB_AREA.width - RUN_WIDTH - 8}
        height={DEBUG_BUTTON_HEIGHT}
        texture={"ui_inGame2_edit_box_2"}
        font={fonts.letterica16}
        color={WHITE}
        maxSymbolsCount={1000}
      />
      <DebugButton
        tag={"run_button"}
        label={"run"}
        x={DEBUG_TAB_AREA.width - RUN_WIDTH}
        y={INPUT_Y}
        width={RUN_WIDTH}
      />
      <DebugText
        tag={"hint"}
        x={0}
        y={INPUT_Y + 28}
        width={DEBUG_TAB_AREA.width}
        label={"Enter runs the line; up and down step through history; actor, target and registry are set"}
        color={DEBUG_LABEL_COLOR}
      />
    </XrRoot>
  );
}
