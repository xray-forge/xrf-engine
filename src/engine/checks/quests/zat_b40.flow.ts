import { TCount, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, report, requires, step } from "@/engine/checks/framework";
import { expectTaskTitleAtStage, isStagePassed } from "@/engine/checks/framework/stages";
import { expectActorMoneyGained, rememberActorMoney, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.zat_b40_reconnoitre_merc_camp;
const OWL_STORY_ID: TName = storyIds.zat_b30_owl_stalker_trader_id;
const NOTEBOOK_PRICE: TCount = 2_000;
const MONEY_BEFORE_KEY: TName = "xrf_b40_money";

/**
 * Portions the task moves through, in order. A notebook carried before Owl is asked skips straight to the end.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b40_find_information,
  infoPortions.zat_b40_actor_find_mer_camp,
  infoPortions.zat_b40_actor_has_notebook,
  infoPortions.zat_b40_find_information_comlpete,
];

/**
 * Zaton b40 merc camp: Owl wants to know who camps at the water treatment station, the mercs there warn the actor
 * off, and their notebook, taken from the camp and sold to Owl for 2000, is what he pays for.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b40_find_information_comlpete),
      missing: "Owl already has the merc notebook - load a save from before it",
    },
  ],
});

step("1 - Owl asks about the merc camp", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b40_find_information),
  travel: (): void => void teleportToStoryObject(OWL_STORY_ID, 2),
  handOff: "ask Owl in Skadovsk for work - he wants intel on the merc camp",
});

step("2 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) ||
    isStagePassed(STAGES, infoPortions.zat_b40_find_information_comlpete),
  verify: (): void =>
    expectTaskTitleAtStage(
      TASK_ID,
      STAGES,
      infoPortions.zat_b40_find_information,
      "zat_b40_reconnoitre_merc_camp_01_name"
    ),
  handOff: "nothing to do, 'zat_b40_logic' gives the task on its next update",
});

step("3 - merc camp found", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b40_actor_find_mer_camp),
  travel: (): void => void teleportToStoryObject(storyIds.zat_b40_notebook, 2),
  verify: (): void => {
    report("mercs: %s", hasInfoPortion(infoPortions.zat_b40_merc_in_combat) ? "fighting" : "not fighting yet");
  },
  handOff: "come within 100 m of the merc camp, where the mercs warn the actor off",
});

step("4 - notebook taken", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b40_actor_has_notebook),
  // Carried, the notebook is already where the actor is, and the logic marks it on its next update.
  travel: (): void => {
    if (!actorHasItem(questItems.zat_b40_notebook)) {
      void teleportToStoryObject(storyIds.zat_b40_notebook, 2);
    }
  },
  verify: (): void =>
    expectTaskTitleAtStage(
      TASK_ID,
      STAGES,
      infoPortions.zat_b40_actor_has_notebook,
      "zat_b40_reconnoitre_merc_camp_02_name"
    ),
  handOff: "pick up the notebook in the camp - leave before the warning runs out, or the mercs open fire within 50 m",
});

step("5 - notebook sold to Owl", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b40_find_information_comlpete),
  travel: (): void => {
    rememberActorMoney(MONEY_BEFORE_KEY);
    void teleportToStoryObject(OWL_STORY_ID, 2);
  },
  verify: (): void => {
    // Owl pays for the notebook he is sold; asked about the camp with the notebook already carried, he takes the word.
    if (hasInfoPortion(infoPortions.zat_b40_notebook_saled)) {
      expect(!actorHasItem(questItems.zat_b40_notebook), "notebook handed over", "Owl keeps the notebook he buys");
      expectActorMoneyGained(MONEY_BEFORE_KEY, NOTEBOOK_PRICE, "zat_b40_transfer_notebook paid");
    } else {
      report("settled by: the notebook shown when Owl was first asked, not sold");
    }
  },
  handOff: "sell the notebook to Owl",
});

step("6 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b40_find_information_comlpete) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
