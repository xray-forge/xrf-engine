import { Nullable } from "#/utils/types";

/**
 * What a dialog or phrase element means to the engine, as `xrf-cli dialog` names it.
 */
export enum EDialogElementKind {
  TEXT = "text",
  ACTION = "action",
  PRECONDITION = "precondition",
  NEXT = "next",
  GIVE_INFO = "giveInfo",
  DISABLE_INFO = "disableInfo",
  HAS_INFO = "hasInfo",
  DONT_HAS_INFO = "dontHasInfo",
  INIT_FUNC = "initFunc",
}

/**
 * One child element of a dialog or a phrase.
 */
export interface IDialogElement {
  name: string;
  kind: string;
  value: string;
}

/**
 * How a dialog reaches the actor when it talks to an NPC of a profile.
 */
export type TDialogOffer =
  { kind: "start"; character: string } | { kind: "actor"; character: string } | { kind: "info"; info: string };

/**
 * One dialog of `xrf-cli dialog list`.
 */
export interface IDialogListEntry {
  id: string;
  logicalPath: string;
  priority: Nullable<number>;
  phrases: number;
  captionKey: Nullable<string>;
  caption: Nullable<string>;
  elements: Array<IDialogElement>;
  offers: Array<TDialogOffer>;
}

/**
 * What `xrf-cli dialog list --profile` answers.
 */
export interface IDialogListReport {
  language: Nullable<string>;
  profile: Nullable<{ id: string; characters: Array<string> }>;
  dialogs: Array<IDialogListEntry>;
}

/**
 * One phrase of `xrf-cli dialog inspect`.
 */
export interface IDialogPhraseDescriptor {
  id: string;
  textKey: Nullable<string>;
  next: Array<string>;
  elements: Array<IDialogElement>;
}

/**
 * One dialog of `xrf-cli dialog inspect`.
 */
export interface IDialogDescriptor {
  id: string;
  logicalPath: string;
  elements: Array<IDialogElement>;
  phrases: Array<IDialogPhraseDescriptor>;
}

/**
 * What `xrf-cli dialog inspect` answers.
 */
export interface IDialogInspectReport {
  dialog: IDialogDescriptor;
  alsoDeclaredIn: Array<string>;
}
