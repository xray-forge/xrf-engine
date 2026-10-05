import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { report, requires, step } from "@/engine/checks/framework";
import { isStagePassed } from "@/engine/checks/framework/stages";
import {
  checkTaskText,
  expectActorMoneyGained,
  rememberActorMoney,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b7_stalkers_raiders;
const SULTAN_STORY_ID: TName = storyIds.zat_b7_bandit_boss_sultan;
const RAIDER_LEADER_STORY_ID: TName = storyIds.zat_b7_stalker_raider_leader;
const MONEY_BEFORE_KEY: TName = "xrf_b7_raiders_money";

/**
 * Portions the raid moves through on the raiders' side, in order.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b7_bandit_boss_sultan_intro,
  infoPortions.zat_b7_raider_plan,
  infoPortions.zat_b7_actor_with_bandits,
  infoPortions.zat_b7_stalkers_raiders_attack,
  infoPortions.zat_b7_stalkers_raiders_meet,
  infoPortions.zat_b7_stalkers_raiders_attack_started,
  infoPortions.zat_b7_actor_help_bandits,
  infoPortions.zat_b7_stalkers_raiders_reward_given,
];

/**
 * Zaton b7 raid, the raiders' side: Sultan plans a night raid on a group of stalkers, the actor joins his raiders, the
 * victims die in the attack, and the raiders share the take. Warning the victims instead is quests_zat_b7_victims.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b7_task_end),
      missing: "the raid is over - load a save from before Sultan plans it",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b7_actor_with_stalkers),
      missing: "the actor sided with the victims - walk quests_zat_b7_victims instead",
    },
  ],
});

step("1 - Sultan met", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_bandit_boss_sultan_intro),
  travel: (): void => void teleportToStoryObject(SULTAN_STORY_ID, 2),
  handOff: "meet Sultan at the bandits' base - he introduces himself",
});

step("2 - Sultan plans the raid", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_raider_plan),
  travel: (): void => void teleportToStoryObject(SULTAN_STORY_ID, 2),
  handOff: "ask Sultan for work - he plans a raid on a group of stalkers",
});

step("3 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || isStagePassed(STAGES, infoPortions.zat_b7_actor_help_bandits),
  verify: (): void => void checkTaskText(TASK_ID, "with the raid planned"),
  handOff: "nothing to do, 'zat_b7_sr_stalkers_raiders_attack' gives the task on its next update",
});

step("4 - joined the raiders", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_actor_with_bandits),
  travel: (): void => void teleportToStoryObject(RAIDER_LEADER_STORY_ID, 2),
  handOff: "tell the raiders' leader the actor is in",
});

step("5 - night falls for the raid", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_attack),
  handOff: "wait until 23:00 - or ask the raiders' leader to set off, which fades to the night",
});

step("6 - the raiders reach the victims", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_meet),
  handOff: "follow the raiders to the victims' camp",
});

step("7 - the attack begins", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_attack_started),
  travel: (): void => void teleportToStoryObject(RAIDER_LEADER_STORY_ID, 2),
  handOff: "give the raiders' leader the word to attack",
});

step("8 - the victims dead", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_actor_help_bandits),
  verify: (): void => {
    report(
      "the raid: %s",
      hasInfoPortion(infoPortions.zat_b7_actor_really_helped_bandits) ? "the actor fought in it" : "the raiders did it"
    );
  },
  handOff:
    "help the raiders kill the victims. Victims the actor warned beforehand flee instead, and the raiders then turn " +
    "on the actor, which cancels the task",
});

step("9 - the raiders share the take", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b7_stalkers_raiders_reward_given),
  travel: (): void => {
    rememberActorMoney(MONEY_BEFORE_KEY);
    void teleportToStoryObject(RAIDER_LEADER_STORY_ID, 2);
  },
  verify: (): void => {
    // The leader pays only an actor who fought in the raid; one who let the raiders do it is thanked without pay.
    if (hasInfoPortion(infoPortions.zat_b7_actor_really_helped_bandits)) {
      expectActorMoneyGained(MONEY_BEFORE_KEY, 1_500, "zat_b7_give_bandit_reward_to_actor paid");
    }
  },
  handOff: "talk to the raiders' leader after the raid",
});

step("10 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b7_stalkers_raiders_reward_given) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
