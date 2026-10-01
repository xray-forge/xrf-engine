import { GameObject, ServerObject } from "xray16/alias";
import { Nillable, TName, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { smartTerrainNames } from "@/engine/constants/smart_terrain_names";
import { registry } from "@/engine/core/database";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { getTravelPriceByPhrase } from "@/engine/core/managers/travel/utils/travel_price";
import { getTravelRouteTerrainName, isTravelRouteAvailable } from "@/engine/core/managers/travel/utils/travel_route";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { isSmartTerrain } from "@/engine/core/utils/class_ids";
import { getObjectTerrain } from "@/engine/core/utils/position";
import { getObjectSquad } from "@/engine/core/utils/squad";

/**
 * @param object - Target object to check whether actor can travel.
 * @returns Whether actor can discuss traveling with object.
 */
export function canStartTravelingDialogs(object: GameObject): boolean {
  const squad: Nillable<Squad> = getObjectSquad(object);
  const objectCommunity: TCommunity = object.character_community();

  if (!squad) {
    return false;
  } else if (squad.commander_id() !== object.id()) {
    return false;
  } else if (objectCommunity === communities.bandit || objectCommunity === communities.army) {
    return false;
  } else if (getObjectTerrain(object)?.name() === smartTerrainNames.jup_b41) {
    return false;
  }

  return true;
}

/**
 * @param object - Squad member game object being talked to.
 * @returns Whether the squad is currently reaching a target and the actor can move with it.
 */
export function canActorMoveWithSquad(object: GameObject): boolean {
  return getObjectSquad(object)?.currentAction?.type === ESquadActionType.REACH_TARGET;
}

/**
 * @param object - Squad member game object being talked to.
 * @returns Whether the squad target is a smart terrain, so the squad can take the actor along.
 */
export function canSquadTakeActor(object: GameObject): boolean {
  const squad: Nillable<Squad> = getObjectSquad(object);

  if ($isNil(squad) || $isNil(squad.assignedTargetId)) {
    return false;
  }

  const target: Nillable<ServerObject> = registry.simulator.object(squad.assignedTargetId);

  return $isNotNil(target) && isSmartTerrain(target);
}

/**
 * Check whether the squad of the object can travel to at least one route.
 * Routes of other levels are skipped by their first check, so all of them are walked.
 *
 * @param object - Squad member game object being talked to.
 * @returns Whether the squad has at least one available route.
 */
export function canSquadTravel(object: GameObject): boolean {
  const squad: Nillable<Squad> = getObjectSquad(object);

  if ($isNil(squad)) {
    return false;
  }

  for (const [terrainName, descriptor] of travelConfig.TRAVEL_DESCRIPTORS_BY_NAME) {
    if (isTravelRouteAvailable(terrainName, descriptor, squad)) {
      return true;
    }
  }

  return false;
}

/**
 * @param object - Squad member game object being talked to.
 * @param phraseId - Identifier of the phrase mapped to a smart terrain.
 * @returns Whether the route of the phrase is available for the squad of the object.
 */
export function canNegotiateTravelToSmart(object: GameObject, phraseId: TStringId): boolean {
  const terrainName: TName = getTravelRouteTerrainName(phraseId);
  const squad: Nillable<Squad> = getObjectSquad(object);

  if ($isNil(squad)) {
    return false;
  }

  return isTravelRouteAvailable(terrainName, travelConfig.TRAVEL_DESCRIPTORS_BY_NAME.get(terrainName), squad);
}

/**
 * @param object - Squad member game object being talked to.
 * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
 * @returns Whether the actor has enough money to pay for the travel.
 */
export function isEnoughMoneyToTravel(object: GameObject, phraseId: TStringId): boolean {
  return getTravelPriceByPhrase(object, phraseId) <= registry.actor.money();
}
