import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugWorldView } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BROWSER,
  DEBUG_BUTTON_GAP,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_CARD,
  DEBUG_SIDE,
  DEBUG_TAB_AREA,
} from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_LABEL_COLOR,
  DebugBrowser,
  DebugCardStack,
  DebugFieldTemplates,
  DebugList,
  DebugTabStrip,
  DebugText,
  getDebugCardStackHeight,
  IDebugActionCard,
} from "@/engine/forms/menu/debug/components";

const VIEWS: Array<string> = Object.values(EDebugWorldView);
const VIEW_WIDTH: number = Math.floor((DEBUG_TAB_AREA.width - (VIEWS.length - 1) * 4) / VIEWS.length);

const CARDS: Array<IDebugActionCard> = [
  {
    tag: "heading_go",
    title: "selected",
    actions: [
      { tag: "target_button", label: "make target" },
      { tag: "teleport_button", label: "teleport" },
    ],
  },
  {
    tag: "heading_positions",
    title: "saved positions",
    actions: [
      { tag: "save_position_button", label: "save current" },
      { tag: "delete_position_button", label: "delete selected" },
    ],
    extraRows: 1,
  },
  {
    tag: "heading_treasures",
    title: "treasure coordinates",
    actions: [
      { tag: "give_treasure_button", label: "give selected" },
      { tag: "give_random_treasure_button", label: "give random" },
      { tag: "give_all_treasures_button", label: "give all" },
    ],
  },
];

const CARDS_Y: number = DEBUG_TAB_AREA.height - getDebugCardStackHeight(CARDS);
const HINT_Y: number =
  CARDS_Y +
  getDebugCardStackHeight(CARDS.slice(0, 1)) +
  DEBUG_CARD.gap +
  DEBUG_CARD.titleHeight +
  DEBUG_CARD.padding +
  DEBUG_BUTTON_HEIGHT +
  DEBUG_BUTTON_GAP;

/**
 * Create the world tab: lists of places and things on the left, what is selected and cards of what to do with it on
 * the right.
 *
 * @returns Rendered world tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      <DebugTabStrip
        tag={"views"}
        x={0}
        y={0}
        ids={VIEWS}
        columns={VIEWS.length}
        buttonWidth={VIEW_WIDTH}
        buttonHeight={DEBUG_BUTTON_HEIGHT}
      />

      <DebugBrowser />

      <DebugList
        tag={"fields"}
        x={DEBUG_SIDE.x}
        y={DEBUG_BROWSER.y}
        width={DEBUG_SIDE.width}
        height={CARDS_Y - DEBUG_CARD.gap - DEBUG_BROWSER.y}
      />
      <DebugFieldTemplates width={DEBUG_SIDE.width - 24} />

      <DebugCardStack x={DEBUG_SIDE.x} y={CARDS_Y} cards={CARDS} />
      <DebugText
        tag={"positions_hint"}
        x={DEBUG_SIDE.x + DEBUG_CARD.padding}
        y={HINT_Y}
        width={DEBUG_SIDE.width - DEBUG_CARD.padding * 2}
        height={DEBUG_BUTTON_HEIGHT}
        label={"the search text names a saved position"}
        color={DEBUG_LABEL_COLOR}
      />
    </XrRoot>
  );
}
