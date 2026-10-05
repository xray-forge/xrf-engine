import { JSXNode, JSXXML } from "jsx-xml";

import {
  DEBUG_GAP,
  DEBUG_MAIN_WIDTH,
  DEBUG_ROW_HEIGHT,
  DEBUG_SIDE,
  DEBUG_TAB_AREA,
} from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_MUTED_COLOR,
  DebugCardStack,
  DebugCheckBox,
  DebugFieldTemplates,
  DebugList,
  DebugText,
} from "@/engine/forms/menu/debug/components";

const STATE_HEIGHT: number = 100;
const TOGGLES_Y: number = STATE_HEIGHT + DEBUG_GAP;

/**
 * Create the player tab: the actor's state and the console toggles on the left, and cards of actions on the actor and
 * the world on the right.
 *
 * @returns Rendered player tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"fields"} x={0} y={0} width={DEBUG_MAIN_WIDTH} height={STATE_HEIGHT} />
      <DebugFieldTemplates width={DEBUG_MAIN_WIDTH - 24} />

      <DebugList
        tag={"toggles"}
        x={0}
        y={TOGGLES_Y}
        width={DEBUG_MAIN_WIDTH}
        height={DEBUG_TAB_AREA.height - TOGGLES_Y}
      />
      <toggle_row x={0} y={0} width={DEBUG_MAIN_WIDTH - 24} height={DEBUG_ROW_HEIGHT + 2} />
      <DebugCheckBox tag={"toggle_check"} x={2} y={2} label={"toggle"} />
      <DebugText
        tag={"toggle_unavailable"}
        x={2}
        y={1}
        width={DEBUG_MAIN_WIDTH - 28}
        label={""}
        color={DEBUG_MUTED_COLOR}
      />

      <DebugCardStack
        x={DEBUG_SIDE.x}
        y={0}
        cards={[
          {
            tag: "heading_money",
            title: "money",
            actions: [
              { tag: "money_small_button", label: "+1 000" },
              { tag: "money_large_button", label: "+50 000" },
              { tag: "money_take_button", label: "-1 000" },
            ],
          },
          {
            tag: "heading_actor",
            title: "the actor",
            actions: [
              { tag: "heal_button", label: "heal" },
              { tag: "log_location_button", label: "log location" },
            ],
          },
          {
            tag: "heading_world",
            title: "world",
            actions: [
              { tag: "time_hour_button", label: "+1 hour" },
              { tag: "time_day_button", label: "+6 hours" },
              { tag: "weather_button", label: "change weather" },
              { tag: "surge_button", label: "start / stop surge" },
            ],
          },
        ]}
      />
    </XrRoot>
  );
}
