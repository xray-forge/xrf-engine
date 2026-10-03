import { Nillable, TLabel, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, settleTask, skipJupiterArrival, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { outfits } from "@/engine/constants/items/outfits";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.jup_b218_pripyat_group;

/**
 * Go to Zulus at Yanov, from another level too.
 */
function travelToZulus(): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyIds.jup_b15_zulus, 2);
}

/**
 * Who has joined Zulus's group so far.
 *
 * @returns Names of the recruits that joined, or null when none has.
 */
function resolveRecruits(): Nillable<TLabel> {
  const recruits: Array<TLabel> = [];

  if (hasInfoPortion(infoPortions.jup_b218_zulus_met_vano)) {
    recruits.push("Vano");
  }

  if (hasInfoPortion(infoPortions.jup_b218_zulus_met_sokolov)) {
    recruits.push("Sokolov");
  }

  if (hasInfoPortion(infoPortions.jup_b218_zulus_met_monolith)) {
    recruits.push("the Monolith leader");
  }

  return recruits.length > 0 ? recruits.join(", ") : null;
}

/**
 * Jupiter b218 Pripyat group: drink with Zulus until he agrees to lead the way, bring him at least one recruit, carry
 * a scientific suit, and set off.
 *
 * Each recruit runs through a side quest first: Vano through his debt (`jup_a10`), Sokolov through the grove
 * (`jup_b206`, then `jup_b218_soldier`), the Monolith leader through his squad's fate (`jup_b4`).
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_b218_gather_squad_complete),
      missing: "the group has already set off - load a save from before it",
    },
  ],
});

step("1 - group task in the log", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b218_gather_squad),
  verify: (): void => void checkTaskText(TASK_ID, "before Zulus is talked to"),
  handOff: "have Azot read the way to Pripyat, the 'jup_a9' flow - 'jup_b15_logic' then hands the task out",
});

step("2 - drank with Zulus", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b15_cameff_end),
  travel: travelToZulus,
  handOff:
    "talk to Zulus through every round of 'jup_b15_zulus_about_dialog', a drink each, until he puts the actor to " +
    "sleep",
});

step("3 - Zulus gathering the group", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b218_pripyat_group_gathering),
  verify: (): void => void checkTaskText(TASK_ID, "while the group is gathered"),
  handOff: "nothing to do, Zulus's logic opens the gathering once the actor wakes",
});

step("4 - a recruit joined", {
  reached: (): boolean => $isNotNil(resolveRecruits()),
  verify: (): void => {
    report("recruits: %s", tostring(resolveRecruits()));
  },
  handOff: "recruit Sokolov, Vano or the Monolith leader - each has its own side quest first",
});

step("5 - scientific suit in the backpack", {
  reached: (): boolean =>
    actorHasItem(outfits.scientific_outfit) || hasInfoPortion(infoPortions.jup_b218_gather_squad_complete),
  handOff: "buy a scientific suit, the Yanov barman sells them",
});

step("6 - group set off", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b218_gather_squad_complete) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: travelToZulus,
  verify: (): void => {
    expect($isNil(settleTask(TASK_ID)), "group task closed", `'${TASK_ID}' is still in the log`);
    report("set off with: %s", tostring(resolveRecruits()));
  },
  handOff: "tell Zulus the group is ready, the 'jup_b15_zulus_go_to_pripyat' dialog",
});
