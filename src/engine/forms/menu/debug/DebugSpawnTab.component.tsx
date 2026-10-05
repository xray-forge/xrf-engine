import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { EDebugSpawnDestination, EDebugSpawnKind } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BUTTON_GAP,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_CARD,
  DEBUG_SIDE,
  DEBUG_SPAWN_CELL,
  DEBUG_SPAWN_PREVIEW,
  DEBUG_SPAWN_RECENT_ROW,
  DEBUG_TAB_AREA,
  getDebugCardHeight,
} from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_TEXT_COLOR,
  DEBUG_TINT,
  DebugBorder,
  DebugBrowser,
  DebugButton,
  DebugCard,
  DebugFieldTemplates,
  DebugFill,
  DebugHoverArea,
  DebugList,
  DebugPanel,
  DebugRow,
  DebugSelection,
  DebugTabStrip,
} from "@/engine/forms/menu/debug/components";

const KINDS: Array<string> = Object.values(EDebugSpawnKind);
const KIND_WIDTH: number = Math.floor((DEBUG_TAB_AREA.width - (KINDS.length - 1) * 4) / KINDS.length);

const INNER_X: number = DEBUG_SIDE.x + DEBUG_CARD.padding;
const INNER_WIDTH: number = DEBUG_SIDE.width - DEBUG_CARD.padding * 2;
const STEP: number = DEBUG_BUTTON_HEIGHT + DEBUG_BUTTON_GAP;

const FIELDS_Y: number = DEBUG_SPAWN_PREVIEW.y + DEBUG_SPAWN_PREVIEW.height + DEBUG_CARD.gap;
const FIELDS_HEIGHT: number = 120;
const SPAWN_Y: number = FIELDS_Y + FIELDS_HEIGHT + DEBUG_CARD.gap;
const SPAWN_ROWS_Y: number = SPAWN_Y + DEBUG_CARD.titleHeight + DEBUG_CARD.padding;
const COUNT_Y: number = SPAWN_ROWS_Y + STEP * 3;
const RECENT_Y: number = SPAWN_Y + getDebugCardHeight(4) + DEBUG_CARD.gap;
const RECENT_ROWS_Y: number = RECENT_Y + DEBUG_CARD.titleHeight + DEBUG_CARD.padding;
const RECENT_HEIGHT: number =
  DEBUG_CARD.titleHeight +
  DEBUG_CARD.padding * 2 +
  DEBUG_SPAWN_RECENT_ROW.rows * (DEBUG_SPAWN_RECENT_ROW.height + DEBUG_SPAWN_RECENT_ROW.gap);

/**
 * Create the spawn tab: kinds and search on top, a page of the catalogue on the left, and the selected section, where
 * and how many to spawn and recent spawns on the right.
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
        ids={KINDS}
        columns={KINDS.length}
        buttonWidth={KIND_WIDTH}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugBrowser />

      <cell x={0} y={0} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height}>
        <DebugFill
          x={0}
          y={0}
          width={DEBUG_SPAWN_CELL.width}
          height={DEBUG_SPAWN_CELL.height}
          tint={DEBUG_TINT.raised}
        />
        <DebugBorder width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} tint={DEBUG_TINT.separator} />
      </cell>
      <DebugSelection tag={"cell_selection"} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} />
      <cell_icon x={0} y={0} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} />
      <DebugHoverArea tag={"cell_button"} width={DEBUG_SPAWN_CELL.width} height={DEBUG_SPAWN_CELL.height} />

      <DebugPanel
        tag={"preview_background"}
        x={DEBUG_SIDE.x}
        y={DEBUG_SPAWN_PREVIEW.y}
        width={DEBUG_SIDE.width}
        height={DEBUG_SPAWN_PREVIEW.height}
      />
      <preview_box
        x={DEBUG_SIDE.x}
        y={DEBUG_SPAWN_PREVIEW.y}
        width={DEBUG_SIDE.width}
        height={DEBUG_SPAWN_PREVIEW.height}
      />
      <preview_icon x={0} y={0} width={DEBUG_SIDE.width} height={DEBUG_SPAWN_PREVIEW.height} />

      <DebugList tag={"fields"} x={DEBUG_SIDE.x} y={FIELDS_Y} width={DEBUG_SIDE.width} height={FIELDS_HEIGHT} />
      <DebugFieldTemplates width={DEBUG_SIDE.width - 24} />

      <DebugCard
        tag={"heading_spawn"}
        x={DEBUG_SIDE.x}
        y={SPAWN_Y}
        width={DEBUG_SIDE.width}
        height={getDebugCardHeight(4)}
        title={"spawn"}
      />
      <DebugTabStrip
        tag={"destinations"}
        x={INNER_X}
        y={SPAWN_ROWS_Y}
        ids={Object.values(EDebugSpawnDestination)}
        columns={2}
        buttonWidth={DEBUG_BUTTON_WIDTH}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
        gap={DEBUG_BUTTON_GAP}
      />
      <DebugButton tag={"count_less_button"} label={"-"} x={INNER_X} y={COUNT_Y} width={28} />
      <count x={INNER_X + 32} y={COUNT_Y} width={DEBUG_BUTTON_WIDTH - 64} height={DEBUG_BUTTON_HEIGHT}>
        <text
          font={fonts.letterica18}
          align={"c"}
          vert_align={"c"}
          r={DEBUG_TEXT_COLOR.r}
          g={DEBUG_TEXT_COLOR.g}
          b={DEBUG_TEXT_COLOR.b}
        >
          1
        </text>
      </count>
      <DebugButton tag={"count_more_button"} label={"+"} x={INNER_X + DEBUG_BUTTON_WIDTH - 28} y={COUNT_Y} width={28} />
      <DebugButton
        tag={"spawn_button"}
        label={"spawn"}
        x={INNER_X + DEBUG_BUTTON_WIDTH + DEBUG_CARD.gap}
        y={COUNT_Y}
        font={fonts.letterica18}
      />

      <DebugCard
        tag={"heading_recent"}
        x={DEBUG_SIDE.x}
        y={RECENT_Y}
        width={DEBUG_SIDE.width}
        height={RECENT_HEIGHT}
        title={"recently spawned"}
      />
      <DebugRow
        tag={"recent_row"}
        x={INNER_X}
        y={RECENT_ROWS_Y}
        width={INNER_WIDTH}
        height={DEBUG_SPAWN_RECENT_ROW.height}
      />
    </XrRoot>
  );
}
