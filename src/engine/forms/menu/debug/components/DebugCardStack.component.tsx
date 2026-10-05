import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_CARD } from "@/engine/core/ui/debug/debug_layout";
import { getDebugActionCardHeight, IDebugActionCard } from "@/engine/forms/menu/debug/components/debug_actions";
import { DebugActionCard } from "@/engine/forms/menu/debug/components/DebugActionCard.component";

/**
 * Action cards stacked down the side column, one gap apart.
 */
export function DebugCardStack(props: { x: number; y: number; cards: Array<IDebugActionCard> }): JSXNode {
  const nodes: Array<JSXNode> = [];
  let y: number = props.y;

  for (const card of props.cards) {
    nodes.push(<DebugActionCard {...card} x={props.x} y={y} />);
    y += getDebugActionCardHeight(card) + DEBUG_CARD.gap;
  }

  return <Fragment>{nodes}</Fragment>;
}
