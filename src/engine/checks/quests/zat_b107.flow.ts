import { createVector, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { expect, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  settleTask,
  skipJupiterArrival,
  teleportToPoint,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { levels } from "@/engine/constants/levels";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const ZATON_TASK_ID: TName = taskIds.zat_b107_evacuation_zaton;
const JUPITER_TASK_ID: TName = taskIds.zat_b107_evacuation_jupiter;
const PRIPYAT_TASK_ID: TName = taskIds.zat_b107_evacuation_pripyat;

/**
 * Zaton b107 evacuation leads, which searching Skat-3 hands out: ask the Skadovsk barman, find Sokolov's note at the
 * Jupiter evacuation point, and close the last one in Pripyat.
 *
 * Decrypting Skat-1's black box fails whichever of the Zaton and Jupiter leads is still open, so this follows the
 * order where both are followed first.
 */
requires({
  state: [
    {
      holds: (): boolean =>
        !hasInfoPortion(infoPortions.jup_b9_blackbox_decrypted) ||
        (hasInfoPortion(infoPortions.zat_a2_stalker_barmen_evacuation_asked) &&
          hasInfoPortion(infoPortions.jup_b205_evacuation_visited)),
      missing:
        "Skat-1's black box was decrypted before both leads were followed, which fails them - load a save from before it",
    },
  ],
});

step("1 - evacuation leads in the log", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b107_evacuation_info_partial),
  verify: (): void => {
    for (const taskId of [ZATON_TASK_ID, JUPITER_TASK_ID, PRIPYAT_TASK_ID]) {
      checkTaskText(taskId, "once Skat-3 is searched");
    }
  },
  handOff: "search Skat-3 - 'zat_b107_logic' hands out the three leads once 'zat_b28_heli_3_searched' is set",
});

step("2 - Skadovsk barman asked about the evacuation", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_a2_stalker_barmen_evacuation_asked),
  travel: (): void => void teleportToStoryObject(storyIds.zat_a2_stalker_barmen),
  verify: (): void => {
    expect($isNil(settleTask(ZATON_TASK_ID)), "Zaton lead closed", `'${ZATON_TASK_ID}' is still in the log`);
  },
  handOff: "ask the Skadovsk barman about the military, the 'zat_a2_stalker_barmen_army' dialog",
});

step("3 - Sokolov's note found at the Jupiter evacuation point", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b205_evacuation_visited),
  // The note lies loose by the evacuation point with no story id, so the level jump lands on the point's restrictor.
  travel: (): void => {
    if (!teleportToPoint("Sokolov's note", levels.jupiter, createVector(-394.755, 12.328, 10.205))) {
      skipJupiterArrival();
      void teleportToStoryObject(storyIds.jup_b205_spot);
    }
  },
  verify: (): void => {
    expect(
      actorHasItem(questItems.jup_b205_sokolov_note),
      "note carried",
      "'jup_b205_restrict_logic' marks the visit once the actor carries the note"
    );
    expect($isNil(settleTask(JUPITER_TASK_ID)), "Jupiter lead closed", `'${JUPITER_TASK_ID}' is still in the log`);
  },
  handOff:
    "pick up Sokolov's note by the Jupiter evacuation point - from another level the flow first jumps to the " +
    "point's restrictor, and the next run brings you to the note",
});

step("4 - Pripyat lead closed by the military commander", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.pri_a17_military_base_commander_task_dialog_end) &&
    $isNil(taskConfig.ACTIVE_TASKS.get(PRIPYAT_TASK_ID)),
  handOff: "in Pripyat, take the military base commander's task, which closes the lead",
});
