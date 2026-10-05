import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugQuestView } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BROWSER,
  DEBUG_BUTTON_GAP,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_CARD,
  DEBUG_SIDE,
  DEBUG_TAB_AREA,
  getDebugCardHeight,
} from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DebugBrowser,
  DebugButton,
  DebugCard,
  DebugFieldTemplates,
  DebugList,
  DebugTabStrip,
} from "@/engine/forms/menu/debug/components";

const CARD_HEIGHT: number = getDebugCardHeight(2);
const CARD_Y: number = DEBUG_TAB_AREA.height - CARD_HEIGHT;
const COLUMN_1_X: number = DEBUG_SIDE.x + DEBUG_CARD.padding;
const COLUMN_2_X: number = COLUMN_1_X + DEBUG_BUTTON_WIDTH + DEBUG_CARD.gap;
const ROW_1_Y: number = CARD_Y + DEBUG_CARD.titleHeight + DEBUG_CARD.padding;
const ROW_2_Y: number = ROW_1_Y + DEBUG_BUTTON_HEIGHT + DEBUG_BUTTON_GAP;
const WIDE_WIDTH: number = DEBUG_SIDE.width - DEBUG_CARD.padding * 2;

/**
 * Create the quests tab: tasks, info portions or flows on the left, the one selected and a card of what to do with it
 * on the right. Each list has its own buttons in the card, shown with it.
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

      <DebugList
        tag={"fields"}
        x={DEBUG_SIDE.x}
        y={DEBUG_BROWSER.y}
        width={DEBUG_SIDE.width}
        height={CARD_Y - DEBUG_CARD.gap - DEBUG_BROWSER.y}
      />
      <DebugFieldTemplates width={DEBUG_SIDE.width - 24} />

      <DebugCard
        tag={"heading_actions"}
        x={DEBUG_SIDE.x}
        y={CARD_Y}
        width={DEBUG_SIDE.width}
        height={CARD_HEIGHT}
        title={"selected"}
      />

      <DebugButton tag={"task_give_button"} label={"give"} x={COLUMN_1_X} y={ROW_1_Y} />
      <DebugButton tag={"task_target_button"} label={"go to target"} x={COLUMN_2_X} y={ROW_1_Y} />
      <DebugButton tag={"task_complete_button"} label={"complete"} x={COLUMN_1_X} y={ROW_2_Y} />
      <DebugButton tag={"task_fail_button"} label={"fail"} x={COLUMN_2_X} y={ROW_2_Y} />

      <DebugButton tag={"portion_give_button"} label={"give"} x={COLUMN_1_X} y={ROW_1_Y} />
      <DebugButton tag={"portion_take_button"} label={"take"} x={COLUMN_2_X} y={ROW_1_Y} />

      <DebugButton tag={"flow_run_button"} label={"run"} x={COLUMN_1_X} y={ROW_1_Y} />
      <DebugButton tag={"flow_run_in_place_button"} label={"run without travel"} x={COLUMN_2_X} y={ROW_1_Y} />
      <DebugButton tag={"flow_pin_button"} label={""} x={COLUMN_1_X} y={ROW_2_Y} width={WIDE_WIDTH} />
    </XrRoot>
  );
}
