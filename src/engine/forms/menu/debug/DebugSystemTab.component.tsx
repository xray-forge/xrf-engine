import { JSXNode, JSXXML } from "jsx-xml";

import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_ACTIONS_X,
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

/**
 * Create the system tab: Lua runtime facts on the left, memory, dumps and debug views on the right.
 *
 * @returns Rendered system tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"fields"} x={0} y={0} width={FIELDS_WIDTH} height={DEBUG_TAB_AREA.height} />
      <DebugFieldTemplates width={FIELDS_WIDTH - 24} />

      <DebugText tag={"heading_lua"} x={DEBUG_ACTIONS_X} y={0} width={300} label={"lua"} color={DEBUG_HEADING_COLOR} />
      <DebugButton tag={"collect_garbage_button"} label={"collect garbage"} x={DEBUG_ACTIONS_X} y={24} />
      <DebugButton tag={"refresh_button"} label={"refresh"} x={COLUMN_2_X} y={24} />

      <DebugText
        tag={"heading_dumps"}
        x={DEBUG_ACTIONS_X}
        y={76}
        width={300}
        label={"dumps"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"dump_lua_data_button"} label={"lua data"} x={DEBUG_ACTIONS_X} y={100} />
      <DebugButton tag={"dump_system_ini_button"} label={"system.ini"} x={COLUMN_2_X} y={100} />

      <DebugText
        tag={"heading_views"}
        x={DEBUG_ACTIONS_X}
        y={152}
        width={300}
        label={"views"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"simulation_view_button"} label={"simulation on map"} x={DEBUG_ACTIONS_X} y={176} />
    </XrRoot>
  );
}
