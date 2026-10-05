import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_BUTTON_HEIGHT, DEBUG_GAP, DEBUG_ROW_HEIGHT, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_ERROR_COLOR,
  DEBUG_LABEL_COLOR,
  DEBUG_TEXT_COLOR,
  DebugButton,
  DebugEditBox,
  DebugList,
  DebugText,
} from "@/engine/forms/menu/debug/components";

const HINT_Y: number = DEBUG_TAB_AREA.height - DEBUG_ROW_HEIGHT;
const INPUT_Y: number = HINT_Y - DEBUG_BUTTON_HEIGHT - 6;
const RUN_WIDTH: number = 110;

/**
 * Create the console tab: what Lua returned above, the line to run below.
 *
 * @returns Rendered console tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"output"} x={0} y={0} width={DEBUG_TAB_AREA.width} height={INPUT_Y - DEBUG_GAP} />
      <DebugText tag={"output_command"} x={0} y={0} width={DEBUG_TAB_AREA.width - 24} color={DEBUG_LABEL_COLOR} />
      <DebugText tag={"output_line"} x={0} y={0} width={DEBUG_TAB_AREA.width - 24} color={DEBUG_TEXT_COLOR} />
      <DebugText tag={"output_error"} x={0} y={0} width={DEBUG_TAB_AREA.width - 24} color={DEBUG_ERROR_COLOR} />

      <DebugEditBox tag={"input"} x={0} y={INPUT_Y} width={DEBUG_TAB_AREA.width - RUN_WIDTH - 8} />
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
        y={HINT_Y}
        width={DEBUG_TAB_AREA.width}
        label={"Enter runs the line; up and down step through history; actor, target and registry are set"}
        color={DEBUG_LABEL_COLOR}
      />
    </XrRoot>
  );
}
