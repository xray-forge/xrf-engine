import { JSXNode, JSXXML } from "jsx-xml";

import { WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { EDebugSpawnDestination, EDebugSpawnKind } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BROWSER,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_SPAWN_CELL,
  DEBUG_SPAWN_RECENT_ROW,
  DEBUG_TAB_AREA,
} from "@/engine/core/ui/debug/debug_layout";
import { Xr3tButton, XrRoot, XrStatic, XrText } from "@/engine/forms/components/base";
import { XrTexture } from "@/engine/forms/components/base/XrTexture.component";
import {
  DEBUG_HEADING_COLOR,
  DebugBrowser,
  DebugButton,
  DebugFieldTemplates,
  DebugList,
  DebugPanel,
  DebugTabStrip,
  DebugText,
} from "@/engine/forms/menu/debug/debug_layout";

const SIDE_X: number = DEBUG_BROWSER.width + 12;
const SIDE_WIDTH: number = DEBUG_TAB_AREA.width - SIDE_X;

/**
 * Create the spawn tab: kinds and search on top, a page of the catalogue on the left, and the selected section, the
 * count, the destination and recent spawns on the right.
 *
 * @returns Rendered spawn tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugTabStrip
        tag={"kinds"}
        x={0}
        y={0}
        ids={Object.values(EDebugSpawnKind)}
        columns={10}
        buttonWidth={82}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugBrowser />

      <XrStatic tag={"cell"} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height}>
        <XrTexture id={"ui_icons_PDA_tooltips_back"} r={60} g={60} b={60} a={200} />
      </XrStatic>
      <XrStatic tag={"cell_selection"} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height}>
        <XrTexture id={"ui_inGame2_Mp_bigbuttone_h"} r={255} g={190} b={90} a={150} />
      </XrStatic>
      <XrStatic tag={"cell_icon"} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} />
      <Xr3tButton tag={"cell_button"} label={""} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} />

      <DebugPanel tag={"preview_background"} x={SIDE_X} y={60} width={SIDE_WIDTH} height={148} />
      <XrStatic tag={"preview_box"} x={SIDE_X} y={64} width={SIDE_WIDTH} height={140} />
      <XrStatic tag={"preview_icon"} width={SIDE_WIDTH} height={140} />

      <DebugList tag={"fields"} x={SIDE_X} y={214} width={SIDE_WIDTH} height={124} />
      <DebugFieldTemplates width={SIDE_WIDTH - 24} />

      <DebugText tag={"heading_count"} x={SIDE_X} y={346} width={70} label={"count"} color={DEBUG_HEADING_COLOR} />
      <DebugButton tag={"count_less_button"} label={"-"} x={SIDE_X + 80} y={344} width={30} />
      <XrStatic tag={"count"} x={SIDE_X + 114} y={344} width={60} height={DEBUG_BUTTON_HEIGHT}>
        <XrText label={"1"} font={fonts.letterica18} color={WHITE} align={"c"} vertAlign={"c"} />
      </XrStatic>
      <DebugButton tag={"count_more_button"} label={"+"} x={SIDE_X + 178} y={344} width={30} />

      <DebugText
        tag={"heading_destination"}
        x={SIDE_X}
        y={374}
        width={SIDE_WIDTH}
        label={"put it"}
        color={DEBUG_HEADING_COLOR}
      />
      <DebugTabStrip
        tag={"destinations"}
        x={SIDE_X}
        y={396}
        ids={Object.values(EDebugSpawnDestination)}
        columns={2}
        buttonWidth={(SIDE_WIDTH - 4) / 2}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugButton tag={"spawn_button"} label={"spawn"} x={SIDE_X} y={482} width={SIDE_WIDTH - 4} height={28} />

      <DebugText
        tag={"heading_recent"}
        x={SIDE_X}
        y={DEBUG_SPAWN_RECENT_ROW.y - 20}
        width={SIDE_WIDTH}
        label={"recently spawned"}
        color={DEBUG_HEADING_COLOR}
      />
      <Xr3tButton
        tag={"recent_row"}
        label={""}
        x={SIDE_X}
        width={SIDE_WIDTH - 4}
        height={DEBUG_SPAWN_RECENT_ROW.height}
        font={fonts.letterica16}
        textColor={WHITE}
        texture={"ui_inGame2_Mp_bigbuttone"}
        align={"l"}
      />
    </XrRoot>
  );
}
