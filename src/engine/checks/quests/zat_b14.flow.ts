import { ServerObject, Vector } from "xray16/alias";
import { createVector, Nillable, TCount, TLabel, TName, TSection } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, expectEqual, report, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  expectActorMoneyGained,
  rememberActorMoney,
  teleportToPatrol,
  teleportToPoint,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { artefacts } from "@/engine/constants/items/artefacts";
import { levels } from "@/engine/constants/levels";
import { patrolPaths } from "@/engine/constants/patrol_paths";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { getServerObjectByStoryId } from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { Squad } from "@/engine/core/objects/squad";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";
import { isAnySquadMemberEnemyToActor } from "@/engine/core/utils/relation";

const TASK_ID: TName = taskIds.zat_b14_learn_about_strange_occurrence;
const SIBLING_TASK_ID: TName = taskIds.zat_b14_learn_about_strange_occurrence_by_stalkers;
const QUEST_ARTEFACT: TSection = artefacts.af_quest_b14_twisted;
const ARTEFACT_STORY_ID: TName = storyIds.zat_b14_artefact_id;

const BASE_WALK_PATH: TName = patrolPaths.zat_b29_actor_base_walk;
const BASE_LOOK_PATH: TName = patrolPaths.zat_b29_actor_base_look;

const TASK_REWARD: TCount = 3_000;
const MONEY_BEFORE_KEY: TName = "xrf_b14_money";

/**
 * How the encounter below the deck ended, if it has.
 *
 * @returns What settled the encounter, or null while it is still open.
 */
function resolveRobberyOutcome(): Nillable<TLabel> {
  if (hasInfoPortion(infoPortions.zat_b14_give_item_stalker)) {
    return "the artefact was handed over";
  } else if (hasInfoPortion(infoPortions.zat_b14_stalker_killed_by_actor)) {
    return "one of them was killed";
  } else if (hasInfoPortion(infoPortions.zat_b14_not_give_item_stalker)) {
    return "they were refused";
  } else if (hasInfoPortion(infoPortions.zat_b14_stalker_robbery_cutscene_end)) {
    return "the robbery cutscene played out";
  } else if (hasInfoPortion(infoPortions.zat_b14_dialog_done)) {
    // Every terminal phrase of `zat_b14_stalker_start` gives this, so it covers talking past them.
    return "the dialog was seen through";
  } else if (hasInfoPortion(infoPortions.zat_b14_actor_enemy)) {
    // Set by `{=hit_by_actor =actor_has_item(af_quest_b14_twisted) =is_alive}` on any of the three.
    return "they were attacked";
  }

  const squad: Nillable<Squad> = getServerObjectByStoryId(storyIds.zat_b14_stalkers);

  if (squad && isAnySquadMemberEnemyToActor(squad)) {
    return "they turned hostile";
  }

  return null;
}

/**
 * Zaton b14 strange occurrence chain, watched along the quest's own geography: Beard, the artefact,
 * the robbery below, back to Beard, hand in.
 *
 * Completing this is what opens the b29 artefact hunt, via `on_complete = %+zat_b14_smart_terrain_open%`.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b14_give_item_linker),
      missing: "the item has already been handed in, so this chain is finished - load a save from before it",
    },
  ],
});

step("1 - quest taken from Beard", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b14_recon_place) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: (): void => {
    teleportToPatrol(BASE_WALK_PATH, BASE_LOOK_PATH);
    rememberActorMoney(MONEY_BEFORE_KEY);
  },
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b14_learn_about_strange_occurrence_give_task),
      "on_init applied",
      "expected giving the task to hand out 'zat_b14_learn_about_strange_occurrence_give_task'"
    );

    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with no progress portions");

    expectEqual(task?.state, null, "state with no branch satisfied");

    expect(
      $isNotNil(getServerObjectByStoryId(ARTEFACT_STORY_ID)) || actorHasItem(QUEST_ARTEFACT),
      "artefact accounted for",
      `'${ARTEFACT_STORY_ID}' is not in the world and the actor is not carrying it`
    );
  },
  handOff: "ask Beard about available work and the sunken ship",
});

step("2 - artefact taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b14_take_item),
  travel: (): void => {
    const artefactPosition: Vector = createVector(412.489, -0.942, 231.008);
    const placed: Nillable<ServerObject> = getServerObjectByStoryId(ARTEFACT_STORY_ID);

    if ($isNotNil(placed)) {
      teleportToPoint("the artefact ledge", levels.zaton, artefactPosition, placed.position);
    }
  },
  verify: (): void => {
    expect(actorHasItem(QUEST_ARTEFACT), "artefact carried", `'${QUEST_ARTEFACT}' is not in the inventory`);
    checkTaskText(TASK_ID, "with the item taken");
  },
  handOff: "pick the artefact up - you have been taken to where it sits",
});

step("3 - settled with the stalkers below", {
  reached: (): boolean => $isNotNil(resolveRobberyOutcome()),
  // To the robber rather than a spot below deck: he opens the talk only within 5 m of an actor standing outside
  // 'zat_b14_not_give_item_zone', the area his restrictors keep him out of, and the deck below lies inside it.
  travel: (): void => void teleportToStoryObject(storyIds.zat_b14_stalker_1, 2),
  verify: (): void => {
    report("settled by: %s", tostring(resolveRobberyOutcome()));
  },
  handOff:
    "deal with them however you like - talk it out, hand the artefact over, refuse, fight or run. " +
    "To be robbed properly, holster your weapon and let one walk within 2 m of you",
});

step("4 - handed in, reward_money paid", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b14_give_item_linker),
  travel: (): void => void teleportToPatrol(BASE_WALK_PATH, BASE_LOOK_PATH),
  verify: (): void => {
    let pending: TCount = 0;

    for (const taskId of [TASK_ID, SIBLING_TASK_ID]) {
      if ($isNotNil(taskConfig.ACTIVE_TASKS.get(taskId))) {
        pending += 1;
      }
    }

    if (pending > 1) {
      report("both b14 tasks are active, so the hand in closes both and pays %s twice", TASK_REWARD);
    }

    expect(!actorHasItem(QUEST_ARTEFACT), "artefact taken", `'${QUEST_ARTEFACT}' is still in the inventory`);
    expectActorMoneyGained(MONEY_BEFORE_KEY, TASK_REWARD, "reward_money paid");
  },
  handOff: "hand the item to Beard",
});

step("5 - completion effects applied and the b29 hunt unlocked", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b14_smart_terrain_open) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b14_smart_terrain_open),
      "on_complete applied",
      "expected on_complete to give 'zat_b14_smart_terrain_open', which is what opens the b29 hunt"
    );
  },
  handOff: "nothing to do, the task manager deactivates it on its next update",
});
