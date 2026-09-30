import { describe, expect, it } from "@jest/globals";

import { registry } from "@/engine/core/database/registry";

describe("registry storage", () => {
  it("storage to contain all fields", () => {
    expect(Object.keys(registry)).toHaveLength(42);
  });

  it("storage to initialize with correct data", () => {
    expect(registry.simulator).toBeNull();
    expect(registry.actorServer).toBeNull();
    expect(registry.actor).toBeNull();
    expect(registry.activeSmartTerrainId).toBeNull();
    expect(registry.managers).toBeInstanceOf(LuaMap);
    expect(registry.managersByName).toBeInstanceOf(LuaMap);
    expect(registry.schemes).toBeInstanceOf(LuaTable);
    expect(registry.cache.conditionLists).toBeInstanceOf(LuaMap);
    expect(registry.actorCombat).toBeInstanceOf(LuaMap);
    expect(registry.objects).toBeInstanceOf(LuaTable);
    expect(registry.objectsWounded).toBeInstanceOf(LuaMap);
    expect(registry.offlineObjects).toBeInstanceOf(LuaMap);
    expect(registry.simulationObjects).toBeInstanceOf(LuaMap);
    expect(registry.storyLink.sidById).toBeInstanceOf(LuaTable);
    expect(registry.storyLink.idBySid).toBeInstanceOf(LuaTable);
    expect(registry.stalkers).toBeInstanceOf(LuaTable);
    expect(registry.trade).toBeInstanceOf(LuaTable);
    expect(registry.camps).toBeInstanceOf(LuaTable);
    expect(registry.crows.storage).toBeInstanceOf(LuaTable);
    expect(registry.crows.count).toBe(0);
    expect(registry.helicopter.storage).toBeInstanceOf(LuaTable);
    expect(registry.helicopter.enemies).toBeInstanceOf(LuaTable);
    expect(registry.helicopter.enemyIndex).toBe(0);
    expect(registry.anomalyZones).toBeInstanceOf(LuaMap);
    expect(registry.anomalyFields).toBeInstanceOf(LuaMap);
    expect(registry.artefacts.ways).toBeInstanceOf(LuaTable);
    expect(registry.artefacts.points).toBeInstanceOf(LuaTable);
    expect(registry.artefacts.parentZones).toBeInstanceOf(LuaTable);
    expect(registry.goodwill.sympathy).toBeInstanceOf(LuaTable);
    expect(registry.goodwill.relations).toBeInstanceOf(LuaTable);
    expect(registry.zones).toBeInstanceOf(LuaTable);
    expect(registry.signalLights).toBeInstanceOf(LuaTable);
    expect(registry.noWeaponZones).toBeInstanceOf(LuaTable);
    expect(registry.lightZones).toBeInstanceOf(LuaTable);
    expect(registry.ini).toBeInstanceOf(LuaMap);
    expect(registry.smartTerrains).toBeInstanceOf(LuaTable);
    expect(registry.smartTerrainsCampfires).toBeInstanceOf(LuaTable);
    expect(registry.smartTerrainNearest.id).toBeNull();
    expect(registry.smartTerrainNearest.distanceSqr).toBe(math.huge);
    expect(registry.smartCovers).toBeInstanceOf(LuaMap);
    expect(registry.doors).toBeInstanceOf(LuaTable);
    expect(registry.ranks.stalker).toBeInstanceOf(LuaMap);
    expect(registry.ranks.monster).toBeInstanceOf(LuaMap);
    expect(registry.ranks.maxStalkerRank).toBeNull();
    expect(registry.ranks.maxStalkerRank).toBeNull();
    expect(registry.saveMarkers).toBeInstanceOf(LuaTable);
    expect(registry.signalLights).toBeInstanceOf(LuaTable);
    expect(registry.spawnedVertexes).toBeInstanceOf(LuaTable);
    expect(registry.noCombatZones).toBeInstanceOf(LuaTable);
    expect(registry.noCombatSmartTerrains).toBeInstanceOf(LuaTable);
    expect(registry.baseSmartTerrains).toBeInstanceOf(LuaTable);
    expect(registry.extensions).toBeInstanceOf(LuaTable);
    expect(registry.dynamicData).toBeInstanceOf(Object);
  });
});
