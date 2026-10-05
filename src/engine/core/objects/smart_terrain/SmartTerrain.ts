import {
  CALifeSmartTerrainTask,
  cse_alife_smart_zone,
  game,
  getFS,
  ini_file,
  level,
  LuabindClass,
  time_global,
} from "xray16";
import {
  AlifeSimulator,
  ALifeSmartTerrainTask,
  GameObject,
  IniFile,
  NetPacket,
  ServerCreatureObject,
  Time,
} from "xray16/alias";
import {
  abort,
  assert,
  MAX_U8,
  Nillable,
  Nullable,
  readTimeFromPacket,
  TCount,
  TDistance,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TRate,
  TRUE,
  TSection,
  TTimestamp,
  writeTimeToPacket,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { SMART_TERRAIN_SECTION } from "@/engine/constants/sections";
import {
  closeLoadMarker,
  closeSaveMarker,
  IRegistryObjectState,
  openLoadMarker,
  openSaveMarker,
  registerObjectStoryLinks,
  registerSimulationObject,
  registry,
  softResetOfflineObject,
  unregisterSimulationObject,
  unregisterStoryLinkByObjectId,
  updateSimulationObjectAvailability,
} from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import {
  parseConditionsList,
  pickSectionFromCondList,
  readIniBoolean,
  readIniNumber,
  readIniString,
  TConditionList,
} from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateTerrainMapSpot } from "@/engine/core/managers/map/utils";
import { simulationActivities } from "@/engine/core/managers/simulation/activity/simulation_activities";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import {
  ESimulationTargetRejection,
  ESimulationTerrainRole,
  ISimulationActivityDescriptor,
  ISimulationTarget,
} from "@/engine/core/managers/simulation/types";
import {
  assignSimulationSquadToTerrain,
  getSimulationTerrainAssignedSquadsCount,
  initializeSimulationTerrain,
  registerSimulationTerrain,
  setupSimulationObjectSquadAndGroup,
  unregisterSimulationTerrain,
} from "@/engine/core/managers/simulation/utils";
import {
  areNoStalkersWorkingOnJobs,
  createObjectJobDescriptor,
  createTerrainJobs,
  IObjectJobState,
  ISmartTerrainJobDescriptor,
  markTerrainJobsDirty,
  selectTerrainObjectJob,
  TSmartTerrainJobsList,
  unlinkTerrainObjectJob,
  updateTerrainJobs,
} from "@/engine/core/objects/smart_terrain/job";
import { isObjectArrivedToTerrain } from "@/engine/core/objects/smart_terrain/object";
import {
  ESmartTerrainStatus,
  ISmartTerrainSpawnConfiguration,
  ISmartTerrainSpawnItemsDescriptor,
} from "@/engine/core/objects/smart_terrain/smart_terrain_types";
import { SMART_TERRAIN_MASKS_LTX, smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { SmartTerrainControl } from "@/engine/core/objects/smart_terrain/SmartTerrainControl";
import {
  applySmartTerrainRespawnSectionsConfig,
  canRespawnSmartTerrainSquad,
  respawnSmartTerrainSquad,
} from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import type { Squad } from "@/engine/core/objects/squad";
import { initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import { ESchemeType } from "@/engine/core/schemes/types";
import { isMonsterSquad, isStalker } from "@/engine/core/utils/class_ids";
import { ELuaLoggerMode, LuaLogger } from "@/engine/core/utils/logging";
import { areObjectsOnSameLevel } from "@/engine/core/utils/position";
import {
  turnOffSmartTerrainCampfires,
  turnOnTerrainCampfires,
  updateTerrainAlarmStatus,
} from "@/engine/core/utils/smart_terrain";
import { resetTable } from "@/engine/core/utils/table";

const logger: LuaLogger = new LuaLogger($filename, { file: "smart_terrain", mode: ELuaLoggerMode.DUAL });

/**
 * Smart terrain server representation.
 * Handles logics of alife, spawning and jobs simulation.
 */
@LuabindClass()
export class SmartTerrain extends cse_alife_smart_zone implements ISimulationTarget {
  public ini!: IniFile;
  public jobsConfig!: IniFile;
  public jobsConfigName!: TName;

  public squadId: TNumberId = 0; // Squads identifier spawned by specific smart terrain.

  public arrivalDistance: TNumberId = smartTerrainConfig.DEFAULT_ARRIVAL_DISTANCE;
  public simulationProperties!: LuaTable<TName, TRate>;
  public simulationRole: ESimulationTerrainRole = ESimulationTerrainRole.DEFAULT;
  public mapSpot: Nillable<TName> = null; // map spot of terrain to display on PDA map
  public respawnSector: Nillable<TConditionList> = null;
  public forbiddenPoint: string = "";

  public isOnLevel: boolean = false;
  public isRegistered: boolean = false;
  public isRespawnPoint: boolean = false;
  public isObjectsInitializationNeeded: boolean = false; // Whether after game start / load.
  public isSimulationAvailableConditionList: TConditionList = parseConditionsList(TRUE);
  public isMutantDisabled: boolean = false;
  public isMutantLair: boolean = false;
  public isRespawnOnlySmart: boolean = false;
  public areCampfiresOn: boolean = false;

  // If smart terrain is attacked, all active squads will react.
  public alarmStartedAt: Nillable<Time> = null;

  // Whether job assignments require a full selection pass on the next heavy tick, transient.
  public jobsDirty: boolean = true;
  public jobsDirtyReason: Nillable<TLabel> = null;
  // Incremented while a scheduled dirty pass is active to retain invalidations occurring mid-pass.
  public jobsDirtyRevision: TCount = 0;
  // Whether SimulationManager currently owns a queued dirty pass for this terrain.
  public jobsDirtyScheduled: boolean = false;
  // Cached job precondition environment inputs for edge detection, transient.
  public jobsAlarmState: Nillable<boolean> = null;
  public jobsSurgeState: Nillable<boolean> = null;
  public jobsNightState: Nillable<boolean> = null;

  public stayingObjectsCount: TCount = 0; // Count of game object inside smart terrain.
  public maxStayingSquadsCount: TCount = 0; // Maximal count of staying squads.

  public nextJobsUpdateAt: TTimestamp = -1;
  public nextCheckAt: TTimestamp = -1;

  public travelerActorPointName: TName = ""; // Patrol point name to arrive as actor.
  public travelerSquadPointName: TName = ""; // Patrol point name to arrive as squad.

  public defendRestrictor: Nillable<string> = null;
  public attackRestrictor: Nillable<TName> = null;
  public safeRestrictor: Nillable<TName> = null; // Name of restrictor where objects are considered safe.
  public spawnPointName: Nillable<TName> = null; // Name of patrol point override to spawn objects.

  public terrainControl: Nillable<SmartTerrainControl> = null;

  // Stalkers that are entering smart, but still not in correct vertex
  public arrivingObjects: LuaTable<TNumberId, ServerCreatureObject> = new LuaTable();
  public objectsToRegister: LuaTable<TNumberId, ServerCreatureObject> = new LuaTable();

  public smartTerrainAlifeTask!: ALifeSmartTerrainTask;

  // Flat representation of available smart terrain jobs.
  public jobs: TSmartTerrainJobsList = new LuaTable();
  public jobDeadTimeById: LuaTable<TNumberId, Time> = new LuaTable(); // job id -> time
  public objectJobDescriptors: LuaTable<TNumberId, IObjectJobState> = new LuaTable();
  public objectByJobSection: LuaTable<TSection, TNumberId> = new LuaTable();

  // Spawning configuration and state for the smart terrain.
  public lastRespawnUpdatedAt: Nillable<Time> = null;
  public spawnSquadsConfiguration: LuaTable<TSection, ISmartTerrainSpawnConfiguration> = new LuaTable();
  public spawnedSquadsList: LuaTable<TSection, ISmartTerrainSpawnItemsDescriptor> = new LuaTable();

  public override on_before_register(): void {
    super.on_before_register();

    // Register smart in simulation as first priority, other objects may require it for registering.
    registerSimulationTerrain(this);
  }

  public override on_register(): void {
    super.on_register();

    this.isOnLevel = areObjectsOnSameLevel(this, registry.actorServer);

    logger.info("Register smart terrain: %s %s", this.name(), this.isOnLevel);

    registerObjectStoryLinks(this);
    registerSimulationObject(this);

    if (forgeConfig.DEBUG.IS_SIMULATION_ENABLED) {
      updateTerrainMapSpot(this);
    }

    this.nextCheckAt = -1;
    this.nextJobsUpdateAt = -1;
    this.isRegistered = true;
    this.smartTerrainAlifeTask = new CALifeSmartTerrainTask(this.m_game_vertex_id, this.m_level_vertex_id);

    logger.info("Initialize smart jobs: %s", this.name());

    [this.jobs, this.jobsConfig, this.jobsConfigName] = createTerrainJobs(this);

    initializeSimulationTerrain(this);

    if (this.isObjectsInitializationNeeded) {
      this.isObjectsInitializationNeeded = false;
      this.initializeObjectsAfterLoad();
    }

    // Register all delayed objects.
    for (const [, object] of this.objectsToRegister) {
      this.register_npc(object);
    }

    this.objectsToRegister = new LuaTable();

    EventsManager.emitEvent(EGameEvent.SMART_TERRAIN_REGISTER, this);
  }

  public override on_unregister(): void {
    EventsManager.emitEvent(EGameEvent.SMART_TERRAIN_UNREGISTER, this);

    unregisterStoryLinkByObjectId(this.id);
    unregisterSimulationObject(this);
    unregisterSimulationTerrain(this);

    this.isRegistered = false;

    super.on_unregister();
  }

  public override register_npc(object: ServerCreatureObject): void {
    // Calling register npc to smart terrain before registering smart terrain.
    if (this.isRegistered) {
      logger.info("Register object in smart: %s %s", this.name(), object.name());
      this.stayingObjectsCount += 1;
    } else {
      if (this.objectsToRegister.has(object.id)) {
        logger.info("Smart terrain not registered, skip already queued object: %s %s", this.name(), object.name());
      } else {
        logger.info("Smart terrain not registered, delay object: %s %s", this.name(), object.name());

        this.objectsToRegister.set(object.id, object);
      }

      return;
    }

    if (!isStalker(object)) {
      object.smart_terrain_task_activate();
    }

    object.m_smart_terrain_id = this.id;

    // If object arrived, select new job.
    // In other cases track it and wait for arrival.

    if (isObjectArrivedToTerrain(object, this)) {
      // Arrival lifts all dead-time locks so arriving objects are guaranteed to find jobs.
      resetTable(this.jobDeadTimeById);
      this.objectJobDescriptors.set(object.id, createObjectJobDescriptor(object));

      const [jobId, job] = selectTerrainObjectJob(this, this.objectJobDescriptors.get(object.id));

      markTerrainJobsDirty(this, "arrival");

      logger.info("Assign to job on register: %s, %s, %s - %s", this.name(), object.name(), jobId, job?.section);
    } else {
      logger.info("Mark as arriving: %s, %s, %s", this.name(), object.name(), this.stayingObjectsCount);
      this.arrivingObjects.set(object.id, object);
    }
  }

  public override unregister_npc(object: ServerCreatureObject): void {
    logger.info("Unregister object: %s %s %s", this.name(), object.name(), this.stayingObjectsCount);

    this.stayingObjectsCount -= 1;

    const objectJobDescriptor: Nillable<IObjectJobState> = this.objectJobDescriptors.get(
      object.id
    ) as Nillable<IObjectJobState>;

    // If object had assigned job, unlink it.
    // If object was arriving, clear list.
    // Other cases are unexpected.

    if (objectJobDescriptor) {
      unlinkTerrainObjectJob(this, objectJobDescriptor);

      this.objectJobDescriptors.delete(object.id);
      markTerrainJobsDirty(this, "departure");

      object.clear_smart_terrain();

      if ($isNotNil(registry.objects.get(object.id))) {
        const registryState: IRegistryObjectState = registry.objects.get(object.id);

        initializeObjectSchemeLogic(
          registryState.object,
          registryState,
          false,
          isStalker(object) ? ESchemeType.STALKER : ESchemeType.MONSTER
        );
      }
    } else if (this.arrivingObjects.get(object.id) as Nillable<ServerCreatureObject>) {
      this.arrivingObjects.delete(object.id);
      object.clear_smart_terrain();
    } else {
      abort("this.npc_info[obj.id] = null !!! obj.id=%d", object.id);
    }
  }

  public override task(object: ServerCreatureObject): Nullable<CALifeSmartTerrainTask> {
    logger.info("Task: %s %s", this.name(), object.name());

    if (this.arrivingObjects.get(object.id) as Nillable<ServerCreatureObject>) {
      return this.smartTerrainAlifeTask;
    }

    return this.objectJobDescriptors.get(object.id).job?.alifeTask as Nullable<CALifeSmartTerrainTask>;
  }

  public override STATE_Write(packet: NetPacket): void {
    super.STATE_Write(packet);

    openSaveMarker(packet, SmartTerrain.__name);

    packet.w_u8(table.size(this.arrivingObjects));

    for (const [k] of this.arrivingObjects) {
      packet.w_u16(k);
    }

    packet.w_u8(table.size(this.objectJobDescriptors));

    for (const [id, descriptor] of this.objectJobDescriptors) {
      packet.w_u16(id);
      packet.w_u8(descriptor.jobPriority);
      packet.w_u8(descriptor.jobId);
      packet.w_bool(descriptor.isBegun);
      packet.w_stringZ(descriptor.desiredJob);
    }

    packet.w_u8(table.size(this.jobDeadTimeById));

    for (const [id, time] of this.jobDeadTimeById) {
      packet.w_u8(id);
      writeTimeToPacket(packet, time);
    }

    if (this.terrainControl) {
      packet.w_bool(true);
      this.terrainControl.save(packet);
    } else {
      packet.w_bool(false);
    }

    if (this.isRespawnPoint) {
      packet.w_bool(true);
      packet.w_u8(table.size(this.spawnedSquadsList));

      for (const [k, v] of this.spawnedSquadsList) {
        packet.w_stringZ(k);
        packet.w_u8(v.num);
      }

      if ($isNotNil(this.lastRespawnUpdatedAt)) {
        packet.w_bool(true);
        writeTimeToPacket(packet, this.lastRespawnUpdatedAt);
      } else {
        packet.w_bool(false);
      }
    } else {
      packet.w_bool(false);
    }

    if (this.stayingObjectsCount < 0) {
      abort("Smart terrain '%s' population can't be less than zero.", this.name());
    }

    packet.w_u8(this.stayingObjectsCount);

    closeSaveMarker(packet, SmartTerrain.__name);
  }

  public override STATE_Read(packet: NetPacket, size: number): void {
    super.STATE_Read(packet, size);

    openLoadMarker(packet, SmartTerrain.__name);
    this.initialize();

    let count: TCount = packet.r_u8();

    this.arrivingObjects = new LuaTable();

    for (const _ of $range(1, count)) {
      const id: TNumberId = packet.r_u16();

      // Will be updated with init.
      this.arrivingObjects.set(id, false as unknown as ServerCreatureObject);
    }

    count = packet.r_u8();
    this.objectJobDescriptors = new LuaTable();

    for (const _ of $range(1, count)) {
      const id: TNumberId = packet.r_u16();
      const jobDescriptor: IObjectJobState = {} as IObjectJobState;

      this.objectJobDescriptors.set(id, jobDescriptor);

      jobDescriptor.jobPriority = packet.r_u8();

      if (jobDescriptor.jobPriority === MAX_U8) {
        jobDescriptor.jobPriority = -1;
      }

      jobDescriptor.jobId = packet.r_u8();

      if (jobDescriptor.jobId === MAX_U8) {
        jobDescriptor.jobId = -1;
      }

      jobDescriptor.isBegun = packet.r_bool();
      jobDescriptor.desiredJob = packet.r_stringZ();
    }

    count = packet.r_u8();
    this.jobDeadTimeById = new LuaTable();

    for (const _ of $range(1, count)) {
      this.jobDeadTimeById.set(packet.r_u8(), readTimeFromPacket(packet)!);
    }

    this.isObjectsInitializationNeeded = true;

    if (packet.r_bool()) {
      this.terrainControl?.load(packet);
    }

    const isRespawnPoint: boolean = packet.r_bool();

    if (isRespawnPoint) {
      count = packet.r_u8();

      for (const _ of $range(1, count)) {
        this.spawnedSquadsList.set(packet.r_stringZ(), { num: packet.r_u8() });
      }

      this.lastRespawnUpdatedAt = packet.r_bool() ? readTimeFromPacket(packet) : null;
    }

    this.stayingObjectsCount = packet.r_u8();

    closeLoadMarker(packet, SmartTerrain.__name);
  }

  public override update(): void {
    super.update();

    if (this.mapSpot || forgeConfig.DEBUG.IS_SIMULATION_ENABLED) {
      updateTerrainMapSpot(this);
    }

    const now: TTimestamp = time_global();

    // Check smart terrain which is nearest / manage visited state.
    if (areObjectsOnSameLevel(this, registry.actorServer)) {
      const distanceToActorSqr: TDistance = this.position.distance_to_sqr(registry.actorServer.position);

      if (registry.smartTerrainNearest.id === this.id) {
        registry.smartTerrainNearest.distanceSqr = distanceToActorSqr;
      } else if (distanceToActorSqr < registry.smartTerrainNearest.distanceSqr) {
        registry.smartTerrainNearest.id = this.id;
        registry.smartTerrainNearest.distanceSqr = distanceToActorSqr;

        EventsManager.emitEvent(EGameEvent.SMART_TERRAIN_NEAREST_CHANGED, this, distanceToActorSqr);
      }
    }

    if (now < this.nextCheckAt) {
      return;
    }

    if (this.areCampfiresOn && areNoStalkersWorkingOnJobs(this.objectJobDescriptors)) {
      turnOffSmartTerrainCampfires(this);
    } else if (!this.areCampfiresOn && !areNoStalkersWorkingOnJobs(this.objectJobDescriptors)) {
      turnOnTerrainCampfires(this);
    }

    if (registry.actor as Nillable<GameObject>) {
      const distance: TDistance = registry.actor.position().distance_to_sqr(this.position);
      const idleTime: TDuration = math.max(60, 0.003 * distance);

      /*
       * | 0–141.4 m | ≤60 ms |
       * | 150 m | 67.5 ms |
       * | 200 m | 120 ms |
       * | 300 m | 270 ms |
       * | 500 m | 750 ms |
       * | 600 m | 1,080 ms |
       * | 1,000 m | 3,000 ms |
       */

      this.nextCheckAt = now + idleTime;
    } else {
      this.nextCheckAt = now + 10;
    }

    // Game time builds an engine object on every read, so it is read once per check, not on every update.
    const currentGameTime: Time = game.get_game_time();

    if (canRespawnSmartTerrainSquad(this, currentGameTime)) {
      respawnSmartTerrainSquad(this);
    }

    for (const [id, time] of this.jobDeadTimeById) {
      if (currentGameTime.diffSec(time) >= smartTerrainConfig.DEATH_IDLE_TIME) {
        this.jobDeadTimeById.delete(id);
        markTerrainJobsDirty(this, "dead_time_expiry");
      }
    }

    updateTerrainAlarmStatus(this);

    if (updateTerrainJobs(this, now >= this.nextJobsUpdateAt)) {
      this.nextJobsUpdateAt = now + smartTerrainConfig.JOBS_UPDATE_INTERVAL;
    }

    updateSimulationObjectAvailability(this);

    this.terrainControl?.update();
  }

  /**
   * Initialize smart terrain from ini files.
   */
  public initialize(): void {
    this.ini = this.spawn_ini() as IniFile;

    const smartTerrainName: TName = this.name();

    assert(this.ini.section_exist(SMART_TERRAIN_SECTION), "Smart terrain '%s' no configuration.", smartTerrainName);

    const filename: Nillable<TName> = readIniString(this.ini, SMART_TERRAIN_SECTION, "cfg", false);

    if ($isNotNil(filename)) {
      if (getFS().exist(roots.gameConfig, filename)) {
        this.ini = new ini_file(filename);
      } else {
        abort("There is no configuration file [%s] in smart_terrain [%s]", filename, smartTerrainName);
      }
    }

    this.simulationRole = readIniString(
      this.ini,
      SMART_TERRAIN_SECTION,
      "sim_type",
      false,
      null,
      ESimulationTerrainRole.DEFAULT
    ) as ESimulationTerrainRole;

    // Check if role is defined in enum.
    if ($isNil(simulationConfig.VALID_SMART_TERRAINS_SIMULATION_ROLES.get(this.simulationRole))) {
      abort(
        "Wrong simulation role value (sim_type) '%s' in smart terrain '%s' configuration.",
        this.simulationRole,
        smartTerrainName
      );
    }

    this.squadId = readIniNumber(this.ini, SMART_TERRAIN_SECTION, "squad_id", false, 0);

    const respawnSectorData: Nillable<string> = readIniString(this.ini, SMART_TERRAIN_SECTION, "respawn_sector", false);

    this.respawnSector = respawnSectorData
      ? parseConditionsList(respawnSectorData === "default" ? "all" : respawnSectorData)
      : null;

    this.isMutantLair = readIniBoolean(this.ini, SMART_TERRAIN_SECTION, "mutant_lair", false);
    this.isMutantDisabled = readIniBoolean(this.ini, SMART_TERRAIN_SECTION, "no_mutant", false);

    if (this.isMutantDisabled) {
      logger.info("Found no mutant point: %s", smartTerrainName);
    }

    this.forbiddenPoint = readIniString(this.ini, SMART_TERRAIN_SECTION, "forbidden_point", false);
    this.defendRestrictor = readIniString(this.ini, SMART_TERRAIN_SECTION, "def_restr", false);
    this.attackRestrictor = readIniString(this.ini, SMART_TERRAIN_SECTION, "att_restr", false);
    this.safeRestrictor = readIniString(this.ini, SMART_TERRAIN_SECTION, "safe_restr", false);
    this.spawnPointName = readIniString(this.ini, SMART_TERRAIN_SECTION, "spawn_point", false);
    this.arrivalDistance = readIniNumber(
      this.ini,
      SMART_TERRAIN_SECTION,
      "arrive_dist",
      false,
      smartTerrainConfig.DEFAULT_ARRIVAL_DISTANCE
    );

    const maxPopulationData: string = readIniString(
      this.ini,
      SMART_TERRAIN_SECTION,
      "max_population",
      false,
      null,
      "0"
    );

    this.maxStayingSquadsCount = tonumber(
      pickSectionFromCondList(registry.actor, null, parseConditionsList(maxPopulationData))
    ) as TCount;
    this.isRespawnOnlySmart = readIniBoolean(this.ini, SMART_TERRAIN_SECTION, "respawn_only_smart", false, false);

    const respawnSection: Nillable<TSection> = readIniString(this.ini, SMART_TERRAIN_SECTION, "respawn_params", false);
    const smartControlSection: Nillable<TSection> = readIniString(
      this.ini,
      SMART_TERRAIN_SECTION,
      "smart_control",
      false
    );

    if (smartControlSection) {
      this.terrainControl = new SmartTerrainControl(this, this.ini, smartControlSection);
    }

    if (respawnSection) {
      applySmartTerrainRespawnSectionsConfig(this, respawnSection);
    } else {
      this.isRespawnPoint = false;
    }

    this.travelerActorPointName = level.patrol_path_exists(`${smartTerrainName}_traveller_actor`)
      ? `${smartTerrainName}_traveller_actor`
      : "";

    this.travelerSquadPointName = level.patrol_path_exists(`${smartTerrainName}_traveller_squad`)
      ? `${smartTerrainName}_traveller_squad`
      : "";

    if (!SMART_TERRAIN_MASKS_LTX.section_exist(smartTerrainName)) {
      // logger.warn("No terrain_mask section in smart_terrain_masks.ltx:", this.name());
    }
  }

  /**
   * Re-link arriving objects and job descriptors to their server objects after the save game has been loaded.
   */
  public initializeObjectsAfterLoad(): void {
    logger.info("Initialize objects after load: %s", this.name());

    const alifeSimulator: AlifeSimulator = registry.simulator;

    for (const [id] of this.arrivingObjects) {
      const serverObject: Nillable<ServerCreatureObject> = alifeSimulator.object(id);

      if (serverObject) {
        this.arrivingObjects.set(id, serverObject);
      } else {
        this.arrivingObjects.delete(id);
      }
    }

    for (const [objectId, jobDescriptor] of this.objectJobDescriptors) {
      const serverObject: Nillable<ServerCreatureObject> = alifeSimulator.object(objectId);

      if (serverObject) {
        logger.info("Re-init jobs for object: %s %s", this.name(), objectId);

        const newJobDescriptor: IObjectJobState = createObjectJobDescriptor(serverObject);

        newJobDescriptor.jobPriority = jobDescriptor.jobPriority;
        newJobDescriptor.jobId = jobDescriptor.jobId;
        newJobDescriptor.isBegun = jobDescriptor.isBegun;
        newJobDescriptor.desiredJob = jobDescriptor.desiredJob;

        // Job ids are assigned as 1..n list indexes after priority sort, direct access is exact.
        const job: Nillable<ISmartTerrainJobDescriptor> = this.jobs.get(newJobDescriptor.jobId);

        if ($isNotNil(job)) {
          newJobDescriptor.job = job;
          job.objectId = newJobDescriptor.object.id;
        }

        this.objectJobDescriptors.set(objectId, newJobDescriptor);

        if (newJobDescriptor.job) {
          this.objectByJobSection.set(newJobDescriptor.job.section, objectId);
        }
      } else {
        logger.info("Discard jobs for object: %s %s", this.name(), objectId);
        this.objectJobDescriptors.delete(objectId);
        // todo: Also free section?
      }
    }
  }

  /**
   * Handle death of smart terrain assigned object.
   *
   * @param object - Dying object assigned to terrain.
   */
  public onObjectDeath(object: ServerCreatureObject): void {
    logger.info("Clear assigned object on death: %s %s", this.name(), object.name());

    // Object arrived and aws assigned to job.
    if (this.objectJobDescriptors.get(object.id) as Nillable<IObjectJobState>) {
      const objectJobDescriptor: IObjectJobState = this.objectJobDescriptors.get(object.id);

      // Objects may be transiently jobless under lenient job selection.
      if (objectJobDescriptor.job) {
        this.jobDeadTimeById.set(objectJobDescriptor.jobId, game.get_game_time());
        objectJobDescriptor.job.objectId = null;
      }

      this.objectJobDescriptors.delete(object.id);
      markTerrainJobsDirty(this, "death");

      object.clear_smart_terrain();

      return;
    }

    // Object was in process of arriving.
    if (this.arrivingObjects.get(object.id) as Nillable<ServerCreatureObject>) {
      this.arrivingObjects.delete(object.id);

      object.clear_smart_terrain();

      return;
    }

    abort("Smart terrain object is assigned, but not arriving or on job: '%s', at '%s'.", object.name(), this.name());
  }

  /**
   * Check whether the smart terrain can currently participate in the simulation as a target.
   *
   * @returns Whether the configured condition list allows simulation and the terrain is not under alarm control.
   */
  public isSimulationAvailable(): boolean {
    if (pickSectionFromCondList(registry.actor, this, this.isSimulationAvailableConditionList) !== TRUE) {
      return false;
    }

    return !(this.terrainControl && this.terrainControl.status !== ESmartTerrainStatus.NORMAL);
  }

  /**
   * @param squad - Squad checking availability of current smart terrain.
   * @param isPopulationDecreaseNeeded - Whether population decrease should be estimated with check.
   * @returns Whether current smart terrain is valid simulation target for provided squad.
   */
  public isValidSimulationTarget(squad: Squad, isPopulationDecreaseNeeded?: boolean): boolean {
    return $isNil(this.getSimulationTargetRejection(squad, isPopulationDecreaseNeeded));
  }

  /**
   * @param squad - Squad checking availability of current smart terrain.
   * @param isPopulationDecreaseNeeded - Whether population decrease should be estimated with check.
   * @returns Why the terrain is not a valid simulation target for the squad, `null` when it is.
   */
  public getSimulationTargetRejection(
    squad: Squad,
    isPopulationDecreaseNeeded?: boolean
  ): Nillable<ESimulationTargetRejection> {
    if (this.isRespawnOnlySmart) {
      return ESimulationTargetRejection.RESPAWN_ONLY;
    }

    let squadsCount: TCount = getSimulationTerrainAssignedSquadsCount(this.id);

    if (isPopulationDecreaseNeeded) {
      squadsCount -= 1;
    }

    // Cannot select smart as target due to max population constraints.
    if (squadsCount >= this.maxStayingSquadsCount) {
      return ESimulationTargetRejection.FULL;
    }

    const squadParameters: Nillable<ISimulationActivityDescriptor> = simulationActivities.get(squad.faction);

    if (!squadParameters || !squadParameters.smart) {
      return ESimulationTargetRejection.NO_FACTION_RULE;
    }

    if (
      (this.simulationProperties.get(ESimulationTerrainRole.RESOURCE) ?? 0) > 0 &&
      squadParameters.smart.resource?.(squad, this)
    ) {
      return null;
    }

    if (
      (this.simulationProperties.get(ESimulationTerrainRole.BASE) ?? 0) > 0 &&
      squadParameters.smart.base?.(squad, this)
    ) {
      return null;
    }

    if (
      (this.simulationProperties.get(ESimulationTerrainRole.LAIR) ?? 0) > 0 &&
      squadParameters.smart.lair?.(squad, this)
    ) {
      return null;
    }

    if (
      (this.simulationProperties.get(ESimulationTerrainRole.TERRITORY) ?? 0) > 0 &&
      squadParameters.smart.territory?.(squad, this)
    ) {
      return null;
    }

    if (
      (this.simulationProperties.get(ESimulationTerrainRole.SURGE) ?? 0) > 0 &&
      squadParameters.smart.surge?.(squad, this)
    ) {
      return null;
    }

    return ESimulationTargetRejection.NO_ROLE_ALLOWED;
  }

  /**
   * Get the alife task used to direct squads to travel to this smart terrain.
   *
   * @returns Alife smart terrain task representing this terrain as a simulation target.
   */
  public getSimulationTask(): CALifeSmartTerrainTask {
    return this.smartTerrainAlifeTask;
  }

  /**
   * Check whether a squad is close enough to the smart terrain to be considered as having arrived.
   *
   * @param squad - Squad whose distance to the terrain is being evaluated.
   * @returns Whether the squad is on the same level and within the arrival distance of the terrain.
   */
  public isReachedBySimulationObject(squad: Squad): boolean {
    if (!areObjectsOnSameLevel(squad, this)) {
      return false;
    }

    if (isMonsterSquad(squad) && $isNil(squad.getScriptedSimulationTarget())) {
      return squad.position.distance_to_sqr(this.position) <= smartTerrainConfig.DEFAULT_ARRIVAL_DISTANCE;
    }

    return (
      squad.isAlwaysArrived ||
      squad.position.distance_to_sqr(this.position) <= this.arrivalDistance * this.arrivalDistance
    );
  }

  /**
   * Handle selection of the terrain as a simulation target by a squad, resetting members and assigning the squad to it.
   *
   * @param squad - Squad that selected this terrain as its simulation target.
   */
  public onSimulationTargetSelected(squad: Squad): void {
    squad.setLocationTypes(this.name());

    for (const it of squad.squad_members()) {
      softResetOfflineObject(it.id);
    }

    assignSimulationSquadToTerrain(squad, this.id);
  }

  /**
   * Handle deselection of the terrain as a simulation target, re-setting up simulation roles for the squad members.
   *
   * @param squad - Squad that stopped targeting this terrain.
   */
  public onSimulationTargetDeselected(squad: Squad): void {
    for (const squadMember of squad.squad_members()) {
      setupSimulationObjectSquadAndGroup(squadMember.object);
    }

    squad.currentTargetId = this.id;
  }
}
