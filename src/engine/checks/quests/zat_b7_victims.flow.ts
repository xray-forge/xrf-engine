import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { report, requires, step } from "@/engine/checks/framework";
import { isStagePassed } from "@/engine/checks/framework/stages";
import { checkTaskText, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b7_stalkers_victims;
const VICTIMS_LEADER_STORY_ID: TName = storyIds.zat_b7_stalker_victim_1;

/**
 * Portions the raid moves through on the victims' side, in order.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b7_raider_plan,
  infoPortions.zat_b7_stalkers_victims_know_about_raid,
  infoPortions.zat_b7_actor_with_stalkers,
  infoPortions.zat_b7_stalkers_raiders_attack,
  infoPortions.zat_b7_stalkers_raiders_attack_started,
  infoPortions.zat_b7_actor_help_stalkers,
  infoPortions.zat_b7_stalkers_victims_reward_1_given,
];

/**
 * Zaton b7 raid, the victims' side: told of Sultan's raid, the actor warns the stalkers it targets, stands with them
 * when the raiders come at night, and the victims pay in medicine. Joining the raiders instead is quests_zat_b7_raiders.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b7_task_end),
      missing: "the raid is over - load a save from before Sultan plans it",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b7_actor_with_bandits),
      missing: "the actor joined the raiders - walk quests_zat_b7_raiders instead",
    },
  ],
});

step("1 - Sultan plans the raid", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_raider_plan),
  travel: (): void => void teleportToStoryObject(storyIds.zat_b7_bandit_boss_sultan, 2),
  handOff: "ask Sultan at the bandits' base for work - he plans a raid on a group of stalkers",
});

step("2 - the victims warned", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_victims_know_about_raid),
  travel: (): void => void teleportToStoryObject(VICTIMS_LEADER_STORY_ID, 2),
  handOff: "warn the stalkers the raid targets - or tell the Skadovsk barman, who passes it on",
});

step("3 - sided with the victims", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_actor_with_stalkers),
  travel: (): void => void teleportToStoryObject(VICTIMS_LEADER_STORY_ID, 2),
  handOff: "tell the victims' leader the actor stands with them",
});

step("4 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || isStagePassed(STAGES, infoPortions.zat_b7_actor_help_stalkers),
  verify: (): void => void checkTaskText(TASK_ID, "standing with the victims"),
  handOff: "nothing to do, 'zat_b7_sr_actor_teleport' gives the task on its next update",
});

step("5 - night falls for the raid", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_attack),
  handOff:
    "let 23:00 come asleep or in the Skadovsk sleep zone, which moves the raiders straight to the victims - awake " +
    "elsewhere, they walk the whole way",
});

step("6 - the raiders attack", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_attack_started),
  travel: (): void => void teleportToStoryObject(VICTIMS_LEADER_STORY_ID, 2),
  handOff: "open fire on the raiders when they reach the camp - they wait for the first shot",
});

step("7 - the raiders dead", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_actor_help_stalkers),
  verify: (): void => {
    report(
      "the fight: %s",
      hasInfoPortion(infoPortions.zat_b7_actor_really_helped_stalkers) ? "the actor fought in it" : "the victims won it"
    );
  },
  handOff: "help the victims kill the raiders",
});

step("8 - the victims pay", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_victims_reward_1_given),
  travel: (): void => void teleportToStoryObject(VICTIMS_LEADER_STORY_ID, 2),
  handOff: "talk to the victims' leader after the fight",
});

step("9 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b7_stalkers_victims_reward_1_given) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
