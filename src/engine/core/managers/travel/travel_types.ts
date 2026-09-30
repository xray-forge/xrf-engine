import { TDistance, TName, TNumberId, TStringId, TTimestamp } from "xray16/lib";

import { TLevel } from "@/engine/constants/levels";
import { TConditionList } from "@/engine/core/ini";
import type { Squad } from "@/engine/core/objects/squad/Squad";

/**
 * Descriptor of a travel route destination available in the traveler dialog.
 */
export interface ITravelRouteDescriptor {
  phraseId: TStringId;
  name: TName;
  level: TLevel;
  condlist: TConditionList;
}

/**
 * Travel of the actor with a squad to a smart terrain, from the fade out until actor controls return.
 */
export interface ITravelDescriptor {
  squad: Squad;
  terrainId: TNumberId;
  // Server graph distance of the route, which sets the game time the travel takes.
  distance: TDistance;
  actorPath: TName;
  squadPath: TName;
  startedAt: TTimestamp;
  isTeleported: boolean;
}
