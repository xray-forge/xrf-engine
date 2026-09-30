import { game, level, patrol, time_global } from "xray16";
import { GameObject, Patrol, Phrase, PhraseDialog, PhraseScript, ServerObject, TClassId, Vector } from "xray16/alias";
import {
  abort,
  ACTOR_ID,
  AnyObject,
  assert,
  Nillable,
  TCount,
  TDirection,
  TDistance,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TRUE,
  TStringId,
  vectorToString,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { postProcessors } from "@/engine/constants/animation";
import { communities, TCommunity } from "@/engine/constants/communities";
import { smartTerrainNames } from "@/engine/constants/smart_terrain_names";
import { getManager, getStoryIdByObjectId, registry } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { mapDisplayConfig } from "@/engine/core/managers/map/MapDisplayConfig";
import { ENotificationDirection, NotificationManager } from "@/engine/core/managers/notifications";
import { TSimulationObject } from "@/engine/core/managers/simulation/types";
import {
  assignSimulationSquadToTerrain,
  getSimulationTerrainByName,
  getSimulationTerrainDescriptorById,
  releaseSimulationSquad,
} from "@/engine/core/managers/simulation/utils";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { ITravelDescriptor, ITravelRouteDescriptor } from "@/engine/core/managers/travel/travel_types";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { getTravelPriceByDistance, getTravelPriceForSquad } from "@/engine/core/managers/travel/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { setSquadPosition } from "@/engine/core/objects/squad/utils";
import { isSmartTerrain, isSquad } from "@/engine/core/utils/class_ids";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { createGameAutoSave } from "@/engine/core/utils/game_save";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { ELuaLoggerMode, LuaLogger } from "@/engine/core/utils/logging";
import { getObjectTerrain, getServerDistanceBetween } from "@/engine/core/utils/position";
import { isAnySquadMemberEnemyToActor } from "@/engine/core/utils/relation";
import { getObjectSquad } from "@/engine/core/utils/squad";

const logger: LuaLogger = new LuaLogger($filename, { file: "travel", mode: ELuaLoggerMode.DUAL });

/**
 * Manager to handle fast traveling of actor.
 *
 * Todo: Fix faction-specific labels and answers. Originally commented and hardcoded to stalkers?
 * Todo: Move some pure methods to utils.
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
   * Create fast traveling phrases for provided dialog.
   *
   * @param dialog - Target dialog to modify.
   */
  public initializeTravellerDialog(dialog: PhraseDialog): void {
    const community: TCommunity = communities.stalker; // -- object:character_community()

    let actorPhrase: Phrase;
    let actorScript: PhraseScript;

    dialog.AddPhrase("dm_traveler_what_are_you_doing", "0", "", -10000);

    let npcPhrase: Phrase = dialog.AddPhrase("if you see this - this is bad", "1", "0", -10000);
    let npcPhraseScript: PhraseScript = npcPhrase.GetPhraseScript();

    npcPhraseScript.SetScriptText("travel_callbacks.get_squad_current_action_description");

    actorPhrase = dialog.AddPhrase("dm_traveler_can_i_go_with_you", "11", "1", -10000);
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddPrecondition("travel_callbacks.can_actor_move_with_squad");

    npcPhrase = dialog.AddPhrase("dm_traveler_" + community + "_actor_companion_yes", "111", "11", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.can_squad_take_actor");

    actorPhrase = dialog.AddPhrase("dm_traveler_actor_go_with_squad", "1111", "111", -10000);
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddAction("travel_callbacks.on_travel_together_with_squad");

    dialog.AddPhrase("dm_traveler_actor_dont_go_with_squad", "1112", "111", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + community + "_actor_companion_no", "112", "11", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.cannot_squad_take_actor");

    actorPhrase = dialog.AddPhrase("dm_traveler_take_me_to", "12", "1", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + community + "_where_do_you_want", "121", "12", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.can_squad_travel");

    for (const [, descriptor] of travelConfig.TRAVEL_DESCRIPTORS_BY_NAME) {
      actorPhrase = dialog.AddPhrase(game.translate_string(descriptor.name) + ".", descriptor.phraseId, "121", -10000);
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddPrecondition("travel_callbacks.can_negotiate_travel_to_smart");

      npcPhrase = dialog.AddPhrase(
        "if you see this - this is bad",
        descriptor.phraseId + "_1",
        descriptor.phraseId,
        -10000
      );
      npcPhraseScript = npcPhrase.GetPhraseScript();
      npcPhraseScript.SetScriptText("travel_callbacks.get_travel_cost");

      actorPhrase = dialog.AddPhrase(
        "dm_traveler_actor_agree",
        descriptor.phraseId + "_11",
        descriptor.phraseId + "_1",
        -10000
      );
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddAction("travel_callbacks.on_travel_to_specific_smart_with_squad");
      actorScript.AddPrecondition("travel_callbacks.is_enough_money_to_travel");

      actorPhrase = dialog.AddPhrase(
        "dm_traveler_actor_has_no_money",
        descriptor.phraseId + "_13",
        descriptor.phraseId + "_1",
        -10000
      );
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddPrecondition("travel_callbacks.is_not_enough_money_to_travel");

      actorPhrase = dialog.AddPhrase(
        "dm_traveler_actor_refuse",
        descriptor.phraseId + "_14",
        descriptor.phraseId + "_1",
        -10000
      );
    }

    dialog.AddPhrase("dm_traveler_actor_refuse", "1211", "121", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + community + "_i_cant_travel", "122", "12", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.cannot_squad_travel");

    dialog.AddPhrase("dm_traveler_bye", "13", "1", -10000);
  }

  /**
   * @param actor - Actor game object.
   * @param object - Target object to check whether actor can travel.
   * @returns Whether object actor can discuss traveling with object.
   */
  public canStartTravelingDialogs(actor: GameObject, object: GameObject): boolean {
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
   * Get a localized description of what the object's squad is currently doing.
   *
   * @param actor - Actor game object talking with the squad.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the active phrase.
   * @returns Localized label describing the squad current action.
   */
  public getSquadCurrentActionDescription(
    actor: GameObject,
    object: GameObject,
    dialogId?: TStringId,
    phraseId?: TStringId
  ): TLabel {
    const squad: Squad = getObjectSquad(object)!;
    const squadTargetId: Nillable<TNumberId> = squad.assignedTargetId;

    if (!squad.currentAction || squad.currentAction.type === ESquadActionType.STAY_ON_TARGET) {
      return "dm_stalker_doing_nothing_" + tostring(math.random(1, 3)); // -- object:character_community()
    }

    const targetSquadObject: Nillable<TSimulationObject> = registry.simulator.object(squadTargetId!);

    if ($isNil(targetSquadObject)) {
      abort("Simulation target not existing '%s', action_name '%s'.", squadTargetId, squad.currentAction.type);
    }

    const targetClsId: TClassId = targetSquadObject.clsid();

    if (isSmartTerrain(targetSquadObject)) {
      const terrainDescription: TLabel = travelConfig.TRAVEL_LOCATIONS.get(targetSquadObject.name());

      if ($isNil(terrainDescription)) {
        abort("Wrong smart name '%s' in travel_manager.ltx", targetSquadObject.name());
      }

      return terrainDescription;
    } else if (isSquad(targetSquadObject)) {
      return string.format(
        "dm_%s_chasing_squad_%s",
        communities.stalker,
        getObjectCommunity(targetSquadObject as Squad)
      );
    } else {
      if (targetSquadObject.id === ACTOR_ID) {
        abort("Actor talking with squad, which chasing actor.");
      } else {
        abort("Wrong target clsid [%s] supplied for travel manager.", tostring(targetClsId));
      }
    }
  }

  /**
   * Check whether the actor can join and move with the object's squad.
   *
   * @param actor - Actor game object talking with the squad.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the active phrase.
   * @returns Whether the squad is currently reaching a target and the actor can move with it.
   */
  public canActorMoveWithSquad(
    actor: GameObject,
    object: GameObject,
    dialogId?: TStringId,
    phraseId?: TStringId
  ): boolean {
    return getObjectSquad(object)?.currentAction?.type === ESquadActionType.REACH_TARGET;
  }

  /**
   * Check whether the object's squad can take the actor along to its assigned smart terrain target.
   *
   * @param object - Squad member game object being talked to.
   * @param actor - Actor game object talking with the squad.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the active phrase.
   * @returns Whether the squad target is a smart terrain and can take the actor.
   */
  public canSquadTakeActor(object: GameObject, actor: GameObject, dialogId?: TStringId, phraseId?: TStringId): boolean {
    const squad: Nillable<Squad> = getObjectSquad(object);

    if ($isNil(squad) || $isNil(squad.assignedTargetId)) {
      return false;
    }

    const target: Nillable<ServerObject> = registry.simulator.object(squad.assignedTargetId);

    return $isNotNil(target) && isSmartTerrain(target);
  }

  /**
   * Check whether the squad can reach the described smart terrain on the current level.
   *
   * @param terrainName - Name of the smart terrain to reach.
   * @param descriptor - Travel route descriptor of the destination.
   * @param squad - Squad that would travel to the terrain.
   * @returns Whether the smart terrain is available for the squad to reach.
   */
  public isSmartAvailableToReach(terrainName: TName, descriptor: ITravelRouteDescriptor, squad: Squad): boolean {
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

  /**
   * Check whether the object's squad can travel to at least one available smart terrain.
   *
   * @param object - Squad member game object being talked to.
   * @param actor - Actor game object talking with the squad.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the active phrase.
   * @returns Whether the squad has at least one reachable travel destination.
   */
  public canSquadTravel(object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean {
    const squad: Nillable<Squad> = getObjectSquad(object);

    if ($isNil(squad)) {
      return false;
    }

    // todo: Filter all squads to current level, do not check other locations.
    for (const [id, descriptor] of travelConfig.TRAVEL_DESCRIPTORS_BY_NAME) {
      if (this.isSmartAvailableToReach(id, descriptor, squad)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check whether the actor can negotiate traveling to the smart terrain tied to the phrase.
   *
   * @param actor - Actor game object talking with the squad.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param prevPhraseId - Identifier of the previous phrase.
   * @param phraseId - Identifier of the active phrase mapped to a smart terrain.
   * @returns Whether the smart terrain tied to the phrase is available to reach.
   */
  public canNegotiateTravelToSmart(
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    prevPhraseId: TStringId,
    phraseId: TStringId
  ): boolean {
    const terrainName: TName = this.getRouteTerrainName(phraseId);
    const squad: Nillable<Squad> = getObjectSquad(object);

    if ($isNil(squad)) {
      return false;
    }

    return this.isSmartAvailableToReach(terrainName, travelConfig.TRAVEL_DESCRIPTORS_BY_NAME.get(terrainName), squad);
  }

  /**
   * Calculate the travel price from the object to the smart terrain tied to the provided phrase.
   *
   * @param object - Game object used as the travel origin point.
   * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
   * @returns Travel price based on the distance to the destination terrain.
   */
  public getTravelPriceByObjectPhrase(object: GameObject, phraseId: TStringId): TCount {
    const squad: Nillable<Squad> = getObjectSquad(object);
    const terrain: Nillable<SmartTerrain> = getSimulationTerrainByName(this.getRouteTerrainName(phraseId));

    assert(squad, "Cannot calculate travel price without squad.");
    assert(terrain, "Cannot calculate travel price without destination terrain.");

    return getTravelPriceForSquad(squad, terrain);
  }

  /**
   * Build a localized label describing the travel cost for the phrase destination.
   *
   * @param actor - Actor game object talking with the squad.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
   * @returns Localized label describing the travel cost.
   */
  public getTravelCostLabel(actor: GameObject, object: GameObject, dialogId: TStringId, phraseId: TStringId): TLabel {
    return string.format(
      "%s %s.",
      game.translate_string("dm_traveler_travel_cost"),
      this.getTravelPriceByObjectPhrase(object, phraseId)
    );
  }

  /**
   * Check whether the actor has enough money to pay for traveling to the phrase destination.
   *
   * @param actor - Actor game object talking with the squad.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
   * @returns Whether the actor has enough money to pay for the travel.
   */
  public isEnoughMoneyToTravel(
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean {
    return this.getTravelPriceByObjectPhrase(object, phraseId) <= registry.actor.money();
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
   * @param actor - Actor game object initiating the travel.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
   */
  public onTravelToSpecificSmartWithSquad(
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void {
    const terrainName: TName = this.getRouteTerrainName(phraseId);
    const terrain: SmartTerrain = getSimulationTerrainByName(terrainName)!;
    const squad: Squad = getObjectSquad(object)!;
    const distance: TDistance = getServerDistanceBetween(squad, terrain);
    const price: TCount = getTravelPriceByDistance(distance);

    logger.info("Actor travel with squad: '%s' -> '%s', '%s' for '%s'", squad.name(), terrainName, distance, price);

    this.startTravel(object, squad, terrain, distance);

    actor.give_money(-price);
    getManager(NotificationManager).sendMoneyRelocatedNotification(ENotificationDirection.OUT, price);
  }

  /**
   * Travel together with squad to their assigned goal, just follow them.
   * Used when actor agrees to travel somewhere where squad heads.
   *
   * @param actor - Actor game object initiating the travel.
   * @param object - Squad member game object being talked to.
   * @param dialogId - Identifier of the active dialog.
   * @param phraseId - Identifier of the active phrase.
   */
  public onTravelTogetherWithSquad(
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void {
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

    level.change_game_time(0, hours, minutes);

    surgeConfig.IS_TIME_FORWARDED = true;

    logger.info("Forwarded time on travel: '%s:%s'", hours, minutes);
  }

  /**
   * @param phraseId - Traveler dialog phrase of a route, or of one of its answers as `<route>_<answer>`.
   * @returns Name of the smart terrain the route leads to.
   */
  protected getRouteTerrainName(phraseId: TStringId): TName {
    const [routePhraseId] = string.match(phraseId, "[^_]+");
    const terrainName: Nillable<TName> = travelConfig.TRAVEL_DESCRIPTORS_BY_PHRASE.get(routePhraseId as TStringId);

    if ($isNil(terrainName)) {
      abort("Error in travel manager, not available smart name: '%s'.", tostring(phraseId));
    }

    return terrainName;
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
