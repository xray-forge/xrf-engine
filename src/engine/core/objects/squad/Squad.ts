import { CALifeSmartTerrainTask, cse_alife_online_offline_group, LuabindClass, time_global } from "xray16";
import { ALifeSmartTerrainTask, GameObject, NetPacket, ServerCreatureObject, ServerObject, Vector } from "xray16/alias";
import {
  abort,
  FALSE,
  LuaArray,
  MAX_ALIFE_ID,
  NIL,
  Nillable,
  StringNillable,
  TCount,
  TIndex,
  TName,
  TNumberId,
  TRate,
  TRUE,
  TSection,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { TCommunity } from "@/engine/constants/communities";
import {
  closeLoadMarker,
  closeSaveMarker,
  openLoadMarker,
  openSaveMarker,
  registerObjectStoryLinks,
  registerSimulationObject,
  registry,
  softResetOfflineObject,
  SYSTEM_INI,
  unregisterSimulationObject,
  unregisterStoryLinkByObjectId,
  updateSimulationObjectAvailability,
} from "@/engine/core/database";
import {
  parseConditionsList,
  parseStringsList,
  pickSectionFromCondList,
  readIniBoolean,
  readIniNumber,
  readIniString,
  TConditionList,
} from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { removeSquadMapSpot, updateSquadMapSpot } from "@/engine/core/managers/map/utils";
import { simulationActivities } from "@/engine/core/managers/simulation/activity";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ESimulationTerrainRole, ISimulationTarget, TSimulationObject } from "@/engine/core/managers/simulation/types";
import {
  getSimulationTerrainByName,
  getSimulationTerrainDescriptorById,
  getSimulationTerrains,
} from "@/engine/core/managers/simulation/utils/simulation_data";
import { getSquadSimulationTarget } from "@/engine/core/managers/simulation/utils/simulation_priority";
import {
  assignSimulationSquadToTerrain,
  registerSimulationSquad,
  releaseSimulationSquad,
  unRegisterSimulationSquad,
} from "@/engine/core/managers/simulation/utils/simulation_squads";
import { StoryPlaybackController } from "@/engine/core/managers/sounds/stories";
import { getStoryPlayback } from "@/engine/core/managers/sounds/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { SMART_TERRAIN_MASKS_LTX } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { SquadReachTargetAction, SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { ESquadActionType, ISquadAction } from "@/engine/core/objects/squad/squad_types";
import { SQUAD_BEHAVIOURS_LTX } from "@/engine/core/objects/squad/SquadConfig";
import { isSmartTerrain, isSquad } from "@/engine/core/utils/class_ids";
import { LuaLogger } from "@/engine/core/utils/logging";
import { areObjectsOnSameLevel } from "@/engine/core/utils/position";
import { ERelation, setObjectSympathy } from "@/engine/core/utils/relation";
import { getSquadHelpActorTargetId, updateSquadInvulnerabilityState } from "@/engine/core/utils/squad";
import { isInNoCombatZone, isInNoWeaponBase } from "@/engine/core/utils/zone";

const logger: LuaLogger = new LuaLogger($filename);
const simulationLogger: LuaLogger = new LuaLogger($filename, { file: "simulation" });

/**
 * Server object implementation for squad groups.
 */
@LuabindClass()
export class Squad extends cse_alife_online_offline_group implements ISimulationTarget {
  public readonly storyPlayback: StoryPlaybackController = getStoryPlayback(`squad_${this.section_name()}`);

  public isSimulationAvailableConditionList: TConditionList = parseConditionsList(TRUE);
  public isMapDisplayHidden: boolean = false;
  public isAlwaysArrived: boolean = false;
  public isLocationMasksResetNeeded: boolean = true;
  public isSpotVisible: Nillable<TConditionList> = null;

  // Faction for simulation (behaviour community) like monster_day/night etc.
  public faction: TCommunity;
  public behaviour: LuaTable<string, string> = new LuaTable();

  public simulationProperties!: LuaTable<TName, TRate>;

  // Meta-info about spawn point of the squad.
  // Used to track each point spawning limits.
  public respawnPointId: Nillable<TNumberId> = null;
  public respawnPointSection: Nillable<TSection> = null;

  public currentMapSpotId: Nillable<TNumberId> = null;
  public currentMapSpotSection: Nillable<TName> = null;

  public currentAction: Nillable<ISquadAction> = null;
  public currentTargetId: Nillable<TNumberId> = null; // Target squad currently stays on.

  // Cached simulation task, recreated only when the squad moves to another graph vertex.
  public simulationTask: Nillable<ALifeSmartTerrainTask> = null;
  public simulationTaskGameVertexId: Nillable<TNumberId> = null;
  public simulationTaskLevelVertexId: Nillable<TNumberId> = null;

  // Next allowed time for the throttled "squad target outranks terrain" rescan, transient.
  public nextTargetOutrankCheckAt: TTimestamp = 0;

  public assignedTerrainId: Nillable<TNumberId> = null; // ID of linked smart terrain.
  public assignedTargetId: Nillable<TNumberId> = null; // Target squad should reach.

  public nextTargetIndex: Nillable<TIndex> = null;
  public lastTarget: Nillable<string> = null;
  public parsedTargets: LuaArray<TName> = new LuaTable();

  public invulnerabilityConditionList: Nillable<TConditionList> = null;

  public targetConditionList: TConditionList = new LuaTable();
  public deathConditionList: Nillable<TConditionList> = null;

  public sympathy: Nillable<TCount> = null;
  public relationship: Nillable<ERelation> = null;

  public constructor(section: TSection) {
    super(section);

    this.targetConditionList = parseConditionsList(readIniString(SYSTEM_INI, section, "target_smart", false, null, ""));
    this.deathConditionList = parseConditionsList(readIniString(SYSTEM_INI, section, "on_death", false, null, ""));
    this.invulnerabilityConditionList = parseConditionsList(
      readIniString(SYSTEM_INI, section, "invulnerability", false, null, "")
    );

    this.faction = readIniString(SYSTEM_INI, section, "faction", true) as TCommunity;
    this.relationship = this.relationship || readIniString(SYSTEM_INI, section, "relationship", false);
    this.sympathy = readIniNumber(SYSTEM_INI, section, "sympathy", false, null);
    this.isSpotVisible = parseConditionsList(readIniString(SYSTEM_INI, section, "show_spot", false, null, FALSE));
    this.isAlwaysArrived = readIniBoolean(SYSTEM_INI, section, "always_arrived", false);

    this.setLocationTypesMaskFromSection("stalker_terrain");
    this.updateSympathy();

    const behaviourSection: TSection = readIniString(
      SYSTEM_INI,
      this.section_name(),
      "behaviour",
      false,
      null,
      this.faction
    );

    if (!SQUAD_BEHAVIOURS_LTX.section_exist(behaviourSection)) {
      abort("There is no section [" + behaviourSection + "] in 'squad_behaviours.ltx'");
    }

    for (const it of $range(0, SQUAD_BEHAVIOURS_LTX.line_count(behaviourSection) - 1)) {
      const [, name, conditionsList] = SQUAD_BEHAVIOURS_LTX.r_line(behaviourSection, it, "", "");

      this.behaviour.set(name, conditionsList);
    }
  }

  public override update(): void {
    super.update();

    updateSquadMapSpot(this);
    this.storyPlayback.update();

    updateSimulationObjectAvailability(this);
    updateSquadInvulnerabilityState(this);

    const scriptTarget: Nillable<TNumberId> = this.getScriptedSimulationTarget();

    if (scriptTarget) {
      this.updateCurrentScriptedAction(scriptTarget);
    } else {
      this.updateCurrentGenericAction();
    }

    if (this.isLocationMasksResetNeeded) {
      this.setLocationTypes();
      this.isLocationMasksResetNeeded = false;
    }
  }

  /**
   * Update squad action when no scripted target is set, using generic priority-based simulation targeting.
   */
  public updateCurrentGenericAction(): void {
    const helpTargetId: Nillable<TNumberId> = getSquadHelpActorTargetId(this);

    // Try to help actor if can.
    if ($isNotNil(helpTargetId) && helpTargetId !== this.assignedTargetId) {
      simulationLogger.info("Assign squad new help target id: %s %s", this.name(), helpTargetId);

      this.currentAction?.finalize();
      this.currentAction = null;
      this.assignedTargetId = helpTargetId;
      this.selectNewAction(false);

      return;
    }

    // If currently assigned to a non-squad target but priority selection now yields a squad target,
    // switch to it instead of waiting for the current action to finish.
    // The full-registry rescan behind this check is throttled per squad with deterministic stagger -
    // target loss, help calls and action completion still react immediately in the other branches.
    if ($isNotNil(this.assignedTargetId)) {
      const now: TTimestamp = time_global();

      if (now >= this.nextTargetOutrankCheckAt) {
        this.nextTargetOutrankCheckAt = now + simulationConfig.SQUAD_TARGET_OUTRANK_RECHECK_INTERVAL + (this.id % 500);

        const assignedTarget: Nillable<ServerObject> = registry.simulator.object(this.assignedTargetId);

        if (assignedTarget && !isSquad(assignedTarget)) {
          const squadTarget: Nillable<TSimulationObject> = getSquadSimulationTarget(this);

          if (squadTarget && isSquad(squadTarget as ServerObject)) {
            this.assignedTargetId = squadTarget.id;
            this.currentAction = null;
            this.selectNewAction(true);

            return;
          }
        }
      }
    }

    // Have target and action, update it until it is finished.
    if (this.currentAction && this.isAssignedTargetAvailable()) {
      const isFinished: boolean = this.currentAction.update(true);

      if (isFinished) {
        simulationLogger.info(
          "Finished task, search for new: '%s' '%s' '%s'",
          this.name(),
          this.currentAction.type,
          this.assignedTargetId
        );

        this.currentAction.finalize();

        // Leave reaching target as assigned to stay for some time.
        this.assignedTargetId =
          this.currentAction.type === ESquadActionType.REACH_TARGET
            ? this.assignedTargetId
            : getSquadSimulationTarget(this)!.id;

        this.currentAction = null;
        this.selectNewAction(true);
      }

      // Continue previous action execution.
    } else {
      this.currentAction?.finalize();
      this.currentAction = null;
      this.currentTargetId = null;
      this.assignedTargetId = getSquadSimulationTarget(this)!.id;
      this.selectNewAction(true);
    }
  }

  /**
   * Update squad action to follow a scripted target, selecting a new action when the current one finishes or differs.
   *
   * @param scriptTarget - ID of the scripted simulation target the squad should head to.
   */
  public updateCurrentScriptedAction(scriptTarget: TNumberId): void {
    let isNewActionNeeded: boolean = false;

    if ($isNotNil(this.assignedTargetId) && this.assignedTargetId === scriptTarget) {
      if (this.currentAction) {
        if (this.currentAction.type === ESquadActionType.STAY_ON_TARGET) {
          if (this.isOnAssignedTarget()) {
            isNewActionNeeded = true;
          } else {
            isNewActionNeeded = this.currentAction!.update(false);
          }
        } else {
          if (this.currentAction.update(false)) {
            this.isOnAssignedTarget();
            isNewActionNeeded = true;
          }
        }
      } else {
        this.isOnAssignedTarget();
        isNewActionNeeded = true;
      }
    } else {
      isNewActionNeeded = true;
    }

    if (isNewActionNeeded) {
      this.assignedTargetId = scriptTarget;

      if (this.currentAction) {
        this.currentAction.finalize();
        this.currentAction = null;
      }

      this.selectNewAction(false);
    }
  }

  public override STATE_Write(packet: NetPacket): void {
    super.STATE_Write(packet);

    openSaveMarker(packet, Squad.__name);

    packet.w_stringZ(tostring(this.currentTargetId));
    packet.w_stringZ(tostring(this.respawnPointId));
    packet.w_stringZ(tostring(this.respawnPointSection));
    packet.w_stringZ(tostring(this.assignedTerrainId));

    closeSaveMarker(packet, Squad.__name);
  }

  public override STATE_Read(packet: NetPacket, size: TCount): void {
    super.STATE_Read(packet, size);

    openLoadMarker(packet, Squad.__name);

    const currentTargetId: StringNillable = packet.r_stringZ();

    this.currentTargetId = currentTargetId === NIL ? null : (tonumber(currentTargetId) as TNumberId);

    const respawnPointId: StringNillable = packet.r_stringZ();

    this.respawnPointId = respawnPointId === NIL ? null : (tonumber(respawnPointId) as TNumberId);
    this.respawnPointSection = packet.r_stringZ();

    if (this.respawnPointSection === NIL) {
      this.respawnPointSection = null;
    }

    const terrainId: StringNillable = packet.r_stringZ();

    this.assignedTerrainId = terrainId === NIL ? null : (tonumber(terrainId) as TNumberId);

    logger.info("Initialize squad on load: %s", this.name());

    this.updateSympathy();
    assignSimulationSquadToTerrain(this, this.assignedTerrainId);
    this.isLocationMasksResetNeeded = true;

    closeLoadMarker(packet, Squad.__name);
  }

  public override on_register(): void {
    super.on_register();

    registerSimulationSquad(this);
    registerObjectStoryLinks(this);
    registerSimulationObject(this);

    EventsManager.emitEvent(EGameEvent.SQUAD_REGISTERED, this);
  }

  public override on_unregister(): void {
    super.on_unregister();

    unregisterStoryLinkByObjectId(this.id);
    unregisterSimulationObject(this);

    unRegisterSimulationSquad(this);
    assignSimulationSquadToTerrain(this, null);

    // todo: Method for smart terrain onSpawnedSquadKilled.
    if ($isNotNil(this.respawnPointId)) {
      const terrain: Nillable<SmartTerrain> = registry.simulator.object(this.respawnPointId) as Nillable<SmartTerrain>;

      if (terrain) {
        terrain.spawnedSquadsList.get(this.respawnPointSection!).num -= 1;
      }
    }

    EventsManager.emitEvent(EGameEvent.SQUAD_UNREGISTERED, this);
  }

  /**
   * Resolve the alife smart terrain task for the squad, preferring the commander job task when assigned to a terrain.
   *
   * @returns Smart terrain task the squad should currently execute.
   */
  public override get_current_task(): CALifeSmartTerrainTask {
    const target: Nillable<TSimulationObject> = $isNotNil(this.assignedTargetId)
      ? registry.simulator.object(this.assignedTargetId)
      : null;

    if (target && isSmartTerrain(target)) {
      const commanderId: TNumberId = this.commander_id();

      if (
        !target.arrivingObjects.get(commanderId) &&
        target.objectJobDescriptors &&
        target.objectJobDescriptors.get(commanderId) &&
        target.objectJobDescriptors.get(commanderId).jobId &&
        target.jobs.get(target.objectJobDescriptors.get(commanderId).jobId)
      ) {
        return target.objectJobDescriptors.get(this.commander_id()).job!.alifeTask as CALifeSmartTerrainTask;
      }

      return target.getSimulationTask();
    }

    return this.getSimulationTask();
  }

  /**
   * Handling logics of strictly defined simulation targets for some squads.
   * Usually logics is handled by generic evaluator and is based on priority, but sum squads need different behaviour.
   * As example, squad on start of original COP always will go to actor spawn point.
   * Some squads can rotate over few smart terrains and completely ignore priorities.
   *
   * @returns Target ID assigned for smart by condlists from ltx script configuration.
   */
  public getScriptedSimulationTarget(): Nillable<TNumberId> {
    const newTarget: Nillable<TSection> = pickSectionFromCondList(registry.actor, this, this.targetConditionList);

    if ($isNil(newTarget)) {
      return null;
    }

    if (newTarget !== this.lastTarget) {
      this.lastTarget = newTarget;
      this.parsedTargets = parseStringsList(newTarget);
      this.nextTargetIndex = 1;
    }

    if ($isNil(this.parsedTargets.get(this.nextTargetIndex as TNumberId))) {
      this.nextTargetIndex = 1;
    }

    let nextTargetName: StringNillable<TName> = this.parsedTargets.get(this.nextTargetIndex as TNumberId);

    if (nextTargetName === NIL) {
      return null;
    } else if (nextTargetName === "loop") {
      // Support logics of looping over squad targets over and over.
      // In case if a->b->c path proceeded, go back to a and retry again.
      this.nextTargetIndex = 1;
      nextTargetName = this.parsedTargets.get(this.nextTargetIndex as TNumberId);
    }

    return (getSimulationTerrainByName(nextTargetName) as SmartTerrain).id;
  }

  /**
   * Check whether the squad reached its currently assigned terrain target and advance to the next target in the list.
   *
   * Todo: Has side effect.
   *
   * Check if currently assigned target is assigned as smart terrain.
   * If yes, switch to next smart terrain target in the list.
   *
   * @returns Whether the squad is on the assigned terrain target and a next target exists.
   */
  public isOnAssignedTarget(): boolean {
    if ($isNil(this.parsedTargets)) {
      return true;
    }

    const nextTargetId: TNumberId = (this.nextTargetIndex ?? 0) + 1;

    if ($isNotNil(this.assignedTargetId) && this.assignedTargetId === this.assignedTerrainId) {
      if (this.parsedTargets.has(nextTargetId)) {
        this.nextTargetIndex = nextTargetId;

        return true;
      }
    }

    return false;
  }

  /**
   * Check whether squad assigned target available.
   *
   * @returns If currently assigned target written in field is available and can be reached in simulation.
   */
  public isAssignedTargetAvailable(): boolean {
    return this.assignedTargetId
      ? registry.simulator.object<TSimulationObject>(this.assignedTargetId)?.isValidSimulationTarget(this, true) ===
          true
      : false;
  }

  /**
   * Clear assigned to the squad target.
   */
  public clearAssignedTarget(): void {
    simulationLogger.info("Clear squad assigned target: '%s' x '%s'", this.name(), this.assignedTargetId);
    this.assignedTargetId = null;
  }

  /**
   * Select and initialize a new squad action, staying on the target if reached or moving to reach it otherwise.
   *
   * @param isUnderSimulation - Whether the new action is initialized while the squad is under simulation.
   */
  public selectNewAction(isUnderSimulation: boolean): void {
    const squadTarget: Nillable<TSimulationObject> = registry.simulator.object<TSimulationObject>(
      this.assignedTargetId!
    );

    if ($isNil(this.currentTargetId)) {
      if (!squadTarget || squadTarget.isReachedBySimulationObject(this)) {
        if (squadTarget) {
          // todo: Probably should be revisited.
          squadTarget.onSimulationTargetSelected(this);
          squadTarget.onSimulationTargetDeselected(this);
        }

        this.currentTargetId = this.assignedTargetId;
        this.currentAction = new SquadStayOnTargetAction(this);
        this.currentAction.initialize(isUnderSimulation);

        return;
      }
    }

    if (this.assignedTargetId === this.currentTargetId || $isNil(this.assignedTargetId)) {
      this.currentAction = new SquadStayOnTargetAction(this);
      this.currentTargetId = this.assignedTargetId;
      this.currentAction.initialize(isUnderSimulation);
    } else {
      this.currentAction = new SquadReachTargetAction(this);
      this.currentAction.initialize(isUnderSimulation);
    }
  }

  /**
   * Move a squad member from its old smart terrain registration to the newly assigned terrain.
   *
   * @param memberId - ID of the squad member object to reassign.
   * @param terrain - Smart terrain to register the member in, or null to leave it unregistered.
   * @param oldTerrainId - ID of the terrain the member was previously registered in, if any.
   */
  public assignMemberToTerrain(
    memberId: TNumberId,
    terrain: Nillable<SmartTerrain>,
    oldTerrainId: Nillable<TNumberId>
  ): void {
    const object: Nillable<ServerCreatureObject> = registry.simulator.object(memberId);

    if (object) {
      if (object.m_smart_terrain_id === this.assignedTerrainId) {
        return;
      }

      if (
        $isNotNil(oldTerrainId) &&
        oldTerrainId !== MAX_ALIFE_ID &&
        object.m_smart_terrain_id === oldTerrainId &&
        getSimulationTerrainDescriptorById(oldTerrainId)
      ) {
        // todo: Simplify IF with .? operator.
        getSimulationTerrainDescriptorById(oldTerrainId)!.terrain.unregister_npc(object);
      }

      if (terrain) {
        terrain.register_npc(object);
      }
    }
  }

  /**
   * Assign the squad and all of its members to a smart terrain, updating the previous terrain registration.
   *
   * @param terrain - Smart terrain to assign the squad to, or null to clear the assignment.
   */
  public assignToTerrain(terrain: Nillable<SmartTerrain>): void {
    const oldTerrainId: TNumberId = this.assignedTerrainId!;

    this.assignedTerrainId = terrain && terrain.id;

    for (const squadMember of this.squad_members()) {
      this.assignMemberToTerrain(squadMember.id, terrain, oldTerrainId);
    }
  }

  /**
   * Add a location type to the squad from the first line of the provided masks section, if the section exists.
   *
   * @param section - Smart terrain masks section to read the location type from.
   */
  public setLocationTypesMaskFromSection(section: TSection): void {
    if (SMART_TERRAIN_MASKS_LTX.section_exist(section)) {
      const [, field] = SMART_TERRAIN_MASKS_LTX.r_line(section, 0, "", "");

      this.add_location_type(field);
    }
  }

  /**
   * Reset and recompute the squad location type masks based on its assigned target terrain or all simulation terrains.
   *
   * @param newLocationSection - Nillable extra masks section to apply when targeting a smart terrain.
   */
  public setLocationTypes(newLocationSection?: TSection): void {
    this.clear_location_types();

    if (isSmartTerrain(registry.simulator.object(this.assignedTargetId as TNumberId) as ServerObject)) {
      // Targeting a smart terrain: stalker terrain mask plus the old/new terrain sections.
      this.setLocationTypesMaskFromSection("stalker_terrain");

      const oldTerrainName: Nillable<TName> = this.assignedTerrainId
        ? (registry.simulator.object(this.assignedTerrainId)?.name() as TName)
        : null;

      if (oldTerrainName) {
        this.setLocationTypesMaskFromSection(oldTerrainName);
      }

      if (newLocationSection) {
        this.setLocationTypesMaskFromSection(newLocationSection);
      }
    } else {
      // Targeting a squad or actor: squad terrain mask plus all base smart terrains.
      this.setLocationTypesMaskFromSection("squad_terrain");

      for (const [terrainName, terrain] of getSimulationTerrains()) {
        const baseRate: Nillable<TRate> = terrain.simulationProperties.get(ESimulationTerrainRole.BASE);

        if (baseRate && baseRate !== 0) {
          this.setLocationTypesMaskFromSection(terrainName);
        }
      }
    }
  }

  /**
   * Add newly spawned squad member.
   *
   * @param section - Object section to create as squad member.
   * @param position - World position of newly spawned member.
   * @param levelVertexId - Assigned level vertex id.
   * @param gameVertexId - Assigned game vertex id.
   * @returns Created squad member object.
   */
  public addMember(
    section: TSection,
    position: Vector,
    levelVertexId: TNumberId,
    gameVertexId: TNumberId
  ): ServerCreatureObject {
    const customData: TName = readIniString(
      SYSTEM_INI,
      section,
      "custom_data",
      false,
      null,
      "misc\\default_custom_data.ltx"
    );

    if (customData !== "misc\\default_custom_data.ltx") {
      logger.info(
        "Incorrect npc_spawn_section used for '%s', you cannot use object with custom_data in squad",
        section
      );
    }

    const object: ServerCreatureObject = registry.simulator.create(section, position, levelVertexId, gameVertexId);

    this.register_member(object.id);
    this.storyPlayback.registerObject(object.id);

    if (
      areObjectsOnSameLevel(object, registry.actorServer) &&
      position.distance_to_sqr(registry.actorServer.position) <= Math.pow(registry.simulator.switch_distance(), 2)
    ) {
      registry.spawnedVertexes.set(object.id, levelVertexId);
    }

    return object;
  }

  /**
   * Update objects sympathy between objects within squad.
   *
   * @param sympathy - Target sympathy level to set with between squad members.
   */
  public updateSympathy(sympathy: Nillable<TCount> = this.sympathy): void {
    if (!sympathy) {
      return;
    }

    for (const member of this.squad_members()) {
      const object: Nillable<GameObject> = registry.objects.get(member.id)?.object as Nillable<GameObject>;

      if (object) {
        setObjectSympathy(object, sympathy);
      } else {
        registry.goodwill.sympathy.set(member.id, sympathy);
      }
    }
  }

  /**
   * Handle release of the squad members by the simulation, before the engine unregisters the empty squad.
   */
  public onReleased(): void {
    removeSquadMapSpot(this);

    EventsManager.emitEvent(EGameEvent.SQUAD_RELEASED, this);
  }

  /**
   * Callback to handle death of squad members.
   *
   * @param object - Object facing death event.
   */
  public onMemberDeath(object: ServerObject): void {
    simulationLogger.info("On squad member death: %s %s", this.name(), object.name());

    this.storyPlayback.unregisterObject(object.id);
    this.unregister_member(object.id);

    // Release and finalize squad object.
    if (this.npc_count() === 0) {
      logger.info("Removing empty squad, last member died: %s", this.name());

      if (this.currentAction) {
        this.currentAction.finalize();
        this.currentAction = null;
      }

      if (this.deathConditionList) {
        pickSectionFromCondList(registry.actor, this, this.deathConditionList);
      }

      releaseSimulationSquad(this);
    } else {
      // Synchronize squad map spot to correctly display leader.
      updateSquadMapSpot(this);
    }
  }

  /**
   * @returns Whether squad targeting another squad can be finished since one is eliminated.
   */
  public isReachedBySimulationObject(squad: Squad): boolean {
    return this.npc_count() === 0;
  }

  /**
   * @returns Alife smart terrain task to reach/stay on current object.
   */
  public getSimulationTask(): ALifeSmartTerrainTask {
    if (
      !this.simulationTask ||
      this.simulationTaskGameVertexId !== this.m_game_vertex_id ||
      this.simulationTaskLevelVertexId !== this.m_level_vertex_id
    ) {
      this.simulationTask = new CALifeSmartTerrainTask(this.m_game_vertex_id, this.m_level_vertex_id);
      this.simulationTaskGameVertexId = this.m_game_vertex_id;
      this.simulationTaskLevelVertexId = this.m_level_vertex_id;
    }

    return this.simulationTask;
  }

  /**
   * @returns If current squad can be simulation target for other squads.
   */
  public isSimulationAvailable(): boolean {
    return (
      // Object specific checker.
      pickSectionFromCondList(registry.actor, this, this.isSimulationAvailableConditionList) === TRUE &&
      // Is walking nearby no-combat zone or is inside [not necessary assigned to it].
      !isInNoCombatZone(this) &&
      // Is assigned to base.
      !isInNoWeaponBase(this)
    );
  }

  /**
   * @param squad - Another squad checking availability of current one.
   * @returns Whether current squad is valid simulation target for provided squad.
   */
  public isValidSimulationTarget(squad: Squad): boolean {
    return simulationActivities.get(squad.faction)?.squad?.[this.faction]?.(squad, this) === true;
  }

  /**
   * @param squad - Squad that deselected current one from priority targets.
   */
  public onSimulationTargetDeselected(squad: Squad): void {
    // Nothing to do currently.
  }

  /**
   * @param squad - Squad that selected current one as active target.
   */
  public onSimulationTargetSelected(squad: Squad): void {
    squad.setLocationTypes();

    for (const member of squad.squad_members()) {
      softResetOfflineObject(member.id);
    }

    assignSimulationSquadToTerrain(squad, null);
  }
}
