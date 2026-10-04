import { ACTOR_ID, Nillable, TCount, TName, TSection } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, expectEqual, report, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  expectActorMoneySpent,
  rememberActorMoney,
  teleportToPatrol,
} from "@/engine/checks/framework/world";
import { teleportToNimble } from "@/engine/checks/quests/zaton_places";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { weapons } from "@/engine/constants/items/weapons";
import { patrolPaths } from "@/engine/constants/patrol_paths";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { getPortableStoreValue, getServerObjectByStoryId, setPortableStoreValue } from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";
import { giveMoneyToActor } from "@/engine/core/utils/reward";

const TASK_ID: TName = taskIds.zat_b51_nimble_items;
const NIMBLE_STORY_ID: TName = storyIds.zat_a2_stalker_nimble_id;

const PISTOL_PREPAY: TCount = 700;
const PISTOL_REST: TCount = 2_800;

const ORDER_MONEY_KEY: TName = "xrf_b51_order_money";
const MONEY_BEFORE_KEY: TName = "xrf_b51_money";

/**
 * Pistols Nimble may bring, by the portions `zat_b51_randomize_item` and `zat_b51_buy_item` set.
 */
const PISTOLS: Array<{ ordered: TInfoPortion; done: TInfoPortion; section: TSection }> = [
  {
    ordered: infoPortions.zat_b51_ordered_item_1_1,
    done: infoPortions.zat_b51_done_item_1_1,
    section: weapons.wpn_desert_eagle_nimble,
  },
  {
    ordered: infoPortions.zat_b51_ordered_item_1_2,
    done: infoPortions.zat_b51_done_item_1_2,
    section: weapons.wpn_sig220_nimble,
  },
  {
    ordered: infoPortions.zat_b51_ordered_item_1_3,
    done: infoPortions.zat_b51_done_item_1_3,
    section: weapons.wpn_usp_nimble,
  },
];

/**
 * Put exactly what a pistol order costs in the actor's pocket, at most once per save.
 */
function grantOrderMoneyOnce(): void {
  if (getPortableStoreValue<TCount>(ACTOR_ID, ORDER_MONEY_KEY, 0) > 0) {
    return;
  }

  const amount: TCount = PISTOL_PREPAY + PISTOL_REST;

  giveMoneyToActor(amount);
  setPortableStoreValue<TCount>(ACTOR_ID, ORDER_MONEY_KEY, amount);
  report("handed the actor %s for a pistol from Nimble, once for this save", amount);
}

/**
 * @returns The pistol Nimble settled on for this order, or null before he has picked one.
 */
function findOrderedPistol(): Nillable<TSection> {
  for (const pistol of PISTOLS) {
    if (hasInfoPortion(pistol.ordered)) {
      return pistol.section;
    }
  }

  return null;
}

/**
 * @returns The pistol whose order was closed, by collecting it or refusing it, or null while none is.
 */
function findClosedPistol(): Nillable<TSection> {
  for (const pistol of PISTOLS) {
    if (hasInfoPortion(pistol.done)) {
      return pistol.section;
    }
  }

  return null;
}

/**
 * Zaton b51 special order from Nimble, walked for a pistol: place the order and pay the advance, leave him to fetch
 * it, wait for his call, then collect it and pay the rest. Refusing it instead reverses the task and raises his next
 * prices.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => $isNil(findClosedPistol()),
      missing: "a pistol order was already collected or refused - load a save from before Nimble's first pistol",
    },
    {
      holds: (): boolean =>
        !hasInfoPortion(infoPortions.zat_b51_order_in_process) ||
        hasInfoPortion(infoPortions.zat_b51_processing_category_1),
      missing: "Nimble is busy with an order other than a pistol - collect it or load an earlier save",
    },
  ],
});

step("1 - pistol ordered and the advance paid", {
  // Nimble names the price with 'zat_b51_processing_category_1', the advance comes with 'zat_b51_order_in_process'.
  reached: (): boolean =>
    (hasInfoPortion(infoPortions.zat_b51_processing_category_1) &&
      hasInfoPortion(infoPortions.zat_b51_order_in_process)) ||
    $isNotNil(findClosedPistol()),
  travel: (): void => {
    teleportToNimble();
    grantOrderMoneyOnce();
    rememberActorMoney(MONEY_BEFORE_KEY);
  },
  verify: (): void => {
    if ($isNotNil(findClosedPistol())) {
      return;
    }

    expectActorMoneySpent(MONEY_BEFORE_KEY, PISTOL_PREPAY, "advance paid");
    report("Nimble settled on: %s", tostring(findOrderedPistol()));
  },
  handOff: "tell Nimble you want to place an order, pick a pistol and pay the advance",
});

step("2 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || $isNotNil(findClosedPistol()),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b51_order_ready_task)) {
      const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "while the order is out");

      expectEqual(task?.currentTitle, "zat_b51_nimble_items_wait_order_name", "title waiting on the order");
    }
  },
  handOff: "stay in Skadovsk a moment, 'zat_b51_quest_line' hands the task out on its next update",
});

step("3 - Nimble left to fetch it", {
  reached: (): boolean =>
    $isNil(getServerObjectByStoryId(NIMBLE_STORY_ID)) ||
    hasInfoPortion(infoPortions.zat_b51_order_ready) ||
    $isNotNil(findClosedPistol()),
  // Beard's spot is far enough from Nimble's counter for 'zat_b51_quest_line' to send him off.
  travel: (): void => void teleportToPatrol(patrolPaths.zat_b29_actor_base_walk, patrolPaths.zat_b29_actor_base_look),
  handOff: "walk 10 m away from Nimble or go to sleep, and he leaves Skadovsk to fetch the order",
});

step("4 - order ready", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b51_order_ready) || $isNotNil(findClosedPistol()),
  verify: (): void => {
    if ($isNotNil(findClosedPistol())) {
      return;
    }

    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with the order ready");

    expectEqual(task?.currentTitle, "zat_b51_nimble_items_get_order_name", "title sending the actor to collect");
    expect(
      $isNotNil(getServerObjectByStoryId(NIMBLE_STORY_ID)),
      "Nimble back in Skadovsk",
      "'zat_b51_quest_line' creates his squad again as the order comes in"
    );
  },
  handOff: "wait 12 to 24 game hours away from Nimble - sleeping counts - until he calls about the order",
});

step("5 - pistol collected or refused", {
  reached: (): boolean => $isNotNil(findClosedPistol()) && !hasInfoPortion(infoPortions.zat_b51_order_in_process),
  travel: (): void => {
    teleportToNimble();
    rememberActorMoney(MONEY_BEFORE_KEY);
  },
  verify: (): void => {
    const pistol: TSection = findClosedPistol() as TSection;

    if (hasInfoPortion(infoPortions.zat_b51_order_refused)) {
      return report("'%s' was refused, so Nimble's next prices carry the risk", pistol);
    }

    expect(actorHasItem(pistol), "pistol handed over", `'${pistol}' is not in the inventory`);
    expectActorMoneySpent(MONEY_BEFORE_KEY, PISTOL_REST, "rest of the price paid");
  },
  handOff: "tell Nimble you came to collect the order, then pay for it - or refuse it",
});

step("6 - task closed", {
  reached: (): boolean => $isNotNil(findClosedPistol()) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    report(
      "'%s' %s and declares no reward_money",
      TASK_ID,
      hasInfoPortion(infoPortions.zat_b51_order_refused) ? "reversed on the refusal" : "completed on the collection"
    );
  },
  handOff: "nothing to do, the task manager closes it on its next update",
});
