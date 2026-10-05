import { JSXNode, JSXXML } from "jsx-xml";

import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_ACTIONS_X,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_HEADING_COLOR,
  DEBUG_TAB_AREA,
  DebugButton,
  DebugFieldTemplates,
  DebugList,
  DebugText,
} from "@/engine/forms/menu/debug/debug_layout";

const FIELDS_WIDTH: number = DEBUG_ACTIONS_X - 16;
const COLUMN_2_X: number = DEBUG_ACTIONS_X + DEBUG_BUTTON_WIDTH + 8;
const STEP: number = DEBUG_BUTTON_HEIGHT + 6;

/**
 * Create the target tab: what the target is on the left, and the actions on it on the right.
 *
 * @returns Rendered target tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"fields"} x={0} y={0} width={FIELDS_WIDTH} height={DEBUG_TAB_AREA.height} />
      <DebugFieldTemplates width={FIELDS_WIDTH - 24} />

      <DebugText
        tag={"heading_target"}
        x={DEBUG_ACTIONS_X}
        y={0}
        width={300}
        label={"target"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"crosshair_button"} label={"under crosshair"} x={DEBUG_ACTIONS_X} y={24} />
      <DebugButton tag={"nearest_button"} label={"nearest"} x={COLUMN_2_X} y={24} />
      <DebugButton tag={"clear_button"} label={"clear target"} x={DEBUG_ACTIONS_X} y={24 + STEP} />

      <DebugText
        tag={"heading_world"}
        x={DEBUG_ACTIONS_X}
        y={104}
        width={300}
        label={"world"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"teleport_button"} label={"teleport to"} x={DEBUG_ACTIONS_X} y={128} />
      <DebugButton tag={"pull_button"} label={"pull to actor"} x={COLUMN_2_X} y={128} />
      <DebugButton tag={"release_button"} label={"release"} x={DEBUG_ACTIONS_X} y={128 + STEP} />

      <DebugText
        tag={"heading_condition"}
        x={DEBUG_ACTIONS_X}
        y={208}
        width={300}
        label={"condition"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"heal_button"} label={"heal"} x={DEBUG_ACTIONS_X} y={232} />
      <DebugButton tag={"wound_button"} label={"wound"} x={COLUMN_2_X} y={232} />
      <DebugButton tag={"kill_button"} label={"kill"} x={DEBUG_ACTIONS_X} y={232 + STEP} />

      <DebugText
        tag={"heading_relation"}
        x={DEBUG_ACTIONS_X}
        y={312}
        width={300}
        label={"relation to actor"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"friend_button"} label={"make friend"} x={DEBUG_ACTIONS_X} y={336} />
      <DebugButton tag={"neutral_button"} label={"make neutral"} x={COLUMN_2_X} y={336} />
      <DebugButton tag={"enemy_button"} label={"make enemy"} x={DEBUG_ACTIONS_X} y={336 + STEP} />

      <DebugText
        tag={"heading_log"}
        x={DEBUG_ACTIONS_X}
        y={416}
        width={300}
        label={"write to log"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"log_state_button"} label={"state"} x={DEBUG_ACTIONS_X} y={440} />
      <DebugButton tag={"log_planner_button"} label={"planner"} x={COLUMN_2_X} y={440} />
      <DebugButton tag={"log_inventory_button"} label={"inventory"} x={DEBUG_ACTIONS_X} y={440 + STEP} />
      <DebugButton tag={"log_relations_button"} label={"relations"} x={COLUMN_2_X} y={440 + STEP} />
      <DebugButton
        tag={"log_state_controller_button"}
        label={"state controller"}
        x={DEBUG_ACTIONS_X}
        y={440 + STEP * 2}
      />
    </XrRoot>
  );
}
