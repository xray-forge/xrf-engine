import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_MAIN_WIDTH, DEBUG_SIDE, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import { DebugCardStack, DebugFieldTemplates, DebugList } from "@/engine/forms/menu/debug/components";

/**
 * Create the system tab: Lua runtime facts on the left, and cards of memory, dumps and debug views on the right.
 *
 * @returns Rendered system tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"fields"} x={0} y={0} width={DEBUG_MAIN_WIDTH} height={DEBUG_TAB_AREA.height} />
      <DebugFieldTemplates width={DEBUG_MAIN_WIDTH - 24} />

      <DebugCardStack
        x={DEBUG_SIDE.x}
        y={0}
        cards={[
          {
            tag: "heading_lua",
            title: "lua",
            actions: [
              { tag: "collect_garbage_button", label: "collect garbage" },
              { tag: "refresh_button", label: "refresh" },
            ],
          },
          {
            tag: "heading_dumps",
            title: "dumps",
            actions: [
              { tag: "dump_lua_data_button", label: "lua data" },
              { tag: "dump_system_ini_button", label: "system.ini" },
            ],
          },
          {
            tag: "heading_views",
            title: "views",
            actions: [{ tag: "simulation_view_button", label: "simulation on map" }],
          },
        ]}
      />
    </XrRoot>
  );
}
