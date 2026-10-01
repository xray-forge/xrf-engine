import { level, patrol, time_global } from "xray16";
import { GameObject, Patrol, Vector } from "xray16/alias";
import {
  AnyObject,
  Nillable,
  TCount,
  TDirection,
  TDistance,
  TDuration,
  TName,
  TNumberId,
  TStringId,
  vectorToString,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { postProcessors } from "@/engine/constants/animation";
import { getManager, getStoryIdByObjectId, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  IMoneyRelocatedNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import {
  assignSimulationSquadToTerrain,
  getSimulationTerrainByName,
  getSimulationTerrainDescriptorById,
  releaseSimulationSquad,
} from "@/engine/core/managers/simulation/utils";
import { ITravelDescriptor } from "@/engine/core/managers/travel/travel_types";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { getTravelPriceByDistance } from "@/engine/core/managers/travel/utils/travel_price";
import { getTravelRouteTerrainName } from "@/engine/core/managers/travel/utils/travel_route";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { setSquadPosition } from "@/engine/core/objects/squad/utils";
import { forwardGameTime } from "@/engine/core/utils/game";
import { createGameAutoSave } from "@/engine/core/utils/game_save";
import { ELuaLoggerMode, LuaLogger } from "@/engine/core/utils/logging";
import { getServerDistanceBetween } from "@/engine/core/utils/position";
import { isAnySquadMemberEnemyToActor } from "@/engine/core/utils/relation";
import { getObjectSquad } from "@/engine/core/utils/squad";

const logger: LuaLogger = new LuaLogger($filename, { file: "travel", mode: ELuaLoggerMode.DUAL });

/**
 * Manager to handle fast traveling of actor.
 * Owns the active travel, the traveler dialog phrases and checks are in travel utils.
 */
export class TravelManager extends AbstractManager {
  public activeTravel: Nillable<ITravelDescriptor> = null;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.update, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.update);
  }

  /**
   * Advance the active travel: teleport once the screen faded out, then return actor controls.
   */
  public override update(): void {
    const travel: Nillable<ITravelDescriptor> = this.activeTravel;

    if (!travel) {
      return;
    }

    const elapsed: TDuration = time_global() - travel.startedAt;

    if (elapsed < travelConfig.TRAVEL_TELEPORT_DELAY) {
      return;
    }

    if (!travel.isTeleported) {
      travel.isTeleported = true;
      this.teleport(travel);
    }

    if (elapsed < travelConfig.TRAVEL_RESOLVE_DELAY) {
      return;
    }

    logger.info("Finish traveling");

    this.activeTravel = null;

    getManager(ActorInputManager).releaseControl(EActorControlHandle.TRAVEL);
  }

  /**
   * Travel together with squad to selected squad, pay them and ask to take somewhere.
   *
   * @param object - Squad member game object being talked to.
   * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
   */
  public onTravelToSpecificSmartWithSquad(object: GameObject, phraseId: TStringId): void {
    const terrainName: TName = getTravelRouteTerrainName(phraseId);
    const terrain: SmartTerrain = getSimulationTerrainByName(terrainName)!;
    const squad: Squad = getObjectSquad(object)!;
    const distance: TDistance = getServerDistanceBetween(squad, terrain);
    const price: TCount = getTravelPriceByDistance(distance);

    logger.info("Actor travel with squad: '%s' -> '%s', '%s' for '%s'", squad.name(), terrainName, distance, price);

    this.startTravel(object, squad, terrain, distance);

    registry.actor.give_money(-price);

    EventsManager.emitEvent<IMoneyRelocatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.MONEY,
      direction: ENotificationDirection.OUT,
      amount: price,
    });
  }

  /**
   * Travel together with squad to their assigned goal, just follow them.
   * Used when actor agrees to travel somewhere where squad heads.
   *
   * @param object - Squad member game object being talked to.
   */
  public onTravelTogetherWithSquad(object: GameObject): void {
    const squad: Squad = getObjectSquad(object)!;
    const terrain: SmartTerrain = registry.simulator.object<SmartTerrain>(squad.assignedTargetId!)!;

    logger.info("Actor travel together with squad: '%s' -> '%s'", squad.name(), terrain.name());

    this.startTravel(object, squad, terrain, getServerDistanceBetween(squad, terrain));
  }

  /**
   * Start traveling with the squad after saving the game: fade the screen out and lock actor controls.
   *
   * @param object - Squad member game object the actor talks to.
   * @param squad - Squad the actor travels with.
   * @param terrain - Smart terrain to travel to.
   * @param distance - Server graph distance of the route.
   */
  protected startTravel(object: GameObject, squad: Squad, terrain: SmartTerrain, distance: TDistance): void {
    createGameAutoSave("st_save_uni_travel_generic");

    object.stop_talk();

    getManager(ActorInputManager).acquireControl(
      EActorControlHandle.TRAVEL,
      "travel",
      EActorControlPolicy.INPUT_AND_INDICATORS
    );

    level.add_pp_effector(postProcessors.fade_in_out, travelConfig.TRAVEL_FADE_PP_EFFECTOR_ID, false);

    this.activeTravel = {
      squad,
      terrainId: terrain.id,
      distance,
      actorPath: terrain.travelerActorPointName,
      squadPath: terrain.travelerSquadPointName,
      startedAt: time_global(),
      isTeleported: false,
    };
  }

  /**
   * Teleport the actor and squad to the travel destination while the screen is faded out, forwarding game time.
   *
   * @param travel - Active travel to teleport for.
   */
  protected teleport(travel: ITravelDescriptor): void {
    logger.info("Teleporting actor on travel: %s %s", travel.squadPath, travel.actorPath);

    const point: Patrol = new patrol(travel.actorPath);
    const direction: TDirection = -point.point(1).sub(point.point(0)).getH();

    // Hostile squads at the destination are released, so the actor does not arrive into a fight, as in vanilla.
    for (const [, squad] of getSimulationTerrainDescriptorById(travel.terrainId)!.assignedSquads) {
      if ($isNil(getStoryIdByObjectId(squad.id)) && isAnySquadMemberEnemyToActor(squad)) {
        releaseSimulationSquad(squad);
      }
    }

    const currentTerrainId: Nillable<TNumberId> = travel.squad.assignedTerrainId;

    if ($isNotNil(currentTerrainId)) {
      logger.info("Leave smart on traveling: '%s' from '%s'", travel.squad.name(), currentTerrainId);

      assignSimulationSquadToTerrain(travel.squad, null);
      assignSimulationSquadToTerrain(travel.squad, currentTerrainId);
    }

    const position: Vector = new patrol(travel.squadPath).point(0);

    logger.info("Set squad position: '%s' -> '%s'", travel.squad.name(), vectorToString(position));

    setSquadPosition(travel.squad, position);

    registry.actor.set_actor_direction(direction);
    registry.actor.set_actor_position(point.point(0));

    // The route takes a game minute per 10 units of its distance, as in vanilla.
    const timeTookInMinutes: TDuration = travel.distance / 10;
    const hours: TDuration = math.floor(timeTookInMinutes / 60);
    const minutes: TDuration = timeTookInMinutes - hours * 60;

    forwardGameTime(hours, minutes);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      travelConfig: travelConfig,
      activeTravel: this.activeTravel,
    };

    return data;
  }
}
