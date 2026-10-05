import { JSXNode, JSXXML } from "jsx-xml";

import { WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { XrCheckBox, XrRoot, XrStatic } from "@/engine/forms/components/base";
import {
  DEBUG_ACTIONS_X,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_HEADING_COLOR,
  DEBUG_ROW_HEIGHT,
  DEBUG_TAB_AREA,
  DebugButton,
  DebugFieldTemplates,
  DebugList,
  DebugText,
} from "@/engine/forms/menu/debug/debug_layout";

const TOGGLES_WIDTH: number = 300;
const STATE_X: number = TOGGLES_WIDTH + 16;
const STATE_WIDTH: number = DEBUG_ACTIONS_X - STATE_X - 16;
const COLUMN_2_X: number = DEBUG_ACTIONS_X + DEBUG_BUTTON_WIDTH + 8;
const STEP: number = DEBUG_BUTTON_HEIGHT + 6;

/**
 * Create the player tab: console toggles, the actor's state, and actions on the actor and the world.
 *
 * @returns Rendered player tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugList tag={"toggles"} x={0} y={0} width={TOGGLES_WIDTH} height={DEBUG_TAB_AREA.height} />
      <XrStatic tag={"toggle_row"} width={TOGGLES_WIDTH - 24} height={DEBUG_ROW_HEIGHT} />
      <XrCheckBox
        tag={"toggle_check"}
        x={0}
        y={1}
        width={18}
        height={18}
        label={"toggle"}
        textX={24}
        color={WHITE}
        font={fonts.letterica16}
      />

      <DebugList tag={"fields"} x={STATE_X} y={0} width={STATE_WIDTH} height={160} />
      <DebugFieldTemplates width={STATE_WIDTH - 24} />

      <DebugText
        tag={"heading_money"}
        x={DEBUG_ACTIONS_X}
        y={0}
        width={300}
        label={"money"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"money_small_button"} label={"+1 000"} x={DEBUG_ACTIONS_X} y={24} />
      <DebugButton tag={"money_large_button"} label={"+50 000"} x={COLUMN_2_X} y={24} />
      <DebugButton tag={"money_take_button"} label={"-1 000"} x={DEBUG_ACTIONS_X} y={24 + STEP} />

      <DebugText
        tag={"heading_actor"}
        x={DEBUG_ACTIONS_X}
        y={104}
        width={300}
        label={"the actor"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"heal_button"} label={"heal"} x={DEBUG_ACTIONS_X} y={128} />
      <DebugButton tag={"log_location_button"} label={"log location"} x={COLUMN_2_X} y={128} />

      <DebugText
        tag={"heading_world"}
        x={DEBUG_ACTIONS_X}
        y={180}
        width={300}
        label={"world"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugButton tag={"time_hour_button"} label={"+1 hour"} x={DEBUG_ACTIONS_X} y={204} />
      <DebugButton tag={"time_day_button"} label={"+6 hours"} x={COLUMN_2_X} y={204} />
      <DebugButton tag={"weather_button"} label={"change weather"} x={DEBUG_ACTIONS_X} y={204 + STEP} />
      <DebugButton tag={"surge_button"} label={"start / stop surge"} x={COLUMN_2_X} y={204 + STEP} />
    </XrRoot>
  );
}
