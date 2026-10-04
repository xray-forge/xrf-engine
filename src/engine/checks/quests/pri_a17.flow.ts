import { TLabel, TName } from "xray16/lib";

import { report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.pri_a17_task_find_gauss_rifle;

/**
 * How the recon squad came out of the hospital, which picks the actor's first line to Kovalsky.
 *
 * @returns Short account of the squad.
 */
function resolveSquadFate(): TLabel {
  if (hasInfoPortion(infoPortions.pri_a17_recon_squad_dead)) {
    return "lost";
  }

  return hasInfoPortion(infoPortions.pri_a17_reacon_squad_casualties) ? "took casualties" : "came through";
}

/**
 * Pripyat a17 gauss rifle: Tarasov's recon squad takes the actor to the hospital, where a Monolith patrol and the
 * preacher's ambush wait, and the preacher's rifle goes back to Kovalsky.
 *
 * The task stays open after the hand-over, pointing at the rifle's makers, which later quests follow.
 */
requires({
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.pri_a17_military_base_commander_task_dialog_end),
      missing: "Kovalsky has not briefed the actor yet - walk the 'pri_a15' flow",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.pri_a17_actor_bring_gauss_rifle),
      missing: "Kovalsky already has the rifle - load a save from before it",
    },
  ],
});

step("1 - squad sent to the hospital", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_military_recon_squad_ambush_dialog_end),
  travel: (): void => void teleportToStoryObject(storyIds.pri_a17_military_captain_tarasov, 2),
  verify: (): void => void checkTaskText(TASK_ID, "on the way to the hospital"),
  handOff: "talk to Tarasov at the base, the 'pri_a17_military_recon_squad_ambush_dialog' dialog, out of a surge",
});

step("2 - squad in cover", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_recon_go),
  travel: (): void => void teleportToStoryObject(storyIds.pri_a17_military_captain_tarasov, 2),
  handOff:
    "nothing to do once 'pri_a17_teleport' has moved the actor to the hospital: Tarasov gives his orders with the " +
    "actor within 5 m of him, then leads the squad into cover",
});

step("3 - Monolith patrol dead", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_patrol_dead),
  verify: (): void => void checkTaskText(TASK_ID, "after the patrol"),
  handOff:
    "nothing to do, the squad attacks the patrol once it walks into its last zone or the actor is heard near it, " +
    "and kills it",
});

step("4 - Morozov shot by the preacher", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_ice_dead),
  verify: (): void => void checkTaskText(TASK_ID, "with the preacher praying"),
  handOff:
    "nothing to do, 'pri_a17_actor_ignore_mil' starts the ambush 600 game seconds after the patrol dies, sooner " +
    "once the actor walks into the hospital, and the preacher shoots Morozov",
});

step("5 - preacher dead", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_mon_preacher_dead),
  handOff: "kill the praying preacher, 'pri_a17_monolith_preacher'",
});

step("6 - rifle fallen", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_gauss_falled),
  handOff: "nothing to do, 'pri_a17_gauss_fall_controller' drops the rifle 55 game seconds after the preacher dies",
});

step("7 - rifle picked up", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_actor_has_gauss_rifle),
  travel: (): void => void teleportToStoryObject(storyIds.pri_a17_gauss_rifle, 1),
  verify: (): void => void checkTaskText(TASK_ID, "with the rifle in hand"),
  handOff: "pick the rifle up",
});

step("8 - rifle with Kovalsky", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a17_actor_bring_gauss_rifle),
  travel: (): void => void teleportToStoryObject(storyIds.pri_a17_military_colonel_kovalski, 2),
  verify: (): void => {
    checkTaskText(TASK_ID, "once Kovalsky has the rifle");
    report("recon squad %s", resolveSquadFate());
  },
  handOff: "talk to Kovalsky, the 'pri_a17_got_gauss' dialog - the actor's first line follows the squad's fate",
});
