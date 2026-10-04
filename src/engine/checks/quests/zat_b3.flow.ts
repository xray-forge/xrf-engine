import { Nillable, TCount, TName, TSection } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { expect, expectEqual, report, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  expectActorMoneyGained,
  rememberActorMoney,
  teleportToServerObject,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { misc } from "@/engine/constants/items/misc";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.zat_b3_tech_instruments;
const CARDAN_STORY_ID: TName = storyIds.zat_a2_stalker_mechanic;
const MONEY_BEFORE_KEY: TName = "xrf_b3_money";

/**
 * Travel for one toolkit step: to Cardan with the toolkit in the pack, otherwise to where Zaton holds one.
 *
 * @param toolkit - Section of the toolkit.
 * @param placedName - Name of the server object lying on Zaton, or null when Zaton holds none.
 */
function travelForToolkit(toolkit: TSection, placedName: Nillable<TName>): void {
  if (actorHasItem(toolkit)) {
    rememberActorMoney(MONEY_BEFORE_KEY);
    void teleportToStoryObject(CARDAN_STORY_ID, 2);

    return;
  }

  if ($isNil(placedName)) {
    return report("Zaton holds no '%s', so there is nowhere on this level to send the actor", toolkit);
  }

  void teleportToServerObject(placedName as TName);
}

/**
 * Verify one hand in: the toolkit left the pack and Cardan paid for it.
 *
 * @param toolkit - Section of the toolkit handed in.
 * @param payment - Money `give_toolkit_*` pays for it.
 */
function verifyToolkitHandIn(toolkit: TSection, payment: TCount): void {
  expect(!actorHasItem(toolkit), "toolkit handed over", `'${toolkit}' is still in the inventory`);
  expectActorMoneyGained(MONEY_BEFORE_KEY, payment, string.format("%s paid for '%s'", payment, toolkit));

  if (!hasInfoPortion(infoPortions.zat_b3_all_instruments_brought)) {
    checkTaskText(TASK_ID, string.format("with '%s' brought", toolkit));
  }
}

/**
 * Zaton b3 instruments for Cardan: he asks for three toolkits, two of which lie on Zaton and the calibration one only
 * in Pripyat. Each comes in through its own pass of `zat_b3_stalker_tech_instruments`, in any order, for 1000, 1200
 * and 1500.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b3_all_instruments_brought),
      missing: "Cardan already has all three toolkits - load a save from before the last one",
    },
  ],
});

step("1 - Cardan asked for tools", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_a2_mechanic_toolkit_search),
  travel: (): void => void teleportToStoryObject(CARDAN_STORY_ID, 2),
  handOff: "ask Cardan whether he has any work and agree to keep an eye out for tools",
});

step("2 - task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_a2_mechanic_toolkit_search_given) || hasInfoPortion(infoPortions.zat_b3_task_end),
  verify: (): void => {
    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "before any toolkit is brought");

    if (
      !hasInfoPortion(infoPortions.zat_b3_tech_instrument_1_brought) &&
      !hasInfoPortion(infoPortions.zat_b3_tech_instrument_2_brought) &&
      !hasInfoPortion(infoPortions.zat_b3_tech_instrument_3_brought)
    ) {
      expectEqual(task?.currentTitle, "zat_b3_mechanic_toolkit_search_name", "title with no toolkit brought");
    }
  },
  handOff: "stay in Skadovsk a moment, Cardan's 'zat_b3_quests' logic hands the task out on its next update",
});

step("3 - basic tools brought", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_tech_instrument_1_brought),
  travel: (): void => travelForToolkit(misc.toolkit_1, "zaton_toolkit_1"),
  verify: (): void => verifyToolkitHandIn(misc.toolkit_1, 1_000),
  handOff:
    "pick up the toolkit in the shed you were taken to, then come back and tell Cardan you brought him tools - " +
    "the ones for basic work",
});

step("4 - fine work tools brought", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_tech_instrument_2_brought),
  travel: (): void => travelForToolkit(misc.toolkit_2, "zaton_toolkit_2"),
  verify: (): void => verifyToolkitHandIn(misc.toolkit_2, 1_200),
  handOff:
    "pick up the toolkit you were taken to, then come back and tell Cardan you brought him tools - the ones for " +
    "fine work",
});

step("5 - calibration tools brought", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_tech_instrument_3_brought),
  travel: (): void => travelForToolkit(misc.toolkit_3, null),
  verify: (): void => verifyToolkitHandIn(misc.toolkit_3, 1_500),
  handOff:
    "the calibration toolkit lies only in Pripyat - bring one back and tell Cardan you brought him tools, " +
    "the ones for calibration",
});

step("6 - all three in, task closed", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b3_task_end) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b3_all_instruments_brought),
      "last hand in closed the dialog",
      "expected 'zat_b3_all_instruments_brought', which phrase 171 gives once all three are in"
    );
    report("'%s' pays nothing on completion; the three hand ins paid 3700 between them", TASK_ID);
  },
  handOff: "nothing to do, the task manager completes it on its next update",
});
