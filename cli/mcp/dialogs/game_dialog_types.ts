import { Nullable } from "#/utils/types";

/**
 * Info portions and script predicates a dialog or a phrase declares.
 */
export interface IGameDialogConditions {
  hasInfo: Array<string>;
  dontHasInfo: Array<string>;
  preconditions: Array<string>;
}

/**
 * One phrase, as the game walks it.
 */
export interface IGameDialogPhrase extends IGameDialogConditions {
  id: string;
  // Translation key of the line, empty for a line a script builds.
  text: string;
  next: Array<string>;
  giveInfo: Array<string>;
  disableInfo: Array<string>;
  actions: Array<string>;
}

/**
 * A dialog an NPC offers, as the game judges whether the actor may open it now.
 */
export interface IGameDialogSummary extends IGameDialogConditions {
  id: string;
  // Translation key of the opening phrase.
  caption: Nullable<string>;
  isStartedByNpc: boolean;
  // Info portions any one of which brings the dialog to the actor, for a dialog only info portions offer.
  offeringInfos: Array<string>;
}

/**
 * A dialog with every phrase, as the game walks it.
 */
export interface IGameDialog extends IGameDialogSummary {
  phrases: Record<string, IGameDialogPhrase>;
}
