import {
  EDialogElementKind,
  IDialogDescriptor,
  IDialogElement,
  IDialogListEntry,
  IDialogPhraseDescriptor,
} from "#/mcp/dialogs/dialog_cli_types";
import {
  IGameDialog,
  IGameDialogConditions,
  IGameDialogPhrase,
  IGameDialogSummary,
} from "#/mcp/dialogs/game_dialog_types";
import { Nullable } from "#/utils/types";

/**
 * Phrase every dialog opens with, said by whoever opens it.
 */
const ENTRY_PHRASE_ID: string = "0";

/**
 * @param elements - Elements of a dialog or a phrase.
 * @param kind - Kind to read.
 * @returns Values of every element of the kind, in declaration order.
 */
function readValues(elements: Array<IDialogElement>, kind: EDialogElementKind): Array<string> {
  return elements.filter((element) => element.kind === kind).map((element) => element.value);
}

/**
 * @param elements - Elements of a dialog or a phrase.
 * @returns The info portions and predicates gating it.
 */
function readConditions(elements: Array<IDialogElement>): IGameDialogConditions {
  return {
    hasInfo: readValues(elements, EDialogElementKind.HAS_INFO),
    dontHasInfo: readValues(elements, EDialogElementKind.DONT_HAS_INFO),
    preconditions: readValues(elements, EDialogElementKind.PRECONDITION),
  };
}

/**
 * @param phrase - Phrase as `xrf-cli dialog inspect` describes it.
 * @returns The phrase as the game walks it.
 */
function toGamePhrase(phrase: IDialogPhraseDescriptor): IGameDialogPhrase {
  return {
    id: phrase.id,
    text: phrase.textKey ?? "",
    next: phrase.next,
    giveInfo: readValues(phrase.elements, EDialogElementKind.GIVE_INFO),
    disableInfo: readValues(phrase.elements, EDialogElementKind.DISABLE_INFO),
    actions: readValues(phrase.elements, EDialogElementKind.ACTION),
    ...readConditions(phrase.elements),
  };
}

/**
 * @param entry - Dialog as `xrf-cli dialog list --profile` lists it.
 * @param isStartedByNpc - Whether the NPC opens it.
 * @returns The dialog as the game judges whether the actor may open it.
 */
export function summarizeListedDialog(entry: IDialogListEntry, isStartedByNpc: boolean): IGameDialogSummary {
  // The engine offers a dialog of info portions only while the actor knows one of them, and drops that gate for one
  // the character offers too.
  const isOfferedByInfoOnly: boolean = entry.offers.length > 0 && entry.offers.every((offer) => offer.kind === "info");

  return {
    id: entry.id,
    caption: entry.captionKey,
    isStartedByNpc,
    offeringInfos: isOfferedByInfoOnly
      ? entry.offers.flatMap((offer) => (offer.kind === "info" ? [offer.info] : []))
      : [],
    ...readConditions(entry.elements),
  };
}

/**
 * @param dialog - Dialog as `xrf-cli dialog inspect` describes it.
 * @param isStartedByNpc - Whether the NPC opens it.
 * @returns The dialog with every phrase, as the game walks it.
 */
export function toGameDialog(dialog: IDialogDescriptor, isStartedByNpc: boolean): IGameDialog {
  return {
    id: dialog.id,
    caption: dialog.phrases.find((phrase) => phrase.id === ENTRY_PHRASE_ID)?.textKey ?? null,
    isStartedByNpc,
    offeringInfos: [],
    phrases: Object.fromEntries(dialog.phrases.map((phrase) => [phrase.id, toGamePhrase(phrase)])),
    ...readConditions(dialog.elements),
  };
}

/**
 * @param dialog - Dialog as `xrf-cli dialog inspect` describes it.
 * @returns The script function building the dialog's phrases at runtime, which leaves none to walk, if any.
 */
export function findDialogInitFunction(dialog: IDialogDescriptor): Nullable<string> {
  return readValues(dialog.elements, EDialogElementKind.INIT_FUNC)[0] ?? null;
}
