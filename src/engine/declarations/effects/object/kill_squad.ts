import { GameObject } from "xray16/alias";
import { assert, extern, Nillable, TStringId } from "xray16/lib";

import { getServerObjectByStoryId } from "@/engine/core/database";
import type { Squad } from "@/engine/core/objects/squad";
import { getSquadMembers, killSquadMember } from "@/engine/core/utils/squad/squad_members";

/**
 * Kill every member of the squad referenced by the provided story ID.
 *
 * @param actor - Actor game object initiating the effect.
 * @param object - Game object owning the logics scheme.
 * @param p - Tuple containing the story ID of the squad to kill.
 */
extern("xr_effects.kill_squad", (actor: GameObject, object: GameObject, p: [Nillable<TStringId>]): void => {
  const storyId: Nillable<TStringId> = p[0];

  assert(storyId, "Wrong squad identification [NIL] in kill_squad function");

  const squad: Nillable<Squad> = getServerObjectByStoryId(storyId);

  if (!squad) {
    return;
  }

  for (const [, member] of getSquadMembers(squad)) {
    killSquadMember(member);
  }
});
