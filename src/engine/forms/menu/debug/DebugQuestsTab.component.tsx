import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugQuestView } from "@/engine/core/managers/debug/debug_types";
import { DEBUG_BROWSER, DEBUG_BUTTON_HEIGHT, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_HEADING_COLOR,
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
const ACTIONS_Y: number = 470;
const STEP: number = DEBUG_BUTTON_HEIGHT + 6;

/**
 * Create the quests tab: tasks, info portions or flows on the left, the one selected and what to do with it on the
 * right. Each list has its own action buttons, shown with it.
 *
 * @returns Rendered quests tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugTabStrip
        tag={"views"}
        x={0}
        y={0}
        ids={Object.values(EDebugQuestView)}
        columns={3}
        buttonWidth={140}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugBrowser />

      <DebugList tag={"fields"} x={SIDE_X} y={DEBUG_BROWSER.y} width={SIDE_WIDTH} height={ACTIONS_Y - 70} />
      <DebugFieldTemplates width={SIDE_WIDTH - 24} />

      <DebugText
        tag={"heading_actions"}
        x={SIDE_X}
        y={ACTIONS_Y - 24}
        width={SIDE_WIDTH}
        label={"selected"}
        color={DEBUG_HEADING_COLOR}
      />

      <DebugButton tag={"task_give_button"} label={"give"} x={SIDE_X} y={ACTIONS_Y} width={HALF_WIDTH} />
      <DebugButton tag={"task_target_button"} label={"go to target"} x={COLUMN_2_X} y={ACTIONS_Y} width={HALF_WIDTH} />
      <DebugButton tag={"task_complete_button"} label={"complete"} x={SIDE_X} y={ACTIONS_Y + STEP} width={HALF_WIDTH} />
      <DebugButton tag={"task_fail_button"} label={"fail"} x={COLUMN_2_X} y={ACTIONS_Y + STEP} width={HALF_WIDTH} />

      <DebugButton tag={"portion_give_button"} label={"give"} x={SIDE_X} y={ACTIONS_Y} width={HALF_WIDTH} />
      <DebugButton tag={"portion_take_button"} label={"take"} x={COLUMN_2_X} y={ACTIONS_Y} width={HALF_WIDTH} />

      <DebugButton tag={"flow_run_button"} label={"run"} x={SIDE_X} y={ACTIONS_Y} width={HALF_WIDTH} />
      <DebugButton
        tag={"flow_run_in_place_button"}
        label={"run without travel"}
        x={COLUMN_2_X}
        y={ACTIONS_Y}
        width={HALF_WIDTH}
      />
    </XrRoot>
  );
}
