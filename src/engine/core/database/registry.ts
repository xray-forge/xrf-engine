import type { AlifeSimulator, GameObject, IniFile, ZoneCampfire } from "xray16/alias";
import type { Nillable, TCount, TDistance, TIndex, TName, TNumberId, TRate, TStringId } from "xray16/lib";
import { $fromObject } from "xray16/macros";

import { smartTerrainNames, TSmartTerrainName } from "@/engine/constants/smart_terrain_names";
import { zoneNames } from "@/engine/constants/zone_names";
import type { CampController } from "@/engine/core/ai/camp";
import type { DoorBinder, SignalLightBinder } from "@/engine/core/binders/physic";
import type { AnomalyFieldBinder, AnomalyZoneBinder } from "@/engine/core/binders/zones";
import type {
  IDynamicSaveData,
  IRankDescriptor,
  IRegistryObjectState,
  IRegistryOfflineState,
} from "@/engine/core/database/database_types";
import type { IExtensionsDescriptor } from "@/engine/core/extensions";
import type { TConditionList } from "@/engine/core/ini";
import type { AbstractManager, TAbstractCoreManagerConstructor } from "@/engine/core/managers/abstract";
import type { TSimulationObject } from "@/engine/core/managers/simulation";
import type { ITradeManagerDescriptor } from "@/engine/core/managers/trade";
import type { Actor } from "@/engine/core/objects/creature/Actor";
import type { SmartCover } from "@/engine/core/objects/smart_cover";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { TAbstractSchemeConstructor } from "@/engine/core/schemes/base";
import type { LightController } from "@/engine/core/schemes/restrictor/sr_light";
import type { EScheme } from "@/engine/core/schemes/types";
import type { ERelation } from "@/engine/core/utils/relation";

/**
 * Global-level registry of objects and references.
 * Stores up-to-date game state.
 */
export const registry = {
  musicVolume: 0,
  effectsVolume: 0,
  /**
   * Current simulator, injected on game start.
   */
  simulator: null as unknown as AlifeSimulator,
  /**
   * Current actor, injected on game start.
   */
  actor: null as unknown as GameObject,
  /**
   * Current actor, server object representation.
   */
  actorServer: null as unknown as Actor,
  /**
   * Currently active smart terrain id.
   * If not null, assume actor is in it.
   */
  activeSmartTerrainId: null as Nillable<TNumberId>,
  /**
   * List of active game managers by base class reference.
   */
  managers: new LuaMap<TAbstractCoreManagerConstructor, AbstractManager>(),
  /**
   * List of active game managers by base class name.
   */
  managersByName: new LuaMap<TName, AbstractManager>(),
  /**
   * List of activated schemes in game.
   */
  schemes: new LuaTable<EScheme, TAbstractSchemeConstructor>(),
  /**
   * Session-constant derived facts and engine-mirrored state kept coherent via engine callbacks.
   * Nested containers may be replaced wholesale on invalidation, so always access them through ref.
   */
  cache: {
    /**
     * Memoized condlist for parsing simplification, where key is string data and value is parsed descriptor.
     */
    conditionLists: new LuaMap<string, TConditionList>(),
    /**
     * Mirror of actor info portions state.
     */
    infoPortions: new LuaMap<TName, boolean>(),
    /**
     * Memoized game graph vertex -> level id lookups, constant for the loaded game graph.
     */
    gameVertexLevelIds: new LuaMap<TNumberId, TNumberId>(),
    /**
     * Memoized level id -> level name lookups, constant for the loaded game graph.
     */
    levelNames: new LuaMap<TNumberId, TName>(),
    /**
     * Memoized straight-line graph distances keyed by symmetric vertex pair, growth is bounded.
     */
    graphDistances: new LuaMap<TNumberId, TDistance>(),
    graphDistancesCount: 0 as TCount,
  },
  /**
   * Set of objects in combat with actor.
   */
  actorCombat: new LuaMap<TNumberId, boolean>(),
  /**
   * List of active objects.
   */
  objects: new LuaTable<TNumberId, IRegistryObjectState>(),
  /**
   * Game ranks.
   */
  ranks: {
    /**
     * Whether ranks were initialized from game ini files.
     */
    isInitialized: false,
    /**
     * Memoized stalker ranks list.
     */
    stalker: new LuaMap<TIndex, IRankDescriptor>(),
    /**
     * Memoized monster ranks list.
     */
    monster: new LuaMap<TIndex, IRankDescriptor>(),
    /**
     * Max rank for stalkers.
     */
    maxStalkerRank: null as unknown as IRankDescriptor,
    /**
     * Max rank for monsters.
     */
    maxMonsterRank: null as unknown as IRankDescriptor,
  },
  /**
   * List of offline objects.
   */
  offlineObjects: new LuaMap<TNumberId, IRegistryOfflineState>(),
  /**
   * List of wounded objects.
   */
  objectsWounded: new LuaMap<TNumberId, IRegistryObjectState>(),
  /**
   * List of objects participating in alife simulation.
   */
  simulationObjects: new LuaMap<TNumberId, TSimulationObject>(),
  /**
   * Story objects mapping to match currently spawned object IDs and unique story objects.
   */
  storyLink: {
    sidById: new LuaTable<TNumberId, TStringId>(),
    idBySid: new LuaTable<TStringId, TNumberId>(),
  },
  /**
   * Set of alive stalker IDs for easy filtering and iteration.
   */
  stalkers: new LuaTable<TNumberId, boolean>(),
  /**
   * State of trade.
   */
  trade: new LuaTable<TNumberId, ITradeManagerDescriptor>(),
  /**
   * Camp managers with logic.
   */
  camps: new LuaTable<TNumberId, CampController>(),
  /**
   * List of current zone crows spawned.
   */
  crows: {
    // Used as set.
    storage: new LuaTable<TNumberId, TNumberId>(),
    count: 0,
  },
  /**
   * List of data for game helicopters.
   */
  helicopter: {
    storage: new LuaTable<TNumberId, GameObject>(),
    enemies: new LuaTable<TNumberId, GameObject>(),
    enemyIndex: 0,
  },
  /**
   * Anomaly zones by name.
   */
  anomalyZones: new LuaMap<TName, AnomalyZoneBinder>(),
  /**
   * Anomaly fields by name.
   */
  anomalyFields: new LuaMap<TName, AnomalyFieldBinder>(),
  /**
   * List of data for game artefacts.
   */
  artefacts: {
    ways: new LuaTable<TNumberId, TName>(),
    points: new LuaTable<TNumberId, number>(),
    parentZones: new LuaTable<TNumberId, AnomalyZoneBinder>(),
  },
  /**
   * Goodwill state.
   */
  goodwill: {
    // Delayed sympathy cache of the object to set after going online.
    sympathy: new LuaTable<TNumberId, TRate>(),
    relations: new LuaTable<TNumberId, ERelation>(),
  },
  /**
   * List of active zones by name.
   */
  zones: new LuaTable<TName, GameObject>(),
  /**
   * List of zones under silence restriction, no music is allowed.
   */
  silenceZones: new LuaTable<TNumberId, TName>(),
  /**
   * Set of zones under no weapon restriction.
   */
  noWeaponZones: new LuaTable<TNumberId, boolean>(),
  /**
   * List of light active.
   */
  lightZones: new LuaTable<number, LightController>(),
  /**
   * List of dynamically created ini files by name.
   */
  ini: new LuaMap<TName, IniFile>(),
  /**
   * List of active smart terrains.
   */
  smartTerrains: new LuaTable<TNumberId, SmartTerrain>(),
  /**
   * List of campfires by smart terrain name.
   */
  smartTerrainsCampfires: new LuaTable<TName, LuaTable<TNumberId, ZoneCampfire>>(),
  /**
   * Nearest to actor smart terrain.
   */
  smartTerrainNearest: {
    id: null as Nillable<TNumberId>,
    distanceSqr: math.huge,
  },
  /**
   * List of active smart covers.
   */
  smartCovers: new LuaMap<TName, SmartCover>(),
  /**
   * List of active scripted doors.
   * Mainly used for scripted control of state and animation.
   */
  doors: new LuaTable<TName, DoorBinder>(),
  /**
   * List of save markers.
   */
  saveMarkers: new LuaTable<TName, number>(),
  /**
   * List of signal lights existing.
   */
  signalLights: new LuaTable<TName, SignalLightBinder>(),
  /**
   * List of vertexes with matching IDs of existing objects.
   */
  spawnedVertexes: new LuaTable<TNumberId, TNumberId>(),
  /**
   * Map of no assault zones.
   * - key is name of no assault zone
   * - value is name of the smart terrain.
   */
  noCombatZones: $fromObject<TName, TSmartTerrainName>({
    [zoneNames.zat_a2_sr_no_assault]: smartTerrainNames.zat_stalker_base_smart,
    [zoneNames.jup_a6_sr_no_assault]: smartTerrainNames.jup_a6,
    [zoneNames.jup_b41_sr_no_assault]: smartTerrainNames.jup_b41,
  }),
  /**
   * Set of terrains where combat is disabled.
   */
  noCombatSmartTerrains: $fromObject<TName, boolean>({
    [smartTerrainNames.zat_stalker_base_smart]: true,
    [smartTerrainNames.jup_b41]: true,
    [smartTerrainNames.jup_a6]: true,
    [smartTerrainNames.pri_a16]: true,
  }),
  /**
   * Set of terrains defined as stalker bases.
   */
  baseSmartTerrains: $fromObject<TName, boolean>({
    [smartTerrainNames.zat_stalker_base_smart]: true,
    [smartTerrainNames.jup_a6]: true,
    [smartTerrainNames.pri_a16]: true,
  }),
  /**
   * List of extensions details loaded additionally to the game engine.
   */
  extensions: new LuaTable<TName, IExtensionsDescriptor>(),
  /**
   * Dynamic data stored in separate file with marshal lib.
   */
  dynamicData: {
    event: {},
    extensions: {},
    store: {},
    objects: new LuaTable(),
  } as IDynamicSaveData,
};
