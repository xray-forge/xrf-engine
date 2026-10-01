import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { MAX_U8, TName, TNumberId, TRate, TRUE, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import {
  IPhrasesDescriptor,
  TPhrasesAvailableMap,
  TPhrasesPriorityMap,
} from "@/engine/core/managers/dialogs/dialog_types";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { isObjectWounded } from "@/engine/core/utils/planner";

/**
 * Set the priority of a phrase to the maximum value for the given object.
 *
 * @param priorities - Map of phrase priorities per object.
 * @param objectId - Identifier of the object the phrase belongs to.
 * @param phraseId - Identifier of the phrase to set the highest priority for.
 */
export function setPhraseHighestPriority(
  priorities: TPhrasesPriorityMap,
  objectId: TNumberId,
  phraseId: TStringId
): void {
  if (!priorities.get(objectId)) {
    priorities.set(objectId, new LuaTable());
  }

  priorities.get(objectId).set(phraseId, MAX_U8);
}

/**
 * Reset the priority of a phrase for the object, recalculating it when no priorities exist yet.
 *
 * @param phrases - Map of available phrases keyed by phrase id.
 * @param priorities - Map of phrase priorities per object.
 * @param object - Game object the phrase is evaluated for.
 * @param phraseId - Identifier of the phrase to reset.
 */
export function resetPhrasePriority(
  phrases: TPhrasesAvailableMap,
  priorities: TPhrasesPriorityMap,
  object: GameObject,
  phraseId: TStringId
): void {
  const objectId: TNumberId = object.id();

  if (priorities.has(objectId)) {
    priorities.get(objectId).set(phraseId, -1);
  } else {
    priorities.set(objectId, new LuaTable());
    priorities
      .get(objectId)
      .set(phraseId, calculatePhrasePriority(phrases.get(phraseId), priorities, object, phraseId));
  }
}

/**
 * Find the phrase with the highest priority for the given object, ignoring meta keys.
 *
 * @param phrases - Map of available phrases keyed by phrase id.
 * @param priorities - Map of phrase priorities per object.
 * @param object - Game object to find the highest priority phrase for.
 * @returns Tuple of the highest priority value and the matching phrase id, or zero when none found.
 */
export function getHighestPriorityPhrase(
  phrases: TPhrasesAvailableMap,
  priorities: TPhrasesPriorityMap,
  object: GameObject
): LuaMultiReturn<[TRate, TStringId | 0]> {
  const objectId: TNumberId = object.id();

  // No priorities set for an object yet, start them empty, vanilla resets an undefined phrase here and fails.
  if ($isNil(priorities.get(objectId))) {
    priorities.set(objectId, new LuaTable());

    return $multi(-1, 0);
  }

  let id: TStringId | 0 = 0;
  let priority: TRate = -1;

  for (const [phraseId, phrasePriority] of priorities.get(objectId)) {
    // Ignore meta info keys.
    if (phraseId !== "ignoreOnce" && phraseId !== "told" && phrasePriority > priority) {
      id = phraseId;
      priority = phrasePriority;
    }
  }

  return $multi(priority, id);
}

/**
 * Calculate and store priorities for all available phrases of the given object.
 *
 * @param object - Game object to fill phrase priorities for.
 * @param phrases - Map of available phrases keyed by phrase id.
 * @param priorities - Map of phrase priorities per object.
 */
export function fillPhrasesPriorities(
  object: GameObject,
  phrases: TPhrasesAvailableMap,
  priorities: TPhrasesPriorityMap
): void {
  const objectId: TNumberId = object.id();

  if ($isNil(priorities.get(objectId))) {
    priorities.set(objectId, new LuaTable());
  }

  for (const [, phrase] of phrases) {
    // Calculate priority for each phrase
    calculatePhrasePriority(phrase, priorities, object, phrase.id);
  }
}

/**
 * Calculate the priority of a phrase from its community, level, wounded and info portion conditions.
 *
 * @param phraseDescriptor - Descriptor of the phrase to evaluate.
 * @param phrasesPriorities - Map of phrase priorities per object.
 * @param object - Game object the phrase is evaluated for.
 * @param phraseId - Identifier of the phrase to calculate priority for.
 * @returns Calculated priority value for the phrase.
 */
export function calculatePhrasePriority(
  phraseDescriptor: IPhrasesDescriptor,
  phrasesPriorities: TPhrasesPriorityMap,
  object: GameObject,
  phraseId: TStringId
): TRate {
  const objectId: TNumberId = object.id();

  let isMatchingLevel: boolean = false;
  let isMatchingCommunity: boolean = false;
  let priority: TRate = -1;

  // Check if community of NPC for phrase matching requirement.
  if (phraseDescriptor.npcCommunity === "not_set") {
    isMatchingCommunity = true;
  } else if (phraseDescriptor.npcCommunity.get(1) === "all") {
    priority += 1;
    isMatchingCommunity = true;
  } else {
    const objectCommunity: TName = getObjectCommunity(object);

    for (const [, community] of phraseDescriptor.npcCommunity) {
      if (community === objectCommunity) {
        priority += 2; // Compensate decrement applied to `else` branch.
        isMatchingCommunity = true;
        break;
      }
    }

    priority -= 1;
  }

  // Check if level for phrase matching requirement.
  if (phraseDescriptor.level === "not_set") {
    isMatchingLevel = true;
  } else if (phraseDescriptor.level.get(1) === "all") {
    priority += 1;
    isMatchingLevel = true;
  } else {
    const currentLevelName: TName = level.name();

    for (const [, levelName] of phraseDescriptor.level) {
      if (levelName === currentLevelName) {
        priority += 2;
        isMatchingLevel = true;
        break;
      }
    }
  }

  // Check if actor community for phrase matching requirement.
  if (phraseDescriptor.actorCommunity === "not_set") {
    priority += 0;
  } else if (phraseDescriptor.actorCommunity === "all") {
    priority += 1;
  } else {
    const actorCommunity: TName = getObjectCommunity(registry.actor);

    for (const [, community] of phraseDescriptor.actorCommunity) {
      if (community === actorCommunity) {
        priority += 2;
        break;
      }
    }
  }

  // Check if wounded check is handled.
  if (phraseDescriptor.wounded) {
    priority = isObjectWounded(objectId) ? priority + 1 : -1;
  } else {
    priority = isObjectWounded(objectId) ? -1 : priority + 1;
  }

  if (!isMatchingCommunity || !isMatchingLevel) {
    priority = -1;
  }

  if ($isNotNil(phrasesPriorities.get(objectId).get("ignoreOnce")) && phraseDescriptor.once === TRUE) {
    priority = -1;
  }

  if (
    $isNotNil(phrasesPriorities.get(objectId).get(phraseId)) &&
    phrasesPriorities.get(objectId).get(phraseId) === MAX_U8
  ) {
    priority = MAX_U8;
  }

  for (const [, condition] of phraseDescriptor.info) {
    if (condition.name) {
      if (condition.required === true) {
        if (!hasInfoPortion(condition.name)) {
          priority = -1;
          break;
        }
      } else {
        if (hasInfoPortion(condition.name)) {
          priority = -1;
          break;
        }
      }
    }
  }

  phrasesPriorities.get(objectId).set(phraseId, priority);

  return priority;
}
