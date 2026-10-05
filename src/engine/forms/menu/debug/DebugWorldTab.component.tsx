import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugWorldView } from "@/engine/core/managers/debug/debug_types";
import { DEBUG_BROWSER, DEBUG_BUTTON_HEIGHT, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_HEADING_COLOR,
  DEBUG_LABEL_COLOR,
  DebugBrowser,
  DebugButton,
  DebugFieldTemplates,
  DebugList,
  DebugTabStrip,
  DebugText,
} from "@/engine/forms/menu/debug/debug_layout";

const SIDE_X: number = DEBUG_BROWSER.width + 12;
const SIDE_WIDTH: number = DEBUG_TAB_AREA.width - SIDE_X;
const HALF_WIDTH: number = (SIDE_WIDTH - 4) / 2;
const COLUMN_2_X: number = SIDE_X + HALF_WIDTH + 4;

/**
 * Create the world tab: lists of places and things on top and on the left, what is selected and what to do with it on
 * the right.
 *
 * @returns Rendered world tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugTabStrip
        tag={"views"}
        x={0}
        y={0}
        ids={Object.values(EDebugWorldView)}
        columns={6}
        buttonWidth={140}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugBrowser />

      <DebugList tag={"fields"} x={SIDE_X} y={DEBUG_BROWSER.y} width={SIDE_WIDTH} height={300} />
      <DebugFieldTemplates width={SIDE_WIDTH - 24} />

      <DebugText
        tag={"heading_go"}
        x={SIDE_X}
        y={368}
        width={SIDE_WIDTH}
        label={"selected"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"target_button"} label={"make target"} x={SIDE_X} y={390} width={HALF_WIDTH} />
      <DebugButton tag={"teleport_button"} label={"teleport"} x={COLUMN_2_X} y={390} width={HALF_WIDTH} />

      <DebugText
        tag={"heading_positions"}
        x={SIDE_X}
        y={422}
        width={SIDE_WIDTH}
        label={"saved positions"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"save_position_button"} label={"save current"} x={SIDE_X} y={444} width={HALF_WIDTH} />
      <DebugButton tag={"delete_position_button"} label={"delete selected"} x={COLUMN_2_X} y={444} width={HALF_WIDTH} />
      <DebugText
        tag={"positions_hint"}
        x={SIDE_X}
        y={468}
        width={SIDE_WIDTH}
        label={"the search text names a saved position"}
        color={DEBUG_LABEL_COLOR}
      />

      <DebugText
        tag={"heading_treasures"}
        x={SIDE_X}
        y={496}
        width={SIDE_WIDTH}
        label={"treasure coordinates"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"give_treasure_button"} label={"give selected"} x={SIDE_X} y={518} width={HALF_WIDTH} />
      <DebugButton
        tag={"give_random_treasure_button"}
        label={"give random"}
        x={COLUMN_2_X}
        y={518}
        width={HALF_WIDTH}
      />
      <DebugButton tag={"give_all_treasures_button"} label={"give all"} x={SIDE_X} y={546} width={HALF_WIDTH} />
    </XrRoot>
  );
}
