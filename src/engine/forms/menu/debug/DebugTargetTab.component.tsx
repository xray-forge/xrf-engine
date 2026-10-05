import { JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_MAIN_WIDTH, DEBUG_SIDE, DEBUG_TAB_AREA } from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import { DebugCardStack, DebugFieldTemplates, DebugList } from "@/engine/forms/menu/debug/components";

/**
 * Create the target tab: what the target is on the left, and cards of actions on it on the right.
 *
 * @returns Rendered target tab component.
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
            tag: "heading_target",
            title: "target",
            actions: [
              { tag: "crosshair_button", label: "under crosshair" },
              { tag: "nearest_button", label: "nearest" },
              { tag: "clear_button", label: "clear target" },
            ],
          },
          {
            tag: "heading_world",
            title: "world",
            actions: [
              { tag: "teleport_button", label: "teleport to" },
              { tag: "pull_button", label: "pull to actor" },
              { tag: "release_button", label: "release" },
            ],
          },
          {
            tag: "heading_interact",
            title: "interact",
            actions: [
              { tag: "talk_button", label: "talk" },
              { tag: "trade_button", label: "trade" },
            ],
          },
          {
            tag: "heading_condition",
            title: "condition",
            actions: [
              { tag: "heal_button", label: "heal" },
              { tag: "wound_button", label: "wound" },
              { tag: "kill_button", label: "kill" },
            ],
          },
          {
            tag: "heading_relation",
            title: "relation to actor",
            actions: [
              { tag: "friend_button", label: "make friend" },
              { tag: "neutral_button", label: "make neutral" },
              { tag: "enemy_button", label: "make enemy" },
            ],
          },
          {
            tag: "heading_log",
            title: "write to log",
            actions: [
              { tag: "log_state_button", label: "state" },
              { tag: "log_planner_button", label: "planner" },
              { tag: "log_inventory_button", label: "inventory" },
              { tag: "log_relations_button", label: "relations" },
              { tag: "log_state_controller_button", label: "state controller", isWide: true },
            ],
          },
        ]}
      />
    </XrRoot>
  );
}
