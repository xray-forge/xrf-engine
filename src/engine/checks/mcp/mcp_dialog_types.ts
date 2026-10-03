import { Nillable, TLabel, TName, TStringId } from "xray16/lib";

/**
 * Info portions and script predicates a dialog or a phrase declares, as the dialog XML lists them.
 */
export interface IMcpDialogConditions {
  hasInfo: Array<TName>;
  dontHasInfo: Array<TName>;
  preconditions: Array<TName>;
}

/**
 * One phrase of a dialog, as the MCP server read it from the dialog XML.
 */
export interface IMcpDialogPhrase extends IMcpDialogConditions {
  id: TStringId;
  text: TLabel;
  next: Array<TStringId>;
  giveInfo: Array<TName>;
  disableInfo: Array<TName>;
  actions: Array<TName>;
}

/**
 * Dialog an NPC offers, as the MCP server asks the game whether the actor may open it now.
 */
export interface IMcpDialogSummary extends IMcpDialogConditions {
  id: TStringId;
  // Translation key of the opening phrase.
  caption: Nillable<TLabel>;
  // A start dialog is opened by the NPC, who then says phrase 0.
  isStartedByNpc: boolean;
  // Info portions any one of which brings the dialog to the actor, for a dialog only info portions offer.
  offeringInfos: Array<TName>;
}

/**
 * Dialog with every phrase, as the MCP server asks the game to walk it.
 */
export interface IMcpDialog extends IMcpDialogSummary {
  phrases: Record<TStringId, IMcpDialogPhrase>;
}

/**
 * Dialog request: the dialogs an NPC offers to evaluate, or one dialog to walk with the given choices.
 */
export interface IMcpDialogRequest {
  // Object id, story id or name pattern of the NPC.
  npc: unknown;
  dialogs?: Array<IMcpDialogSummary>;
  walk?: { dialog: IMcpDialog; choices?: Array<TStringId> };
}

/**
 * One phrase said while walking a dialog.
 */
export interface IMcpSaidPhrase {
  speaker: "actor" | "npc";
  phrase: TStringId;
  text: TLabel;
  gave: Array<TName>;
  disabled: Array<TName>;
  actions: Array<TName>;
  // Other phrases the NPC could have said instead, where the engine picks one at random.
  alternatives?: Array<TStringId>;
}
