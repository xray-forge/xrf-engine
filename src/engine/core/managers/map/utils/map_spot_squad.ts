import { level } from "xray16";
import { Nillable, TLabel, TNumberId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { mapMarks } from "@/engine/constants/map_marks";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { type Squad } from "@/engine/core/objects/squad";
import { getSquadMapDisplayHint } from "@/engine/core/objects/squad/utils";
import {
  ERelation,
  getSquadMembersRelationToActor,
  getSquadMembersRelationToActorSafe,
} from "@/engine/core/utils/relation";
import { isSquadMonsterCommunity } from "@/engine/core/utils/section";

/**
 * Update map spot for squad.
 *
 * @param squad - Target squad server object.
 */
export function updateSquadMapSpot(squad: Squad): void {
  const commanderId: Nillable<TNumberId> = squad.commander_id();

  if (squad.isMapDisplayHidden || $isNil(commanderId)) {
    return removeSquadMapSpot(squad);
  }

  if (squad.currentMapSpotId !== commanderId) {
    removeSquadMapSpot(squad);
    squad.currentMapSpotId = commanderId;
    updateSquadMapSpot(squad);

    return;
  }

  // Squad leader is NPC with some role, do not display default icons.
  if (
    level.map_has_object_spot(commanderId, mapMarks.ui_pda2_trader_location) !== 0 ||
    level.map_has_object_spot(commanderId, mapMarks.ui_pda2_mechanic_location) !== 0 ||
    level.map_has_object_spot(commanderId, mapMarks.ui_pda2_scout_location) !== 0 ||
    level.map_has_object_spot(commanderId, mapMarks.ui_pda2_quest_npc_location) !== 0 ||
    level.map_has_object_spot(commanderId, mapMarks.ui_pda2_medic_location) !== 0
  ) {
    squad.isMapDisplayHidden = true;

    return;
  }

  let spot: Nillable<TLabel> = null;

  /**
   * In case of debug use map display like in clear sky.
   */
  if (forgeConfig.DEBUG.IS_SIMULATION_ENABLED) {
    if (isSquadMonsterCommunity(squad.faction)) {
      spot = mapMarks.alife_presentation_squad_monster_debug;
    } else {
      const relation: ERelation = getSquadMembersRelationToActorSafe(squad);

      switch (relation) {
        case ERelation.FRIEND:
          spot = mapMarks.alife_presentation_squad_friend_debug;
          break;
        case ERelation.NEUTRAL:
          spot = mapMarks.alife_presentation_squad_neutral_debug;
          break;
        case ERelation.ENEMY:
          spot = mapMarks.alife_presentation_squad_enemy_debug;
          break;
      }
    }
    /**
     * Display only minimap marks.
     * Do not display for offline objects.
     */
  } else if (!isSquadMonsterCommunity(squad.faction)) {
    const relation: Nillable<ERelation> = getSquadMembersRelationToActor(squad);

    switch (relation) {
      case ERelation.FRIEND:
        spot = mapMarks.alife_presentation_squad_friend;
        break;

      case ERelation.NEUTRAL:
        spot = mapMarks.alife_presentation_squad_neutral;
        break;
    }
  }

  if (spot) {
    const hint: TLabel = getSquadMapDisplayHint(squad);
    const hasMapSpot: boolean = level.map_has_object_spot(squad.currentMapSpotId, spot) === 1;

    if (spot === squad.currentMapSpotSection && hasMapSpot) {
      return level.map_change_spot_hint(squad.currentMapSpotId, spot, hint);
    }

    if ($isNil(squad.currentMapSpotSection) || !hasMapSpot) {
      level.map_add_object_spot(squad.currentMapSpotId, spot, hint);
    } else {
      level.map_remove_object_spot(squad.currentMapSpotId, squad.currentMapSpotSection);
      level.map_add_object_spot(squad.currentMapSpotId, spot, hint);
    }

    squad.currentMapSpotSection = spot;
  } else if (squad.currentMapSpotSection) {
    level.map_remove_object_spot(squad.currentMapSpotId, squad.currentMapSpotSection);
    squad.currentMapSpotSection = null;
  }
}

/**
 * Remove map spot for squad.
 *
 * @param squad - Target squad server object.
 */
export function removeSquadMapSpot(squad: Squad): void {
  if ($isNil(squad.currentMapSpotId) || $isNil(squad.currentMapSpotSection)) {
    return;
  } else {
    level.map_remove_object_spot(squad.currentMapSpotId, squad.currentMapSpotSection);

    squad.currentMapSpotId = null;
    squad.currentMapSpotSection = null;
  }
}
