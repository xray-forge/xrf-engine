import { game, level } from "xray16";
import { GameObject } from "xray16/alias";
import { abort, AnyCallable, AnyObject, Nillable, TName, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import {
  IMcpDialog,
  IMcpDialogConditions,
  IMcpDialogPhrase,
  IMcpDialogRequest,
  IMcpDialogSummary,
  IMcpSaidPhrase,
} from "@/engine/checks/mcp/mcp_dialog_types";
import { getObjectByStoryId, getServerObjectByStoryId, registry } from "@/engine/core/database";
import { isStalker } from "@/engine/core/utils/class_ids";
import { breakObjectDialog, getObjectScriptedStartDialog } from "@/engine/core/utils/dialog";
import { disableInfoPortion, giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { getNearestGameObject } from "@/engine/core/utils/registry";

/**
 * Phrase every dialog starts from, said by whoever opens it.
 */
const START_PHRASE_ID: TStringId = "0";

/**
 * Find the NPC a dialog request names.
 *
 * A story id names one object, so an offline one is refused rather than matched as a name pattern, which would find
 * whatever else carries the id in its name, such as the NPC's smart cover.
 *
 * @param selector - Object id, story id, or a name pattern matched against online objects, nearest first.
 * @returns The NPC.
 */
export function resolveDialogNpc(selector: unknown): GameObject {
  let npc: Nillable<GameObject> = null;

  if (type(selector) === "number") {
    npc = level.object_by_id(selector as number);
  } else if (type(selector) === "string") {
    const storyId: TStringId = selector as TStringId;

    if ($isNotNil(getServerObjectByStoryId(storyId))) {
      npc = getObjectByStoryId(storyId);

      if ($isNil(npc)) {
        abort("Story object '%s' is offline, bring the actor close to it first.", storyId);
      }
    } else {
      npc = getNearestGameObject(storyId);
    }
  }

  if ($isNil(npc)) {
    abort("No online object matches '%s'.", tostring(selector));
  }

  const found: GameObject = npc as GameObject;
  const name: TName = found.name();

  if (!isStalker(found)) {
    abort("Object '%s' is not a stalker, so it has no dialogs.", name);
  }

  return found;
}

/**
 * @param npc - NPC to describe.
 * @returns What the MCP server needs to find the dialogs this NPC offers.
 */
export function describeDialogNpc(npc: GameObject): AnyObject {
  return {
    id: npc.id(),
    name: npc.name(),
    profile: npc.profile_name(),
    scriptedStartDialog: getObjectScriptedStartDialog(npc),
    isAlive: npc.alive(),
    isTalkEnabled: npc.is_talk_enabled(),
  };
}

/**
 * Find a script function the way the engine resolves dialog functors, by its dotted global name.
 *
 * @param name - Function name, e.g. `dialogs_zaton.actor_has_artefact`.
 * @returns The function, or null when there is none.
 */
function resolveScriptFunction(name: TName): Nillable<AnyCallable> {
  let value: unknown = _G;

  for (const part of string.gfind(name, "[^.]+")) {
    value = type(value) === "table" ? (value as AnyObject)[part] : null;
  }

  return type(value) === "function" ? (value as AnyCallable) : null;
}

/**
 * Check conditions the way `CDialogScriptHelper::Precondition` does: info portions of the actor, then predicates.
 *
 * @param conditions - Conditions of a dialog or a phrase.
 * @param speaker - Who would say the phrase, or who opens the dialog.
 * @param listener - The other participant.
 * @param dialogId - Dialog being checked.
 * @param phraseId - Phrase said before, empty for a whole dialog.
 * @param nextPhraseId - Phrase being checked, empty for a whole dialog.
 * @returns Why the conditions fail, or null when they hold.
 */
export function findFailedDialogCondition(
  conditions: IMcpDialogConditions,
  speaker: GameObject,
  listener: GameObject,
  dialogId: TStringId,
  phraseId: TStringId,
  nextPhraseId: TStringId
): Nillable<string> {
  for (const info of conditions.hasInfo) {
    if (!hasInfoPortion(info)) {
      return `needs info '${info}'`;
    }
  }

  for (const info of conditions.dontHasInfo) {
    if (hasInfoPortion(info)) {
      return `has info '${info}'`;
    }
  }

  for (const name of conditions.preconditions) {
    const predicate: Nillable<AnyCallable> = resolveScriptFunction(name);

    if ($isNil(predicate)) {
      return `no function '${name}'`;
    }

    const [isCompleted, value] = pcall(predicate as AnyCallable, speaker, listener, dialogId, phraseId, nextPhraseId);

    if (!isCompleted) {
      return `'${name}' failed: ${tostring(value)}`;
    } else if (!value) {
      return `'${name}' is false`;
    }
  }

  return null;
}

/**
 * Check whether a dialog only info portions offer reaches the actor, as `CActor::UpdateAvailableDialogs` does.
 *
 * @param dialog - Dialog an NPC offers.
 * @returns Why it does not reach the actor, or null when it does.
 */
function findMissingOfferingInfo(dialog: IMcpDialogSummary): Nillable<string> {
  if (dialog.offeringInfos.length === 0 || dialog.offeringInfos.some((info) => hasInfoPortion(info))) {
    return null;
  }

  return `needs info '${dialog.offeringInfos.join("' or '")}'`;
}

/**
 * @param dialogs - Dialogs the NPC may offer.
 * @param npc - NPC the actor talks to.
 * @returns Each dialog, whether the actor could open it now, why not, and the line it opens with.
 */
export function evaluateDialogs(dialogs: Array<IMcpDialogSummary>, npc: GameObject): Array<AnyObject> {
  const actor: GameObject = registry.actor;
  const evaluated: Array<AnyObject> = [];

  for (const dialog of dialogs) {
    const [first, second] = dialog.isStartedByNpc ? [npc, actor] : [actor, npc];
    const failed: Nillable<string> =
      findMissingOfferingInfo(dialog) ?? findFailedDialogCondition(dialog, first, second, dialog.id, "", "");

    evaluated.push({
      id: dialog.id,
      isAvailable: $isNil(failed),
      failed: failed,
      isStartedByNpc: dialog.isStartedByNpc,
      text: $isNotNil(dialog.caption) ? game.translate_string(dialog.caption) : null,
    });
  }

  return evaluated;
}

/**
 * Say one phrase the way `CDialogScriptHelper::Action` does: info portions of the actor first, then its actions.
 *
 * @param dialog - Dialog being walked.
 * @param phrase - Phrase to say.
 * @param speaker - Who says it.
 * @param listener - Who hears it.
 * @param errors - Collected errors of actions that failed, as the engine swallows them.
 */
function sayPhrase(
  dialog: IMcpDialog,
  phrase: IMcpDialogPhrase,
  speaker: GameObject,
  listener: GameObject,
  errors: Array<string>
): void {
  for (const info of phrase.giveInfo) {
    giveInfoPortion(info);
  }

  for (const info of phrase.disableInfo) {
    disableInfoPortion(info);
  }

  for (const name of phrase.actions) {
    const action: Nillable<AnyCallable> = resolveScriptFunction(name);

    if ($isNil(action)) {
      errors.push(`phrase ${phrase.id}: no function '${name}'`);
      continue;
    }

    const [isCompleted, error] = pcall(action as AnyCallable, speaker, listener, dialog.id, phrase.id);

    if (!isCompleted) {
      errors.push(`phrase ${phrase.id}: '${name}' failed: ${tostring(error)}`);
    }
  }
}

/**
 * Evaluate the dialogs an NPC offers, or walk one dialog when the request asks to.
 *
 * A walk closes the game's own talk window first: it would keep showing a dialog the walk moves past, and holding the
 * NPC as the actor's partner while a script moves either away is what takes the game down.
 *
 * @param request - Dialog request.
 * @returns The NPC with its dialogs evaluated, or the walk through one dialog.
 */
export function handleDialogRequest(request: IMcpDialogRequest): AnyObject {
  const npc: GameObject = resolveDialogNpc(request.npc);

  if ($isNil(request.walk)) {
    return { npc: describeDialogNpc(npc), dialogs: evaluateDialogs(request.dialogs ?? [], npc) };
  }

  const isTalkClosed: boolean = registry.actor.is_talking();

  if (isTalkClosed) {
    breakObjectDialog(npc);
  }

  return {
    npc: describeDialogNpc(npc),
    isTalkClosed,
    ...walkDialog(request.walk.dialog, npc, request.walk.choices ?? []),
  };
}

/**
 * Walk a dialog as the talk window and the NPC would: the opening phrase, then the actor's choices in order, with the
 * NPC answering in between. The NPC says a requested phrase when it is available, else its first available one.
 *
 * @param dialog - Dialog to walk.
 * @param npc - NPC the actor talks to.
 * @param choices - Phrases to say after the opening one, actor choices and optionally the NPC answers to force.
 * @returns Phrases said, what the actor may say next, whether the dialog ended, and errors.
 */
export function walkDialog(dialog: IMcpDialog, npc: GameObject, choices: Array<TStringId>): AnyObject {
  const actor: GameObject = registry.actor;
  const [first, second] = dialog.isStartedByNpc ? [npc, actor] : [actor, npc];
  const said: Array<IMcpSaidPhrase> = [];
  const errors: Array<string> = [];
  const pending: Array<TStringId> = [];
  let options: Array<TStringId> = [START_PHRASE_ID];
  let isFirstSpeaking: boolean = true;
  let isFinished: boolean = false;

  for (const choice of choices) {
    if (choice !== START_PHRASE_ID || said.length > 0 || pending.length > 0) {
      pending.push(choice);
    }
  }

  const unavailable: Nillable<string> = findFailedDialogCondition(dialog, first, second, dialog.id, "", "");

  if ($isNotNil(unavailable)) {
    return { dialog: dialog.id, said, options: [], isFinished: false, errors: [`dialog unavailable: ${unavailable}`] };
  }

  while (!isFinished) {
    const speaker: GameObject = isFirstSpeaking ? first : second;
    const listener: GameObject = isFirstSpeaking ? second : first;
    const isActorSpeaking: boolean = speaker.id() === actor.id();
    const requested: Nillable<TStringId> = pending[0];
    let phraseId: Nillable<TStringId> = null;

    if (said.length === 0) {
      phraseId = START_PHRASE_ID;
    } else if ($isNotNil(requested) && options.includes(requested)) {
      phraseId = pending.shift() as TStringId;
    } else if (isActorSpeaking) {
      if ($isNotNil(requested)) {
        errors.push(`phrase ${requested} is not available to the actor; options: ${options.join(", ")}`);
      }

      break;
    } else {
      phraseId = options[0];
    }

    const phrase: Nillable<IMcpDialogPhrase> = dialog.phrases[phraseId];

    if ($isNil(phrase)) {
      errors.push(`phrase ${phraseId} is not in dialog '${dialog.id}'`);
      break;
    }

    sayPhrase(dialog, phrase, speaker, listener, errors);

    const step: IMcpSaidPhrase = {
      speaker: isActorSpeaking ? "actor" : "npc",
      phrase: phrase.id,
      text: game.translate_string(phrase.text),
      gave: phrase.giveInfo,
      disabled: phrase.disableInfo,
      actions: phrase.actions,
    };

    if (!isActorSpeaking && options.length > 1) {
      step.alternatives = options.filter((it) => it !== phrase.id);
    }

    said.push(step);

    // The listener says one of the next phrases whose conditions hold for them.
    options = phrase.next.filter((nextId) => {
      const next: Nillable<IMcpDialogPhrase> = dialog.phrases[nextId];

      return (
        $isNotNil(next) && $isNil(findFailedDialogCondition(next, listener, speaker, dialog.id, phrase.id, nextId))
      );
    });

    if (phrase.next.length === 0) {
      isFinished = true;
    } else if (options.length === 0) {
      errors.push(`no phrase after ${phrase.id} is available, which the engine treats as fatal`);
      break;
    }

    isFirstSpeaking = !isFirstSpeaking;
  }

  return {
    dialog: dialog.id,
    said,
    options: isFinished
      ? []
      : options.map((id) => ({ phrase: id, text: game.translate_string(dialog.phrases[id].text) })),
    isFinished,
    errors,
  };
}
