import { GameObject } from "xray16/alias";
import { Nillable, TCount, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, requires, step } from "@/engine/checks/framework";
import { isStagePassed } from "@/engine/checks/framework/stages";
import { checkTaskText, readActorCount, rememberActorCount } from "@/engine/checks/framework/world";
import { teleportToLostMercsHideout } from "@/engine/checks/quests/zaton_places";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { food } from "@/engine/constants/items/food";
import { taskIds } from "@/engine/constants/task_ids";
import { registry } from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b103_merc_bring_supplies;
const SUPPLIES_NEEDED: TCount = 6;
const SUPPLIES_BEFORE_KEY: TName = "xrf_b103_supplies";

/**
 * Portions the task moves through, in order.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b103_merc_about_supplies_mentioned,
  infoPortions.zat_b103_merc_bring_supplies,
  infoPortions.zat_b103_merc_task_done,
];

/**
 * @returns How much of the food the mercs ask for the actor carries: bread, sausage and canned meat together.
 */
function countActorSupplies(): TCount {
  let count: TCount = 0;

  registry.actor.iterate_inventory((_: GameObject, item: GameObject): void => {
    const section: TName = item.section();

    if (section === food.bread || section === food.kolbasa || section === food.conserva) {
      count += 1;
    }
  }, registry.actor);

  return count;
}

/**
 * Zaton b103 lost mercs: a merc squad stranded on Zaton warns the actor off, then asks for food, and six of bread,
 * sausage or canned meat close the task. Hostility towards the squad fails it.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b103_merc_task_done),
      missing: "the mercs already have their supplies - load a save from before it",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b103_merc_fight),
      missing: "the actor already fought the mercs, which fails the task - load a save from before it",
    },
  ],
});

step("1 - the merc leader mentions supplies", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b103_merc_about_supplies_mentioned),
  travel: (): void => void teleportToLostMercsHideout(),
  handOff:
    "put the weapon away when the lost mercs warn the actor at their hideout - walking in armed makes them open " +
    "fire - and talk to their leader, who mentions their supplies",
});

step("2 - the mercs ask for food", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b103_merc_bring_supplies),
  travel: (): void => void teleportToLostMercsHideout(),
  handOff: "ask the leader about the supplies",
});

step("3 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || isStagePassed(STAGES, infoPortions.zat_b103_merc_task_done),
  handOff: "nothing to do, 'zat_b103_logic' gives the task on its next update",
});

step("4 - food gathered", {
  reached: (): boolean =>
    countActorSupplies() >= SUPPLIES_NEEDED || isStagePassed(STAGES, infoPortions.zat_b103_merc_task_done),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b103_merc_task_done)) {
      checkTaskText(TASK_ID, "with the food carried");
    }
  },
  handOff: "carry six of bread, sausage or canned meat - traders in Skadovsk sell them",
});

step("5 - food handed over", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b103_merc_task_done),
  travel: (): void => {
    rememberActorCount(SUPPLIES_BEFORE_KEY, countActorSupplies());
    void teleportToLostMercsHideout();
  },
  verify: (): void => {
    const before: Nillable<TCount> = readActorCount(SUPPLIES_BEFORE_KEY, "the hand-over");

    if ($isNil(before)) {
      return;
    }

    expect(
      before - countActorSupplies() === SUPPLIES_NEEDED,
      "six supplies handed over",
      `carried ${before} before the hand-over and ${countActorSupplies()} after`
    );
  },
  handOff: "give the leader the food",
});

step("6 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b103_merc_task_done) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
