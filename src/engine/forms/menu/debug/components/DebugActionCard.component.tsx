import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import {
  DEBUG_BUTTON_GAP,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_CARD,
  DEBUG_SIDE,
} from "@/engine/core/ui/debug/debug_layout";
import {
  getDebugActionCardHeight,
  IDebugActionCard,
  placeDebugActions,
} from "@/engine/forms/menu/debug/components/debug_actions";
import { DebugButton } from "@/engine/forms/menu/debug/components/DebugButton.component";
import { DebugCard } from "@/engine/forms/menu/debug/components/DebugCard.component";

/**
 * Card of action buttons as wide as the side column, two a row, unless a button asks for the whole row.
 */
export function DebugActionCard(props: IDebugActionCard & { x: number; y: number }): JSXNode {
  const x: number = props.x + DEBUG_CARD.padding;
  const y: number = props.y + DEBUG_CARD.titleHeight + DEBUG_CARD.padding;

  return (
    <Fragment>
      <DebugCard
        tag={props.tag}
        x={props.x}
        y={props.y}
        width={DEBUG_SIDE.width}
        height={getDebugActionCardHeight(props)}
        title={props.title}
      />
      {placeDebugActions(props.actions).places.map(({ action, row, column }) => (
        <DebugButton
          tag={action.tag}
          label={action.label}
          x={x + column * (DEBUG_BUTTON_WIDTH + DEBUG_CARD.gap)}
          y={y + row * (DEBUG_BUTTON_HEIGHT + DEBUG_BUTTON_GAP)}
          width={action.isWide ? DEBUG_SIDE.width - DEBUG_CARD.padding * 2 : DEBUG_BUTTON_WIDTH}
        />
      ))}
    </Fragment>
  );
}
