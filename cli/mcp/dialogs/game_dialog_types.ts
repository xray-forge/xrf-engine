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

/**
 * The NPC a listing is about, as the game describes it.
 */
export interface IGameDialogNpc {
  id: number;
  name: string;
  profile: Nullable<string>;
  scriptedStartDialog: Nullable<string>;
  isAlive: boolean;
  isTalkEnabled: boolean;
}

/**
 * A dialog the NPC offers, as the game judged it.
 */
export interface IGameOfferedDialog {
  id: string;
  isAvailable: boolean;
  // The first condition that fails; absent when the dialog is available.
  failed?: Nullable<string>;
  isStartedByNpc: boolean;
  // Opening line in the game's language.
  text?: Nullable<string>;
}

/**
 * The dialogs an NPC offers, as the game judged them.
 */
export interface IGameDialogListing {
  npc: IGameDialogNpc;
  dialogs: Array<IGameOfferedDialog>;
}

/**
 * Which dialogs of a listing to keep.
 */
export interface IGameDialogListingFilter {
  only?: "open" | "closed";
  // Matched against the dialog id.
  match?: RegExp;
}
