import { relation_registry } from "xray16";
import { GameObject, TRelationType } from "xray16/alias";
import { assert, Nillable, TCount, TNumberId, TStringId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { getServerObjectByStoryId, registry } from "@/engine/core/database";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { getSquadCommunity } from "@/engine/core/utils/community";
import { EGoodwill, ERelation } from "@/engine/core/utils/relation/relation_types";

/**
 * Classify goodwill as a relation.
 *
 * @param goodwill - Goodwill value.
 * @returns Friend from friendly goodwill up, enemy from hostile goodwill down, neutral between.
 */
export function getRelationByGoodwill(goodwill: TCount): ERelation {
  if (goodwill >= EGoodwill.FRIENDS) {
    return ERelation.FRIEND;
  } else if (goodwill > EGoodwill.ENEMIES) {
    return ERelation.NEUTRAL;
  } else {
    return ERelation.ENEMY;
  }
}

/**
 * Get relation type between objects with safe null check.
 */
export function getObjectsRelationSafe(from: Nillable<GameObject>, to: Nillable<GameObject>): Nillable<TRelationType> {
  return from && to && from.relation(to);
}

/**
 * Returns relation to actor based on average of squad members.
 * If no squad members present, check relation of faction.
 *
 * Offline squad may be empty.
 *
 * @param squad - Target squad to check.
 * @returns Relation of squad members to actor or squad community relation is squad is empty.
 */
export function getSquadMembersRelationToActorSafe(squad: Squad): ERelation {
  const actor: Nillable<GameObject> = registry.actor;

  // Actor may be registered after other alife objects.
  if ($isNil(actor)) {
    return ERelation.NEUTRAL;
  }

  let squadTotalGoodwill: TCount = 0;
  let squadMembersCount: TCount = 0;

  for (const squadMember of squad.squad_members()) {
    const object: Nillable<GameObject> = registry.objects.get(squadMember.id)?.object as Nillable<GameObject>;

    if (object) {
      squadTotalGoodwill += object.general_goodwill(actor);
      squadMembersCount += 1;
    }
  }

  const averageRelation: TCount =
    squadMembersCount > 0
      ? squadTotalGoodwill / squadMembersCount
      : relation_registry.community_relation(getSquadCommunity(squad), communities.actor);

  return getRelationByGoodwill(averageRelation);
}

/**
 * Returns relation to actor based on average of squad members.
 * If no squad members present, return `null`.
 *
 * Offline squad may be empty.
 *
 * @returns Average relation of squad members to actor, `null` if squad is empty.
 */
export function getSquadMembersRelationToActor(squad: Squad): Nillable<ERelation> {
  const actor: Nillable<GameObject> = registry.actor;

  // Actor may be registered after other alife objects.
  if ($isNil(actor)) {
    return ERelation.NEUTRAL;
  }

  let squadTotalGoodwill: TCount = 0;
  let squadMembersCount: TCount = 0;

  for (const squadMember of squad.squad_members()) {
    const object: Nillable<GameObject> = registry.objects.get(squadMember.id)?.object as Nillable<GameObject>;

    if (object) {
      squadTotalGoodwill += object.general_goodwill(actor);
      squadMembersCount += 1;
    }
  }

  if (squadMembersCount <= 0) {
    return null;
  }

  const averageRelation: TCount = squadTotalGoodwill / squadMembersCount;

  return getRelationByGoodwill(averageRelation);
}

/**
 * Get relation value between communities.
 * Handle possible exceptional cases.
 *
 * @param from - Community from.
 * @param to - Community to.
 * @returns Goodwill value from community to another one.
 */
export function getNumberRelationBetweenCommunities(
  from: Nillable<TCommunity>,
  to: Nillable<TCommunity>
): Nillable<TCount> {
  if (!from || !to || from === communities.none || to === communities.none) {
    return null;
  }

  return relation_registry.community_relation(from, to);
}

/**
 * Get community relation type from squad to actor.
 *
 * @param squadStoryId - Target squad story id.
 * @returns Relation type of squad to actor.
 */
export function getSquadCommunityRelationToActor(squadStoryId: TStringId): ERelation {
  const squad: Nillable<Squad> = getServerObjectByStoryId(squadStoryId);

  assert(squad, "Squad with story id '%s' was not found.", squadStoryId);

  // Squad has ini pre-defined relation to actor.
  if (squad.relationship) {
    return squad.relationship;
  }

  return getRelationByGoodwill(
    relation_registry.community_relation(getSquadCommunity(squad), registry.actorServer.community())
  );
}

/**
 * Get squad relation to actor based on config preference or squad/actor community relation.
 *
 * @param squadId - Target squad id.
 * @returns Relation type of squad to actor based on community.
 */
export function getSquadRelationToActorById(squadId: TNumberId): ERelation {
  const squad: Nillable<Squad> = registry.simulator.object<Squad>(squadId);

  assert(squad, "Squad with id '%s' is not found.", squadId);

  if (squad.relationship) {
    return squad.relationship;
  } else {
    return getRelationByGoodwill(
      relation_registry.community_relation(getSquadCommunity(squad), registry.actorServer.community())
    );
  }
}
