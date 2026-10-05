import { TLabel } from "xray16/lib";

import { DEBUG_CARD, getDebugCardHeight } from "@/engine/core/ui/debug/debug_layout";

/**
 * Button of an action card, and whether it takes a whole row.
 */
export interface IDebugAction {
  tag: string;
  label: TLabel;
  isWide?: boolean;
}

/**
 * Action card of a stack: its tag, title, buttons and rows left free under them for controls placed over it.
 */
export interface IDebugActionCard {
  tag: string;
  title: TLabel;
  actions: Array<IDebugAction>;
  extraRows?: number;
}

/**
 * Where a button of an action card goes.
 */
export interface IDebugActionPlace {
  action: IDebugAction;
  row: number;
  column: number;
}

/**
 * Place the buttons of an action card two a row, a wide button on a row of its own.
 *
 * @param actions - Buttons of the card.
 * @returns Where each button goes, and how many rows they take.
 */
export function placeDebugActions(actions: Array<IDebugAction>): { places: Array<IDebugActionPlace>; rows: number } {
  const places: Array<IDebugActionPlace> = [];
  let row: number = 0;
  let column: number = 0;

  for (const action of actions) {
    if (action.isWide && column > 0) {
      row += 1;
      column = 0;
    }

    places.push({ action, row, column });

    if (action.isWide || column === 1) {
      row += 1;
      column = 0;
    } else {
      column = 1;
    }
  }

  return { places, rows: row + column };
}

/**
 * @param card - Action card.
 * @returns Height of the card with its title, its buttons and its free rows.
 */
export function getDebugActionCardHeight(card: IDebugActionCard): number {
  return getDebugCardHeight(placeDebugActions(card.actions).rows + (card.extraRows ?? 0));
}

/**
 * @param cards - Action cards of a stack.
 * @returns Height of the stack, the cards one gap apart.
 */
export function getDebugCardStackHeight(cards: Array<IDebugActionCard>): number {
  return cards.reduce(
    (height, card, index) => height + getDebugActionCardHeight(card) + (index ? DEBUG_CARD.gap : 0),
    0
  );
}
