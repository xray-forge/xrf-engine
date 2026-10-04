import { ServerObject } from "xray16/alias";
import { ACTOR_ID, MAX_U16, Nillable, TCount, TLabel, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, expectEqual, report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToPoint, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { food } from "@/engine/constants/items/food";
import { questItems } from "@/engine/constants/items/quest_items";
import { levels } from "@/engine/constants/levels";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { getPortableStoreValue, registry, setPortableStoreValue } from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";
import { giveItemsToActor } from "@/engine/core/utils/reward";

const TASK_ID: TName = taskIds.zat_b44_tech_buddies;
const CARDAN_STORY_ID: TName = storyIds.zat_a2_stalker_mechanic;
const BARGE_STORY_ID: TName = storyIds.zat_b44_stalker_barge;
const JOKER_PDA_NAME: TName = "zat_b39_joker_pda";

const VODKA_KEY: TName = "xrf_b44_vodka";

/**
 * Put two bottles in the actor's pocket for Cardan's two drinks, at most once per save.
 */
function grantVodkaOnce(): void {
  if (getPortableStoreValue<TCount>(ACTOR_ID, VODKA_KEY, 0) > 0) {
    return;
  }

  const bottles: TCount = 2;

  giveItemsToActor(food.vodka, bottles);
  setPortableStoreValue<TCount>(ACTOR_ID, VODKA_KEY, bottles);
  report("handed the actor %s bottles of vodka for Cardan, once for this save", bottles);
}

/**
 * Whether Barge's pda reached the actor, whether or not it was already shown to Cardan.
 *
 * @returns Whether the pda was taken from his body.
 */
function isBargePdaFound(): boolean {
  return (
    actorHasItem(questItems.zat_b44_barge_pda) ||
    hasInfoPortion(infoPortions.zat_b44_stalker_barge_body_searched) ||
    hasInfoPortion(infoPortions.zat_b44_tech_buddies_barge_told)
  );
}

/**
 * Whether Joker's pda reached the actor, whether or not it was already shown to Cardan.
 *
 * @returns Whether the pda was picked up by the bones near Oakpine.
 */
function isJokerPdaFound(): boolean {
  return actorHasItem(questItems.zat_b39_joker_pda) || hasInfoPortion(infoPortions.zat_b44_tech_buddies_joker_told);
}

/**
 * Zaton b44 tech buddies: Cardan drinks twice with the actor, talks about Barge and Joker, and asks for his apologies
 * to be passed on. Both are dead - Barge in the caves under the burnt farmstead, Joker by the bones near Oakpine - and
 * their pdas tell Cardan so.
 *
 * Showing Cardan both pdas before the apologies leaves the task never handed out, as in vanilla.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b44_tech_buddies_both_told),
      missing: "Cardan has already heard about both buddies - load a save from before it",
    },
    {
      holds: (): boolean =>
        hasInfoPortion(infoPortions.zat_b3_tech_have_couple_dose) ||
        !hasInfoPortion(infoPortions.zat_b3_tech_see_produce_62),
      missing: "Cardan quit drinking on seeing the gauss rifle, so the apologies can never open - load an earlier save",
    },
  ],
});

step("1 - Cardan told about Barge and Joker", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b44_tech_buddies_told),
  travel: (): void => void teleportToStoryObject(CARDAN_STORY_ID, 2),
  handOff: "ask Cardan to tell you about Joker and Barge",
});

step("2 - first drink with Cardan", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_tech_have_one_dose),
  travel: (): void => {
    grantVodkaOnce();
    void teleportToStoryObject(CARDAN_STORY_ID, 2);
  },
  handOff: "offer Cardan a shot of vodka",
});

step("3 - second drink with Cardan", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_tech_have_couple_dose),
  travel: (): void => void teleportToStoryObject(CARDAN_STORY_ID, 2),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b3_tech_discount_1),
      "drinking discount running",
      "'zat_b3_tech_discount_control' gives 'zat_b3_tech_discount_1' on the drinks and takes it back after a while; " +
        "the apologies need it"
    );
  },
  handOff: "hand Cardan another bottle",
});

step("4 - apologies promised, task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b44_tech_buddies_given) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: (): void => void teleportToStoryObject(CARDAN_STORY_ID, 2),
  verify: (): void => {
    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with the apologies promised");

    if (!hasInfoPortion(infoPortions.zat_b44_tech_buddies_barge_told)) {
      expectEqual(task?.currentTitle, "zat_b44_tech_buddies_both_name", "title naming both buddies");
    }
  },
  handOff:
    "while the drinks' discount lasts, offer Cardan to pass his apologies on. 'zat_b44_logic' in the caves under " +
    "the burnt farmstead hands the task out on its next update",
});

step("5 - Barge's pda taken from his body", {
  reached: isBargePdaFound,
  travel: (): void => void teleportToStoryObject(BARGE_STORY_ID, 2),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b44_stalker_barge_body_searched) ||
        hasInfoPortion(infoPortions.zat_b44_tech_buddies_barge_told),
      "pda recording played",
      "'zat_b44_logic' plays Barge's recording and gives 'zat_b44_stalker_barge_body_searched' once the pda is carried"
    );
  },
  handOff: "search Barge's body in the caves under the burnt farmstead and take his pda",
});

step("6 - Joker's pda picked up", {
  reached: isJokerPdaFound,
  travel: (): void => {
    if (isJokerPdaFound()) {
      return;
    }

    const placed: Nillable<ServerObject> = registry.simulator.object(JOKER_PDA_NAME);

    if ($isNil(placed) || placed!.parent_id !== MAX_U16) {
      return report("'%s' is no longer lying on Zaton, someone else has picked it up", JOKER_PDA_NAME);
    }

    void teleportToPoint(JOKER_PDA_NAME, levels.zaton, placed!.position);
  },
  handOff: "pick up the pda by the bones near Oakpine, where the dogs den",
});

step("7 - Cardan has seen both pdas, task closed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b44_tech_buddies_both_told) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: (): void => void teleportToStoryObject(CARDAN_STORY_ID, 2),
  verify: (): void => {
    const shown: TLabel = hasInfoPortion(infoPortions.zat_b3_one_buddy_dead) ? "shown" : "not shown";

    report("'%s' pays nothing on completion; the pdas were %s through 'zat_b3_tech_buddies_pda'", TASK_ID, shown);
    expect(
      !actorHasItem(questItems.zat_b44_barge_pda) && !actorHasItem(questItems.zat_b39_joker_pda),
      "both pdas handed over",
      "a pda is still in the inventory"
    );
  },
  handOff:
    "show Cardan the pdas, together or one at a time - after the second one 'zat_b44_logic' sets " +
    "'zat_b44_tech_buddies_both_told' on its next update",
});
