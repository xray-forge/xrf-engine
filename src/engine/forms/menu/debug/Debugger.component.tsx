import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BUTTON_HEIGHT,
  DEBUG_FRAME,
  DEBUG_GAP,
  DEBUG_HEADER_HEIGHT,
  DEBUG_MESSAGE_HEIGHT,
  DEBUG_RECENT_TARGETS,
  DEBUG_TAB_AREA,
  DEBUG_TAB_LIST_WIDTH,
} from "@/engine/core/ui/debug/debug_layout";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";
import { XrComponent, XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_HEADING_COLOR,
  DEBUG_LABEL_COLOR,
  DEBUG_TINT,
  DebugBorder,
  DebugButton,
  DebugCheckBox,
  DebugFill,
  DebugPanel,
  DebugRow,
  DebugSelection,
  DebugTabStrip,
  DebugText,
} from "@/engine/forms/menu/debug/components";

const FRAME_RIGHT: number = DEBUG_FRAME.x + DEBUG_FRAME.width;
const HEADER_CENTER_Y: number = DEBUG_FRAME.y + DEBUG_HEADER_HEIGHT / 2;
const CLOSE_WIDTH: number = 72;
const CLOSE_X: number = FRAME_RIGHT - DEBUG_GAP - CLOSE_WIDTH;
const RECENT_X: number = CLOSE_X - DEBUG_GAP - DEBUG_RECENT_TARGETS.width;
const RECENT_LIST_Y: number = DEBUG_FRAME.y + DEBUG_HEADER_HEIGHT - 1;
const PIN_X: number = RECENT_X - DEBUG_GAP - 48;
const MESSAGE_Y: number = DEBUG_FRAME.y + DEBUG_FRAME.height - DEBUG_MESSAGE_HEIGHT;
const SIDEBAR_Y: number = DEBUG_FRAME.y + DEBUG_HEADER_HEIGHT - 1;

/**
 * Create the debugger window: a framed window over the dimmed game, with a header naming the target, the tab list down
 * its left, the area tabs open in and the message line across its bottom.
 *
 * @returns Rendered debugger window component.
 */
export function create(): JSXNode {
  return (
    <XrRoot>
      <background x={0} y={0} width={SCREEN_BASE_WIDTH} height={SCREEN_BASE_HEIGHT}>
        <DebugFill x={0} y={0} width={SCREEN_BASE_WIDTH} height={SCREEN_BASE_HEIGHT} tint={DEBUG_TINT.backdrop} />
        <DebugFill
          x={DEBUG_FRAME.x}
          y={DEBUG_FRAME.y}
          width={DEBUG_FRAME.width}
          height={DEBUG_FRAME.height}
          tint={DEBUG_TINT.surface}
        />
        <DebugBorder
          x={DEBUG_FRAME.x}
          y={DEBUG_FRAME.y}
          width={DEBUG_FRAME.width}
          height={DEBUG_FRAME.height}
          tint={DEBUG_TINT.border}
        />
      </background>

      <DebugPanel
        tag={"header_background"}
        x={DEBUG_FRAME.x}
        y={DEBUG_FRAME.y}
        width={DEBUG_FRAME.width}
        height={DEBUG_HEADER_HEIGHT}
        tint={DEBUG_TINT.raised}
      >
        <DebugText
          tag={"auto_static"}
          x={DEBUG_GAP}
          y={0}
          width={DEBUG_TAB_LIST_WIDTH - DEBUG_GAP}
          height={DEBUG_HEADER_HEIGHT}
          label={"debugger"}
          color={DEBUG_HEADING_COLOR}
          isLarge
        />
        <DebugFill
          x={DEBUG_TAB_LIST_WIDTH - 1}
          y={10}
          width={1}
          height={DEBUG_HEADER_HEIGHT - 20}
          tint={DEBUG_TINT.border}
        />
      </DebugPanel>

      <DebugText tag={"header_target"} x={DEBUG_TAB_AREA.x} y={DEBUG_FRAME.y + 7} width={460} height={22} isLarge />
      <DebugText
        tag={"header_location"}
        x={DEBUG_TAB_AREA.x}
        y={DEBUG_FRAME.y + 27}
        width={460}
        color={DEBUG_LABEL_COLOR}
      />
      <DebugCheckBox tag={"pin_check"} x={PIN_X} y={HEADER_CENTER_Y - 8} label={"pin"} />
      <DebugButton
        tag={"recent_button"}
        label={"recent targets"}
        x={RECENT_X}
        y={HEADER_CENTER_Y - DEBUG_BUTTON_HEIGHT / 2}
        width={DEBUG_RECENT_TARGETS.width}
      />
      <DebugButton
        tag={"close_button"}
        label={"close"}
        x={CLOSE_X}
        y={HEADER_CENTER_Y - DEBUG_BUTTON_HEIGHT / 2}
        width={CLOSE_WIDTH}
      />

      <DebugPanel
        tag={"tab_list_background"}
        x={DEBUG_FRAME.x}
        y={SIDEBAR_Y}
        width={DEBUG_TAB_LIST_WIDTH}
        height={MESSAGE_Y - SIDEBAR_Y + 1}
        tint={DEBUG_TINT.raised}
      />
      <DebugTabStrip
        tag={"tabs"}
        x={DEBUG_FRAME.x + 8}
        y={DEBUG_TAB_AREA.y}
        ids={Object.values(EDebugTab)}
        columns={1}
        buttonWidth={DEBUG_TAB_LIST_WIDTH - 16}
        buttonHeight={30}
        gap={2}
        align={"l"}
        isPlain
        isLarge
      />

      <XrComponent
        tag={"tab_area"}
        x={DEBUG_TAB_AREA.x}
        y={DEBUG_TAB_AREA.y}
        width={DEBUG_TAB_AREA.width}
        height={DEBUG_TAB_AREA.height}
      />

      <DebugPanel
        tag={"message_background"}
        x={DEBUG_FRAME.x}
        y={MESSAGE_Y}
        width={DEBUG_FRAME.width}
        height={DEBUG_MESSAGE_HEIGHT}
        tint={DEBUG_TINT.raised}
      />
      <DebugPanel
        tag={"recent_list"}
        x={RECENT_X}
        y={RECENT_LIST_Y}
        width={DEBUG_RECENT_TARGETS.width}
        height={DEBUG_RECENT_TARGETS.rows * DEBUG_RECENT_TARGETS.rowHeight + 12}
        tint={DEBUG_TINT.raised}
      />
      <DebugSelection
        tag={"recent_selection"}
        width={DEBUG_RECENT_TARGETS.width - 12}
        height={DEBUG_RECENT_TARGETS.rowHeight}
      />
      <DebugRow
        tag={"recent_row"}
        x={6}
        y={6}
        width={DEBUG_RECENT_TARGETS.width - 12}
        height={DEBUG_RECENT_TARGETS.rowHeight}
      />

      <DebugText
        tag={"message"}
        x={DEBUG_FRAME.x + DEBUG_GAP}
        y={MESSAGE_Y + 4}
        width={DEBUG_FRAME.width - DEBUG_GAP * 2}
        color={DEBUG_HEADING_COLOR}
      />
    </XrRoot>
  );
}
