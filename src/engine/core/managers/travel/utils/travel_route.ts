import { level } from "xray16";
import { abort, Nillable, TName, TRUE, TStringId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { mapDisplayConfig } from "@/engine/core/managers/map/MapDisplayConfig";
import { getSimulationTerrainByName } from "@/engine/core/managers/simulation/utils";
import { ITravelRouteDescriptor } from "@/engine/core/managers/travel/travel_types";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { getServerDistanceBetween } from "@/engine/core/utils/position";

/**
 * @param phraseId - Traveler dialog phrase of a route, or of one of its answers as `<route>_<answer>`.
 * @returns Name of the smart terrain the route leads to.
 */
export function getTravelRouteTerrainName(phraseId: TStringId): TName {
  const [routePhraseId] = string.match(phraseId, "[^_]+");
  const terrainName: Nillable<TName> = travelConfig.TRAVEL_DESCRIPTORS_BY_PHRASE.get(routePhraseId as TStringId);

  if ($isNil(terrainName)) {
    abort("Error in travel manager, not available smart name: '%s'.", tostring(phraseId));
  }

  return terrainName;
}

/**
 * Check whether the squad can take the actor along the route to the smart terrain.
 *
 * @param terrainName - Name of the smart terrain to reach.
 * @param descriptor - Travel route descriptor of the destination.
 * @param squad - Squad that would travel to the terrain.
 * @returns Whether the route is on the current level, open for the actor and long enough to travel.
 */
export function isTravelRouteAvailable(terrainName: TName, descriptor: ITravelRouteDescriptor, squad: Squad): boolean {
  if (descriptor.level !== level.name()) {
    return false;
  }

  if (mapDisplayConfig.REQUIRE_SMART_TERRAIN_VISIT && !hasInfoPortion(string.format("%s_visited", terrainName))) {
    return false;
  }

  const terrain: Nillable<SmartTerrain> = getSimulationTerrainByName(terrainName);

  if (!terrain) {
    abort("Error in travel manager. Smart terrain '%s' does not exist.", terrainName);
  }

  return (
    pickSectionFromCondList(registry.actor, terrain, descriptor.condlist) === TRUE &&
    getServerDistanceBetween(squad, terrain) > travelConfig.TRAVEL_DISTANCE_MIN_THRESHOLD
  );
}
