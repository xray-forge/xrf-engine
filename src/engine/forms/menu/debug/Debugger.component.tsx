import { JSXNode, JSXXML } from "jsx-xml";

import { WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";
import { XrCheckBox, XrComponent, XrRoot, XrStatic, XrText } from "@/engine/forms/components/base";
import { XrComboBox } from "@/engine/forms/components/base/XrListRenderer.component";
import { XrTabButton } from "@/engine/forms/components/base/XrTabButton.component";
import { XrTexture } from "@/engine/forms/components/base/XrTexture.component";
import {
  DEBUG_HEADER_HEIGHT,
  DEBUG_HEADING_COLOR,
  DEBUG_LABEL_COLOR,
  DEBUG_MARGIN,
  DEBUG_MESSAGE_HEIGHT,
  DEBUG_TAB_AREA,
  DEBUG_TAB_LIST_WIDTH,
  DebugButton,
  DebugPanel,
  DebugText,
} from "@/engine/forms/menu/debug/debug_layout";

const TAB_HEIGHT: number = 28;
const HEADER_WIDTH: number = SCREEN_BASE_WIDTH - DEBUG_MARGIN * 2;

/**
 * Create the debugger window: a header with the target, the tab list, the area tabs open in and the message line.
 *
 * @returns Rendered debugger window component.
 */
export function create(): JSXNode {
  const tabs: Array<EDebugTab> = Object.values(EDebugTab);
  const messageY: number = SCREEN_BASE_HEIGHT - DEBUG_MARGIN - DEBUG_MESSAGE_HEIGHT;

  return (
    <XrRoot>
      <XrStatic tag={"background"} x={0} y={0} width={SCREEN_BASE_WIDTH} height={SCREEN_BASE_HEIGHT}>
        <XrTexture id={"ui_icons_PDA_tooltips_back"} r={8} g={8} b={8} a={240} />
      </XrStatic>

      <DebugPanel
        tag={"header_background"}
        x={DEBUG_MARGIN}
        y={DEBUG_MARGIN}
        width={HEADER_WIDTH}
        height={DEBUG_HEADER_HEIGHT}
      />
      <DebugText tag={"header_target"} x={DEBUG_MARGIN + 8} y={DEBUG_MARGIN + 4} width={560} isLarge />
      <DebugText
        tag={"header_location"}
        x={DEBUG_MARGIN + 8}
        y={DEBUG_MARGIN + 24}
        width={560}
        color={DEBUG_LABEL_COLOR}
      />
      <XrCheckBox
        tag={"pin_check"}
        x={DEBUG_MARGIN + 580}
        y={DEBUG_MARGIN + 14}
        width={18}
        height={18}
        label={"pin"}
        textX={22}
        color={WHITE}
        font={fonts.letterica16}
      />
      <XrComboBox tag={"recent_targets"} x={DEBUG_MARGIN + 640} y={DEBUG_MARGIN + 13} width={260} height={22} />
      <DebugButton
        tag={"close_button"}
        label={"close"}
        x={SCREEN_BASE_WIDTH - DEBUG_MARGIN - 76}
        y={DEBUG_MARGIN + 13}
        width={68}
      />

      <DebugPanel
        tag={"tab_list_background"}
        x={DEBUG_MARGIN}
        y={DEBUG_TAB_AREA.y}
        width={DEBUG_TAB_LIST_WIDTH}
        height={DEBUG_TAB_AREA.height}
      />
      <tabs
        x={DEBUG_MARGIN + 6}
        y={DEBUG_TAB_AREA.y + 6}
        width={DEBUG_TAB_LIST_WIDTH - 12}
        height={tabs.length * (TAB_HEIGHT + 4)}
      >
        {tabs.map((it, index) => (
          <XrTabButton
            id={it}
            x={0}
            y={index * (TAB_HEIGHT + 4)}
            width={DEBUG_TAB_LIST_WIDTH - 12}
            height={TAB_HEIGHT}
            texture={"ui_inGame2_Mp_bigbuttone"}
            stretch
          >
            <XrText label={it} font={fonts.letterica18} align={"c"} vertAlign={"c"} />
            <text_color>
              <e r={220} g={220} b={220} />
              <t r={DEBUG_HEADING_COLOR.r} g={DEBUG_HEADING_COLOR.g} b={DEBUG_HEADING_COLOR.b} />
              <h r={WHITE.r} g={WHITE.g} b={WHITE.b} />
            </text_color>
          </XrTabButton>
        ))}
      </tabs>

      <XrComponent
        tag={"tab_area"}
        x={DEBUG_TAB_AREA.x}
        y={DEBUG_TAB_AREA.y}
        width={DEBUG_TAB_AREA.width}
        height={DEBUG_TAB_AREA.height}
      />

      <DebugPanel
        tag={"message_background"}
        x={DEBUG_MARGIN}
        y={messageY}
        width={HEADER_WIDTH}
        height={DEBUG_MESSAGE_HEIGHT}
      />
      <DebugText
        tag={"message"}
        x={DEBUG_MARGIN + 8}
        y={messageY + 2}
        width={HEADER_WIDTH - 16}
        color={DEBUG_HEADING_COLOR}
      />
    </XrRoot>
  );
}
