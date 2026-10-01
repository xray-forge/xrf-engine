import { actor_stats, callback, level, LuabindClass, object_binder, patrol, time_global } from "xray16";
import {
  GameObject,
  NetPacket,
  NetReader,
  ServerCreatureObject,
  ServerHumanObject,
  TSoundType,
  Vector,
} from "xray16/alias";
import {
  ACTOR_ID,
  Nillable,
  TCount,
  TDuration,
  TIndex,
  TName,
  TNumberId,
  TRate,
  TTimestamp,
  ZERO_VECTOR,
} from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { misc } from "@/engine/constants/items/misc";
import { StalkerPatrolController } from "@/engine/core/ai/patrol/StalkerPatrolController";
import { setupStalkerMotivationPlanner, setupStalkerStatePlanner } from "@/engine/core/ai/planner/setup";
import { StalkerStateController } from "@/engine/core/ai/state";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  IRegistryObjectState,
  loadObjectLogic,
  openLoadMarker,
  openSaveMarker,
  registerHelicopterEnemy,
  registerStalker,
  registry,
  resetObject,
  saveObjectLogic,
  softResetOfflineObject,
  unregisterHelicopterEnemy,
  unregisterStalker,
} from "@/engine/core/database";
import { pickSectionFromCondList, readIniString, TConditionList } from "@/engine/core/ini";
import { ReleaseBodyManager } from "@/engine/core/managers/death/ReleaseBodyManager";
import { DialogManager } from "@/engine/core/managers/dialogs";
import { DropManager } from "@/engine/core/managers/drop";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { invalidateObjectThemes } from "@/engine/core/managers/sounds/utils";
import { TradeManager } from "@/engine/core/managers/trade/TradeManager";
import { syncObjectHitSmartTerrainAlert } from "@/engine/core/objects/smart_terrain/utils";
import { Squad } from "@/engine/core/objects/squad";
import {
  emitSchemeEvent,
  initializeObjectInvulnerability,
  setupObjectLogicsOnSpawn,
} from "@/engine/core/schemes/runtime";
import { SchemeHear } from "@/engine/core/schemes/shared/hear/SchemeHear";
import { SchemePostCombatIdle } from "@/engine/core/schemes/stalker/combat_idle/SchemePostCombatIdle";
import { activateMeetWithObject, updateObjectMeetAvailability } from "@/engine/core/schemes/stalker/meet/utils";
import { SchemeReachTask } from "@/engine/core/schemes/stalker/reach_task/SchemeReachTask";
import {
  getActiveSchemeStateOptimistic,
  getSchemeStateOptimistic,
  hasActiveScheme,
  hasSchemeState,
} from "@/engine/core/schemes/state";
import { EScheme, ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { isUndergroundLevel } from "@/engine/core/utils/level";
import { LuaLogger } from "@/engine/core/utils/logging";
import { updateStalkerLogic } from "@/engine/core/utils/logics";
import {
  getObjectSpawnIni,
  setupObjectInfoPortions,
  setupObjectStalkerVisual,
  setupSpawnedObjectPosition,
} from "@/engine/core/utils/object";
import { ERelation, setGameObjectRelation, setObjectSympathy } from "@/engine/core/utils/relation";
import { getObjectSquad } from "@/engine/core/utils/squad";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Binder for client side objects representing stalkers.
 * Wraps logics and adds additional layers when stalker objects are online.
 */
@LuabindClass()
export class StalkerBinder extends object_binder {
  public lastUpdatedAt: TTimestamp = 0;
  public isFirstUpdate: boolean = false;
  public isLoaded: boolean = false;

  public state!: IRegistryObjectState;
  public helicopterEnemyIndex: Nillable<TIndex> = null; // todo: create binding somewhere in DB.

  public override reinit(): void {
    super.reinit();

    this.state = resetObject(this.object);
    this.state.stateController = new StalkerStateController(this.object);
    this.state.patrolController = new StalkerPatrolController(this.object).initialize();

    setupStalkerStatePlanner(this.state.stateController.planner, this.state.stateController);
    setupStalkerMotivationPlanner(this.object.motivation_action_manager(), this.state.stateController);

    // Expose state planner for in-game debugging tools.
    if ($isNotNil(this.object.debug_planner)) {
      this.object.debug_planner(this.state.stateController.planner);
    }
  }

  public override net_spawn(serverObject: ServerCreatureObject): boolean {
    if (!super.net_spawn(serverObject)) {
      return false;
    }

    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const stalker: Nillable<ServerHumanObject> = registry.simulator.object(objectId);

    setupObjectStalkerVisual(object);

    if (!stalker) {
      return false;
    }

    logger.info("Go online: %s", object.name());

    this.state = registerStalker(this);
    object.apply_loophole_direction_distance(1.0);

    this.setupCallbacks();

    if (!this.isLoaded) {
      setupObjectInfoPortions(object, getObjectSpawnIni(object));
    }

    if (!object.alive()) {
      object.death_sound_enabled(false);
      getManager(ReleaseBodyManager).registerCorpse(object);

      return true;
    }

    const relation: Nillable<ERelation> = registry.goodwill.relations.get(objectId) as Nillable<ERelation>;

    if (relation) {
      setGameObjectRelation(object, registry.actor, relation);
    }

    const sympathy: Nillable<TCount> = registry.goodwill.sympathy.get(objectId) as Nillable<TCount>;

    if ($isNotNil(sympathy)) {
      setObjectSympathy(object, sympathy);
    }

    this.helicopterEnemyIndex = registerHelicopterEnemy(object);

    SchemeReachTask.setup(object);

    setupSpawnedObjectPosition(object, stalker.m_smart_terrain_id);
    setupObjectLogicsOnSpawn(object, this.state, ESchemeType.STALKER, this.isLoaded);

    SchemePostCombatIdle.setup(object);

    object.group_throw_time_interval(2_000); // todo: Interval to check danger from group objects?

    return true;
  }

  public override net_destroy(): void {
    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const state: IRegistryObjectState = this.state;

    logger.info("Go offline: %s", object.name());

    this.resetCallbacks();

    getManager(SoundManager).stop(objectId);
    invalidateObjectThemes(objectId);

    registry.actorCombat.delete(objectId);

    if (hasActiveScheme(state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(state), ESchemeEvent.SWITCH_OFFLINE, object);
    }

    if (hasSchemeState(state, EScheme.REACH_TASK)) {
      emitSchemeEvent(getSchemeStateOptimistic(state, EScheme.REACH_TASK), ESchemeEvent.SWITCH_OFFLINE, object);
    }

    // Call logics on offline.
    const onOfflineConditionList: Nillable<TConditionList> = state.overrides?.onOffline as Nillable<TConditionList>;

    if (onOfflineConditionList) {
      pickSectionFromCondList(registry.actor, object, onOfflineConditionList);
    }

    softResetOfflineObject(objectId, {
      levelVertexId: object.level_vertex_id(),
      activeSection: state.activeSection,
    });

    if ($isNotNil(this.helicopterEnemyIndex)) {
      unregisterHelicopterEnemy(this.helicopterEnemyIndex);
      this.helicopterEnemyIndex = null;
    }

    unregisterStalker(this);

    super.net_destroy();
  }

  public override update(delta: TDuration): void {
    super.update(delta);

    const now: TTimestamp = time_global();
    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const state: IRegistryObjectState = this.state;
    const squad: Nillable<Squad> = getObjectSquad(object);
    const isObjectAlive: boolean = object.alive();
    const isSquadCommander: boolean = squad?.commander_id() === objectId;
    const stateController: Nillable<StalkerStateController> = state.stateController;

    if (registry.actorCombat.get(objectId) && !object.best_enemy()) {
      registry.actorCombat.delete(objectId);
    }

    updateStalkerLogic(object, state);

    if (!this.isFirstUpdate) {
      this.isFirstUpdate = true;

      if (!isObjectAlive) {
        getManager(DropManager).forceCorpseReleaseItemsSpawn(object);
      }
    }

    if (now - this.lastUpdatedAt > 1000) {
      this.lastUpdatedAt = now;
      this.updateLightState(object);
    }

    if (stateController) {
      if (isObjectAlive) {
        stateController.update();

        if (!stateController.isCombat && !stateController.isAlife) {
          // --and this.st.state_mgr.planner:current_action_id() == this.st.state_mgr.operators["}"]
          getManager(TradeManager).updateForObject(object);
        }
      } else {
        state.stateController = null;
      }
    }

    if (isObjectAlive) {
      getManager(SoundManager).updateObject(objectId);
      updateObjectMeetAvailability(object, state);
      initializeObjectInvulnerability(object, state);
    } else {
      object.set_tip_text_default();
    }

    if (isSquadCommander) {
      (squad as Squad).update();
    }
  }

  /**
   * Update the stalker torch light state depending on the level, time of day and surrounding conditions.
   *
   * @param object - Game object whose torch light should be updated.
   */
  public updateLightState(object: Nillable<GameObject>): void {
    if (!object) {
      return;
    }

    const torch: Nillable<GameObject> = object.object(misc.device_torch);
    const isCurrentlyIndoor: boolean = isUndergroundLevel(level.name());

    if (!torch) {
      return;
    }

    let light: boolean = false;
    let forced: boolean = false;

    /*
      if (benchmark.light) {
        light = true;
        forced = true;
      }
     */

    if (!object.alive()) {
      light = false;
      forced = true;
    }

    if (!forced) {
      for (const [, manager] of registry.lightZones) {
        [light, forced] = manager.checkStalker(object);

        if (forced) {
          break;
        }
      }
    }

    if (!forced) {
      const htime = level.get_time_hours();

      if (htime <= 4 || htime >= 22) {
        light = true;
      }

      if (!light) {
        if (isCurrentlyIndoor) {
          light = true;
        }
      }
    }

    if (!forced && light) {
      const scheme: EScheme = registry.objects.get(object.id()).activeScheme!;

      if (scheme === EScheme.CAMPER || scheme === EScheme.SLEEPER) {
        light = false;
        forced = true;
      }
    }

    if (!forced && light) {
      if ($isNotNil(object.best_enemy()) && !isCurrentlyIndoor) {
        light = false;
      }
    }

    torch.enable_attachable_item(light);
  }

  public override net_save_relevant(): boolean {
    return true;
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, StalkerBinder.__name);

    super.save(packet);
    saveObjectLogic(this.object, packet);

    getManager(TradeManager).saveObjectState(this.object, packet);
    getManager(SoundManager).saveObject(this.object, packet);
    getManager(DialogManager).saveObjectDialogs(this.object, packet);

    closeSaveMarker(packet, StalkerBinder.__name);
  }

  public override load(reader: NetReader): void {
    this.isLoaded = true;

    openLoadMarker(reader, StalkerBinder.__name);

    super.load(reader);
    loadObjectLogic(this.object, reader);

    getManager(TradeManager).loadObjectState(this.object, reader);
    getManager(SoundManager).loadObject(this.object, reader);
    getManager(DialogManager).loadObjectDialogs(this.object, reader);

    closeLoadMarker(reader, StalkerBinder.__name);
  }

  /**
   * Setup binder callback on going online.
   */
  public setupCallbacks(): void {
    this.object.set_patrol_extrapolate_callback(this.onPatrolExtrapolate, this);
    this.object.set_callback(callback.hit, this.onHit, this);
    this.object.set_callback(callback.death, this.onDeath, this);
    this.object.set_callback(callback.use_object, this.onUse, this);
    this.object.set_callback(callback.sound, this.onHearSound, this);
  }

  /**
   * Reset callbacks and unsubscribe from events on going offline.
   */
  public resetCallbacks(): void {
    this.object.set_patrol_extrapolate_callback(null);
    this.object.set_callback(callback.hit, null);
    this.object.set_callback(callback.death, null);
    this.object.set_callback(callback.use_object, null);
    this.object.set_callback(callback.sound, null);
  }

  /**
   * On stalker hear sound.
   * Handle surrounding sounds and process danger / aggression / condlists based on sound type and power.
   *
   * @param object - Game object hearing sounds.
   * @param sourceId - ID of object producing sound.
   * @param soundType - Mask object with types of sounds heard.
   * @param soundPosition - Vector with 3d position of sounds source.
   * @param soundPower - Power level of sound.
   */
  public onHearSound(
    object: GameObject,
    sourceId: TNumberId,
    soundType: TSoundType,
    soundPosition: Vector,
    soundPower: TRate
  ): void {
    // Don't handle own sounds.
    if (sourceId === object.id()) {
      return;
    }

    // Don't handle sounds when dead.
    if (!object.alive()) {
      return;
    }

    SchemeHear.onObjectHearSound(object, sourceId, soundType, soundPosition, soundPower);
  }

  /**
   * Handle stalker death event by emitting scheme events, cleaning up registries and updating ranking.
   *
   * @param victim - Game object that died.
   * @param who - Source object that caused the death, if known.
   */
  public onDeath(victim: GameObject, who: Nillable<GameObject>): void {
    const object: GameObject = this.object;
    const state: IRegistryObjectState = this.state;

    logger.info("Stalker death: %s", object.name());

    this.onHit(victim, 1, ZERO_VECTOR, who, -1);

    registry.actorCombat.delete(object.id());

    setupObjectInfoPortions(object, state.ini, readIniString(state.ini, state.sectionLogic, "known_info", false));

    if (state.stateController) {
      state.stateController.animationController.setState(null, true);
    }

    this.updateLightState(object);

    if (hasSchemeState(state, EScheme.REACH_TASK)) {
      emitSchemeEvent(getSchemeStateOptimistic(state, EScheme.REACH_TASK), ESchemeEvent.DEATH, victim, who);
    }

    if (hasSchemeState(state, EScheme.DEATH)) {
      emitSchemeEvent(getSchemeStateOptimistic(state, EScheme.DEATH), ESchemeEvent.DEATH, victim, who);
    }

    if (hasActiveScheme(state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(state), ESchemeEvent.DEATH, victim, who);
    }

    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, object, who);

    unregisterHelicopterEnemy(this.helicopterEnemyIndex!);
    unregisterStalker(this, false);

    this.resetCallbacks();

    // todo: Is it still needed? Probably should be handled with some ranking manager after re-implementation.
    if ($isNotNil(actor_stats.remove_from_ranking)) {
      const community: TCommunity = getObjectCommunity(object);

      if (community !== communities.zombied && community !== communities.monolith) {
        actor_stats.remove_from_ranking(object.id());
      }
    }
  }

  /**
   * Handle stalker use event by triggering interaction, meeting and active scheme use logic.
   *
   * @param object - Game object being used.
   * @param who - Game object performing the use action.
   */
  public onUse(object: GameObject, who: GameObject): void {
    logger.info("Stalker used: %s by %s", this.object.name(), who.name());

    if (this.object.alive()) {
      EventsManager.emitEvent(EGameEvent.STALKER_INTERACTION, object, who);
      getManager(DialogManager).resetObjectPhrases(this.object.id());

      activateMeetWithObject(object);

      if (hasActiveScheme(this.state)) {
        emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.USE, object, who);
      }
    }
  }

  /**
   * Handle patrol extrapolate event by forwarding it to the active scheme and patrol controller.
   *
   * @param pointIndex - Index of the patrol point being extrapolated.
   * @returns Whether the patrol point has no flags set.
   */
  public onPatrolExtrapolate(pointIndex: TIndex): boolean {
    if (hasActiveScheme(this.state) && $isNotNil(this.state.patrolController)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.EXTRAPOLATE, pointIndex);
      this.state.patrolController.onExtrapolate(this.object, pointIndex);
    }

    return new patrol(this.object.patrol() as TName).flags(pointIndex).get() === 0;
  }

  /**
   * Handle stalker hit event.
   *
   * @param object - Game object being hit.
   * @param amount - Value of damage received, ranges from 0 to 100 in usual cases.
   * @param direction - Vector of hit direction.
   * @param who - Source of damage.
   * @param boneIndex - Index of bone bing hit.
   */
  public onHit(
    object: GameObject,
    amount: TRate,
    direction: Vector,
    who: Nillable<GameObject>,
    boneIndex: TIndex
  ): void {
    const state: IRegistryObjectState = this.state;

    // On attack by actor verify if alert is needed.
    if (who?.id() === ACTOR_ID && amount > 0) {
      syncObjectHitSmartTerrainAlert(object);
    }

    if (hasActiveScheme(state)) {
      emitSchemeEvent(
        getActiveSchemeStateOptimistic(state),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }

    if (hasSchemeState(state, EScheme.COMBAT_IGNORE)) {
      emitSchemeEvent(
        getSchemeStateOptimistic(state, EScheme.COMBAT_IGNORE),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }

    if (hasSchemeState(state, EScheme.COMBAT)) {
      emitSchemeEvent(
        getSchemeStateOptimistic(state, EScheme.COMBAT),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }

    if (hasSchemeState(state, EScheme.HIT)) {
      emitSchemeEvent(
        getSchemeStateOptimistic(state, EScheme.HIT),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }

    if (boneIndex !== 15 && amount > object.health * 100) {
      object.health = 0.15;
    }

    if (amount > 0) {
      getSchemeStateOptimistic(state, EScheme.WOUNDED).woundController.onHit();
    }

    EventsManager.emitEvent(EGameEvent.STALKER_HIT, object, amount, direction, who, boneIndex);
  }
}
