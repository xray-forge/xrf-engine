import { GameObject } from "xray16/alias";
import { assert, Nillable, TCount, TDistance, TStringId } from "xray16/lib";

import { getSimulationTerrainByName } from "@/engine/core/managers/simulation/utils";
import { getTravelRouteTerrainName } from "@/engine/core/managers/travel/utils/travel_route";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { getServerDistanceBetween } from "@/engine/core/utils/position";
import { getObjectSquad } from "@/engine/core/utils/squad";

/**
 * Calculate the rounded money cost for a travel distance.
 *
 * @param distance - Server graph distance between travel origin and destination.
 * @returns Travel price rounded up to the next fifty currency units.
 */
export function getTravelPriceByDistance(distance: TDistance): TCount {
  return math.ceil(distance / 50) * 50;
}

/**
 * Calculate the travel price for a squad moving to a destination smart terrain.
 *
 * Uses the same server distance as travel duration calculation to keep the charged amount aligned with the route.
 *
 * @param squad - Squad that starts the travel.
 * @param terrain - Destination smart terrain.
 * @returns Rounded travel price for the route.
 */
export function getTravelPriceForSquad(squad: Squad, terrain: SmartTerrain): TCount {
  return getTravelPriceByDistance(getServerDistanceBetween(squad, terrain));
}

/**
 * Calculate the price of the route a traveler dialog phrase leads to, for the squad of the object.
 *
 * @param object - Squad member game object being talked to.
 * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
 * @returns Travel price based on the distance to the destination terrain.
 */
export function getTravelPriceByPhrase(object: GameObject, phraseId: TStringId): TCount {
  const squad: Nillable<Squad> = getObjectSquad(object);
  const terrain: Nillable<SmartTerrain> = getSimulationTerrainByName(getTravelRouteTerrainName(phraseId));

  assert(squad, "Cannot calculate travel price without squad.");
  assert(terrain, "Cannot calculate travel price without destination terrain.");

  return getTravelPriceForSquad(squad, terrain);
}
