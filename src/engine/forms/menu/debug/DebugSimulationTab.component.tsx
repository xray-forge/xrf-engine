import { JSXNode, JSXXML } from "jsx-xml";

import { EDebugSimulationView } from "@/engine/core/managers/debug/debug_types";
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

const VIEWS: Array<string> = Object.values(EDebugSimulationView);
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
    tag: "heading_squad",
    title: "squad",
    actions: [
      { tag: "send_button", label: "send to target" },
      { tag: "release_button", label: "release" },
    ],
    extraRows: 1,
  },
  {
    tag: "heading_terrain",
    title: "smart terrain",
    actions: [
      { tag: "respawn_button", label: "respawn now" },
      { tag: "clear_button", label: "clear squads" },
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
 * Create the simulation tab: squads, smart terrains and levels on the left, what is selected and why, and cards of
 * what to do with it on the right.
 *
 * @returns Rendered simulation tab component.
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
        tag={"send_hint"}
        x={DEBUG_SIDE.x + DEBUG_CARD.padding}
        y={HINT_Y}
        width={DEBUG_SIDE.width - DEBUG_CARD.padding * 2}
        height={DEBUG_BUTTON_HEIGHT}
        label={"sends the selected squad to the debugger target"}
        color={DEBUG_LABEL_COLOR}
      />
    </XrRoot>
  );
}
