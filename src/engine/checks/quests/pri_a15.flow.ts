import { Nillable, TLabel, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const GAUSS_TASK_ID: TName = taskIds.pri_a17_task_find_gauss_rifle;

/**
 * Members of the group, each with the portion the underground sets when they did not come through it.
 */
const GROUP: Array<[TLabel, TName]> = [
  ["Zulus", infoPortions.pri_a15_zulus_out],
  ["Vano", infoPortions.pri_a15_vano_out],
  ["Sokolov", infoPortions.pri_a15_sokolov_out],
  ["the Monolith leader", infoPortions.pri_a15_wanderer_out],
];

/**
 * Who of the group came out in Pripyat, as the underground reported them to the arrival scene.
 *
 * @returns Names of the arrivals besides the actor, or null when none came.
 */
function resolveArrivals(): Nillable<TLabel> {
  const arrivals: Array<TLabel> = [];

  for (const [name, out] of GROUP) {
    if (!hasInfoPortion(out)) {
      arrivals.push(name);
    }
  }

  return arrivals.length > 0 ? arrivals.join(", ") : null;
}

/**
 * Pripyat a15 arrival: the military meet the group coming out of the underground, take it to their base, and Kovalsky
 * sends the actor after the gauss rifle.
 */
requires({
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.pas_b400_done),
      missing: "the group has not come out of the underground yet - walk the 'pas_b400' flow",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.pri_a17_military_base_commander_task_dialog_end),
      missing: "Kovalsky has already briefed the actor - load a save from before it",
    },
  ],
});

step("1 - arrival scene played", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a15_cutscene_end),
  verify: (): void => {
    report("arrived with: %s", tostring(resolveArrivals()));
  },
  handOff: "nothing to do, 'pri_a15_sr_cutscene' plays on the first arrival from the underground",
});

step("2 - Kovalsky expects the actor", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a16_kovalski_start),
  handOff: "nothing to do, 'pri_a15_sr_exit' brings the actor round at the base 30 s after the scene fades out",
});

step("3 - gauss rifle task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.pri_a17_military_base_commander_task_dialog_end) &&
    $isNotNil(taskConfig.ACTIVE_TASKS.get(GAUSS_TASK_ID)),
  travel: (): void => void teleportToStoryObject(storyIds.pri_a17_military_colonel_kovalski, 2),
  verify: (): void => void checkTaskText(GAUSS_TASK_ID, "before the recon squad sets off"),
  handOff: "talk to Kovalsky, the 'pri_a17_military_base_commander_task_dialog' dialog",
});
