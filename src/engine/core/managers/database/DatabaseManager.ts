import { AnyObject, LuaArray, TName, TNumberId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getManager, IRegistryObjectState, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { getSmartTerrainNameCaption } from "@/engine/core/objects/smart_terrain";

/**
 * Manager that exports registry state for Lua diagnostic dumps.
 */
export class DatabaseManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    const objects: LuaTable<TNumberId | TName, IRegistryObjectState> = new LuaTable();
    const simulationObjects: LuaArray<TName> = new LuaTable();
    const terrains: LuaArray<TName> = new LuaTable();

    let maxObjectId: TNumberId = 0;

    // Display objects by name ID for more context.
    for (const [key, value] of registry.objects) {
      objects.set($isNil(value.object) ? key : `${key}#${value.object.name()}`, value);
      maxObjectId = math.max(maxObjectId, key);
    }

    // Display objects by name ID for more context.
    for (const [key, value] of registry.simulationObjects) {
      table.insert(simulationObjects, `${key}#${value.name()}`);
    }

    // Display terrains with more context.
    for (const [key, value] of registry.smartTerrains) {
      table.insert(terrains, `${key}#${value.name()}#${getSmartTerrainNameCaption(value)}`);
    }

    data[this.constructor.name] = {
      maxObjectId: maxObjectId,
      actor: registry.actor,
      actorServer: registry.actorServer,
      activeSmartTerrainId: registry.activeSmartTerrainId,
      managers: Object.keys(registry.managers).map((it) => it.name),
      schemes: Object.keys(registry.schemes),
      schemesCount: table.size(registry.schemes),
      cacheConditionLists: table.size(registry.cache.conditionLists),
      actorCombat: registry.actorCombat,
      objects: objects,
      objectsCount: table.size(objects),
      offlineObjects: registry.offlineObjects,
      offlineObjectsCount: table.size(registry.offlineObjects),
      objectsWounded: registry.objectsWounded,
      simulationObjects: simulationObjects,
      simulationObjectsCount: table.size(simulationObjects),
      stalkers: registry.stalkers,
      stalkersCount: table.size(registry.stalkers),
      trade: registry.trade,
      tradeCount: table.size(registry.trade),
      camps: registry.camps,
      crows: registry.crows,
      helicopter: registry.helicopter,
      storyLink: registry.storyLink,
      ranks: registry.ranks,
      goodwill: registry.goodwill,
      anomalyZones: registry.anomalyZones,
      anomalyFields: registry.anomalyFields,
      artefacts: registry.artefacts,
      zones: registry.zones,
      zonesCount: table.size(registry.zones),
      noCombatZones: registry.noCombatZones,
      silenceZones: registry.silenceZones,
      noCombatSmartTerrains: registry.noCombatSmartTerrains,
      baseSmartTerrains: registry.baseSmartTerrains,
      noWeaponZones: registry.noWeaponZones,
      lightZones: registry.lightZones,
      cachedIni: Object.keys(registry.ini),
      cachedIniCount: table.size(registry.ini),
      smartTerrains: terrains,
      smartTerrainsCount: table.size(terrains),
      smartTerrainsCampfires: registry.smartTerrainsCampfires,
      smartTerrainNearest: registry.smartTerrainNearest,
      smartTerrainNearestName: registry.smartTerrainNearest.id
        ? registry.simulator.object(registry.smartTerrainNearest.id)?.name
        : null,
      smartCovers: registry.smartCovers,
      smartCoversCount: table.size(registry.smartCovers),
      doors: registry.doors,
      saveMarkersCount: table.size(registry.saveMarkers),
      signalLights: registry.signalLights,
      spawnedVertexes: registry.spawnedVertexes,
      extensions: Object.keys(registry.extensions),
    };

    return data;
  }
}
