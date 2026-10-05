import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { EDebugOverlaySlot, EDebugOverlayView } from "@/engine/core/managers/debug/debug_types";
import {
  DEBUG_BUTTON_GAP,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_CARD,
  DEBUG_MAIN_WIDTH,
  DEBUG_SIDE,
  DEBUG_TAB_AREA,
  getDebugCardHeight,
  getDebugOverlaySlotTag,
} from "@/engine/core/ui/debug/debug_layout";
import { XrRoot } from "@/engine/forms/components/base";
import {
  DEBUG_LABEL_COLOR,
  DebugCard,
  DebugCardStack,
  DebugFieldTemplates,
  DebugList,
  DebugTabStrip,
  DebugText,
  getDebugCardStackHeight,
  IDebugActionCard,
} from "@/engine/forms/menu/debug/components";

const SLOTS: Array<EDebugOverlaySlot> = Object.values(EDebugOverlaySlot);
const VIEWS: Array<EDebugOverlayView> = Object.values(EDebugOverlayView);
// The actor view reads as the string table id of the actor's name, which the game would translate.
const VIEW_LABELS: Partial<Record<string, string>> = { [EDebugOverlayView.ACTOR]: "the actor" };

const INNER_WIDTH: number = DEBUG_MAIN_WIDTH - DEBUG_CARD.padding * 2;
const VIEW_WIDTH: number = Math.floor((INNER_WIDTH - (VIEWS.length - 1) * 4) / VIEWS.length);
const SLOT_HEIGHT: number = getDebugCardHeight(1);
const PREVIEW_Y: number = SLOTS.length * (SLOT_HEIGHT + DEBUG_CARD.gap);
const PREVIEW_LIST_Y: number = PREVIEW_Y + DEBUG_CARD.titleHeight + DEBUG_CARD.padding;

const CARDS: Array<IDebugActionCard> = [
  {
    tag: "heading_overlay",
    title: "overlay",
    actions: [{ tag: "toggle_button", label: "", isWide: true }],
    extraRows: 1,
  },
  {
    tag: "heading_flow",
    title: "pinned flow",
    actions: [
      { tag: "flow_refresh_button", label: "run now" },
      { tag: "flow_unpin_button", label: "unpin" },
    ],
    extraRows: 1,
  },
];

// Rows the cards leave free for a line of text under their buttons.
const OVERLAY_HINT_Y: number = DEBUG_CARD.titleHeight + DEBUG_CARD.padding + DEBUG_BUTTON_HEIGHT + DEBUG_BUTTON_GAP;
const FLOW_NAME_Y: number = getDebugCardStackHeight(CARDS.slice(0, 1)) + DEBUG_CARD.gap + OVERLAY_HINT_Y;

/**
 * Create the overlay tab: a card per overlay slot choosing what it shows, and the pinned flow as the overlay shows it,
 * on the left; turning the overlay on and the pinned flow on the right.
 *
 * @returns Rendered overlay tab component.
 */
export function create(): JSXNode {
  return (
    <XrRoot width={DEBUG_TAB_AREA.width} height={DEBUG_TAB_AREA.height}>
      {SLOTS.map((slot, index) => (
        <Fragment>
          <DebugCard
            tag={`heading_${getDebugOverlaySlotTag(slot)}`}
            x={0}
            y={index * (SLOT_HEIGHT + DEBUG_CARD.gap)}
            width={DEBUG_MAIN_WIDTH}
            height={SLOT_HEIGHT}
            title={slot}
          />
          <DebugTabStrip
            tag={`slot_${getDebugOverlaySlotTag(slot)}`}
            x={DEBUG_CARD.padding}
            y={index * (SLOT_HEIGHT + DEBUG_CARD.gap) + DEBUG_CARD.titleHeight + DEBUG_CARD.padding}
            ids={VIEWS}
            labels={VIEW_LABELS}
            columns={VIEWS.length}
            buttonWidth={VIEW_WIDTH}
            buttonHeight={DEBUG_BUTTON_HEIGHT}
          />
        </Fragment>
      ))}

      <DebugCard
        tag={"heading_preview"}
        x={0}
        y={PREVIEW_Y}
        width={DEBUG_MAIN_WIDTH}
        height={DEBUG_TAB_AREA.height - PREVIEW_Y}
        title={"pinned flow, as the overlay shows it"}
      />
      <DebugList
        tag={"fields"}
        x={DEBUG_CARD.padding}
        y={PREVIEW_LIST_Y}
        width={INNER_WIDTH}
        height={DEBUG_TAB_AREA.height - PREVIEW_LIST_Y - DEBUG_CARD.padding}
      />
      <DebugFieldTemplates width={INNER_WIDTH - 24} />

      <DebugCardStack x={DEBUG_SIDE.x} y={0} cards={CARDS} />
      <DebugText
        tag={"overlay_hint"}
        x={DEBUG_SIDE.x + DEBUG_CARD.padding}
        y={OVERLAY_HINT_Y}
        width={DEBUG_SIDE.width - DEBUG_CARD.padding * 2}
        height={DEBUG_BUTTON_HEIGHT}
        label={"panels over the game while it runs"}
        color={DEBUG_LABEL_COLOR}
      />
      <DebugText
        tag={"pinned_flow"}
        x={DEBUG_SIDE.x + DEBUG_CARD.padding}
        y={FLOW_NAME_Y}
        width={DEBUG_SIDE.width - DEBUG_CARD.padding * 2}
        height={DEBUG_BUTTON_HEIGHT}
        color={DEBUG_LABEL_COLOR}
      />
    </XrRoot>
  );
}
