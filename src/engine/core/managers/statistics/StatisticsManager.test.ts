import { beforeEach, describe, expect, it } from "@jest/globals";
import { clsid } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, TName, TNumberId, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { EMockPacketDataType, MockAlifeMonsterBase, MockGameObject, MockNetProcessor, MockVector } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { weapons } from "@/engine/constants/items/weapons";
import { disposeManager, getManager, registerActor, registerSimulator } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { StatisticsManager } from "@/engine/core/managers/statistics";
import { resetRegistry } from "@/fixtures/engine";

describe("StatisticsManager", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should correctly initialize and destroy", () => {
    const statisticsManager: StatisticsManager = getManager(StatisticsManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(11);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.TASK_COMPLETED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_SURVIVED_WITH_ANABIOTIC)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_ITEM_TAKE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_SKIPPED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_ENDED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.TREASURE_FOUND)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.STALKER_HIT)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.STALKER_DEATH)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.MONSTER_HIT)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.MONSTER_DEATH)).toBe(1);

    expect(statisticsManager.takenArtefacts).toEqualLuaTables(new LuaTable());
    expect(statisticsManager.actorStatistics).toEqual({
      surgesCount: 0,
      completedTasksCount: 0,
      killedMonstersCount: 0,
      killedStalkersCount: 0,
      collectedTreasuresCount: 0,
      collectedArtefactsCount: 0,
      bestKilledMonster: null,
      bestKilledMonsterRank: 0,
      favoriteWeapon: null,
      collectedArtefacts: new LuaTable(),
    });

    disposeManager(StatisticsManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle surges", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);

    expect(manager.actorStatistics.surgesCount).toBe(0);

    EventsManager.emitEvent(EGameEvent.SURGE_ENDED);
    EventsManager.emitEvent(EGameEvent.SURGE_SKIPPED);

    expect(manager.actorStatistics.surgesCount).toBe(2);
  });

  it("should correctly handle treasures finding", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);

    expect(manager.actorStatistics.collectedTreasuresCount).toBe(0);

    EventsManager.emitEvent(EGameEvent.TREASURE_FOUND, {});
    EventsManager.emitEvent(EGameEvent.TREASURE_FOUND, {});

    expect(manager.actorStatistics.collectedTreasuresCount).toBe(2);
  });

  it("should correctly handle stalkers killing", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);
    const actor: GameObject = MockGameObject.mockActor();

    expect(manager.actorStatistics.killedStalkersCount).toBe(0);

    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, MockGameObject.mock(), actor);
    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, MockGameObject.mock(), actor);
    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, MockGameObject.mock(), null);
    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, MockGameObject.mock(), MockGameObject.mock());

    expect(manager.actorStatistics.killedStalkersCount).toBe(2);
  });

  it("should correctly handle tasks", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);

    expect(manager.actorStatistics.completedTasksCount).toBe(0);

    EventsManager.emitEvent(EGameEvent.TASK_COMPLETED, {});
    EventsManager.emitEvent(EGameEvent.TASK_COMPLETED, {});

    expect(manager.actorStatistics.completedTasksCount).toBe(2);
  });

  it("should correctly handle anabiotics", () => {
    registerActor(MockGameObject.mockActor());

    const manager: StatisticsManager = getManager(StatisticsManager);

    expect(manager.getUsedAnabioticsCount()).toBe(0);

    EventsManager.emitEvent(EGameEvent.SURGE_SURVIVED_WITH_ANABIOTIC);
    EventsManager.emitEvent(EGameEvent.SURGE_SURVIVED_WITH_ANABIOTIC);

    expect(manager.getUsedAnabioticsCount()).toBe(2);
  });

  it("should correctly handle taking artefacts", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);
    const first: GameObject = MockGameObject.mock({ clsid: clsid.art_black_drops, section: "af_first" });
    const second: GameObject = MockGameObject.mock({ clsid: clsid.art_bast_artefact, section: "af_first" });
    const third: GameObject = MockGameObject.mock({ clsid: clsid.art_zuda, section: "af_second" });

    expect(manager.actorStatistics.collectedArtefactsCount).toBe(0);

    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, MockGameObject.mock());
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, first);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, first);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, first);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, first);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, second);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, second);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, second);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, third);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, third);

    expect(manager.actorStatistics.collectedArtefactsCount).toBe(3);
    expect(manager.actorStatistics.collectedArtefacts).toEqualLuaTables({ af_first: true, af_second: true });
    expect(manager.takenArtefacts).toEqualLuaTables({
      [first.id()]: first.id(),
      [second.id()]: second.id(),
      [third.id()]: third.id(),
    });
  });

  it("should correctly handle dealing damage to an object", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);
    const ak74: GameObject = MockGameObject.mock({ section: weapons.wpn_ak74 });
    const desertEagle: GameObject = MockGameObject.mock({ section: weapons.wpn_desert_eagle });
    const desertEagleNimble: GameObject = MockGameObject.mock({ section: weapons.wpn_desert_eagle_nimble });
    const grenade: GameObject = MockGameObject.mock({ section: weapons.grenade_rgd5 });
    const binoculars: GameObject = MockGameObject.mock({ section: weapons.wpn_binoc });
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);

    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 100, MockVector.mock(), actor);
    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 100, MockVector.mock(), MockGameObject.mock());

    expect(manager.weaponsStatistics).toEqualLuaTables({});
    expect(manager.actorStatistics.favoriteWeapon).toBeNull();

    replaceFunctionMock(actor.active_item, () => ak74);

    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 100, MockVector.mock(), actor);
    EventsManager.emitEvent(EGameEvent.STALKER_HIT, target, 150, MockVector.mock(), actor);
    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 150, MockVector.mock(), MockGameObject.mock());

    expect(manager.weaponsStatistics).toEqualLuaTables({ ak74: 250 });
    expect(manager.actorStatistics.favoriteWeapon).toBe(weapons.wpn_ak74);

    replaceFunctionMock(actor.active_item, () => desertEagle);

    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 100, MockVector.mock(), actor);
    expect(manager.actorStatistics.favoriteWeapon).toBe(weapons.wpn_ak74);
    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 300, MockVector.mock(), actor);
    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 300, MockVector.mock(), MockGameObject.mock());

    expect(manager.weaponsStatistics).toEqualLuaTables({ ak74: 250, desert: 400 });
    expect(manager.actorStatistics.favoriteWeapon).toBe(weapons.wpn_desert_eagle);

    replaceFunctionMock(actor.active_item, () => desertEagleNimble);

    EventsManager.emitEvent(EGameEvent.STALKER_HIT, target, 100, MockVector.mock(), actor);

    expect(manager.weaponsStatistics).toEqualLuaTables({ ak74: 250, desert: 500 });
    expect(manager.actorStatistics.favoriteWeapon).toBe(weapons.wpn_desert_eagle);

    replaceFunctionMock(actor.active_item, () => binoculars);

    EventsManager.emitEvent(EGameEvent.STALKER_HIT, target, 1000, MockVector.mock(), actor);

    expect(manager.weaponsStatistics).toEqualLuaTables({ ak74: 250, desert: 500 });

    replaceFunctionMock(actor.active_item, () => grenade);

    EventsManager.emitEvent(EGameEvent.MONSTER_HIT, target, 600, MockVector.mock(), actor);

    expect(manager.weaponsStatistics).toEqualLuaTables({ ak74: 250, desert: 500, rgd5: 600 });
    expect(manager.actorStatistics.favoriteWeapon).toBe(weapons.grenade_rgd5);
  });

  it("should correctly handle monster kills", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);
    const firstMonster: GameObject = MockGameObject.mock({ clsid: clsid.flesh_s, rank: 3 });
    const secondMonster: GameObject = MockGameObject.mock({ clsid: clsid.bloodsucker_s, rank: 15 });
    const thirdMonster: GameObject = MockGameObject.mock({ clsid: clsid.bloodsucker_s, rank: 16 });
    const actor: GameObject = MockGameObject.mockActor();

    registerActor(actor);
    MockAlifeMonsterBase.mock({ id: firstMonster.id(), rank: 3 });
    MockAlifeMonsterBase.mock({ id: secondMonster.id(), rank: 15 });
    MockAlifeMonsterBase.mock({ id: thirdMonster.id(), rank: 16 });

    expect(manager.actorStatistics.killedMonstersCount).toBe(0);
    expect(manager.actorStatistics.bestKilledMonster).toBeNull();
    expect(manager.actorStatistics.bestKilledMonsterRank).toBe(0);

    expect(() => EventsManager.emitEvent(EGameEvent.MONSTER_DEATH, MockGameObject.mock(), actor)).toThrow();
    expect(() => {
      EventsManager.emitEvent(EGameEvent.MONSTER_DEATH, MockGameObject.mock(), MockGameObject.mock());
    }).not.toThrow();

    expect(manager.actorStatistics.killedMonstersCount).toBe(0);
    expect(manager.actorStatistics.bestKilledMonster).toBeNull();
    expect(manager.actorStatistics.bestKilledMonsterRank).toBe(0);

    EventsManager.emitEvent(EGameEvent.MONSTER_DEATH, firstMonster, actor);

    expect(manager.actorStatistics.killedMonstersCount).toBe(1);
    expect(manager.actorStatistics.bestKilledMonster).toBe("flesh_strong");
    expect(manager.actorStatistics.bestKilledMonsterRank).toBe(3);

    EventsManager.emitEvent(EGameEvent.MONSTER_DEATH, secondMonster, actor);

    expect(manager.actorStatistics.killedMonstersCount).toBe(2);
    expect(manager.actorStatistics.bestKilledMonster).toBe("bloodsucker_normal");
    expect(manager.actorStatistics.bestKilledMonsterRank).toBe(15);

    EventsManager.emitEvent(EGameEvent.MONSTER_DEATH, thirdMonster, actor);

    expect(manager.actorStatistics.killedMonstersCount).toBe(3);
    expect(manager.actorStatistics.bestKilledMonster).toBe("bloodsucker_strong");
    expect(manager.actorStatistics.bestKilledMonsterRank).toBe(16);
  });

  it("should correctly save and load data", () => {
    const oldManager: StatisticsManager = getManager(StatisticsManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    oldManager.actorStatistics = {
      collectedArtefacts: $fromObject<TName, boolean>({ af_1: true, af_2: true }),
      collectedArtefactsCount: 10,
      collectedTreasuresCount: 24,
      killedMonstersCount: 30,
      killedStalkersCount: 4,
      bestKilledMonsterRank: 16,
      surgesCount: 1,
      completedTasksCount: 40,
      favoriteWeapon: "wpn_ak74",
      bestKilledMonster: "bloodsucker_strong",
    };
    oldManager.weaponsStatistics = $fromObject<TName, TRate>({ ak74: 250, desert: 100 });
    oldManager.takenArtefacts = $fromObject<TNumberId, TNumberId>({ 300: 300, 1_000: 1_000 });

    oldManager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.U32,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.STRING,
      EMockPacketDataType.F32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.F32,
      EMockPacketDataType.U8,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      1,
      40,
      30,
      4,
      24,
      10,
      16,
      "bloodsucker_strong",
      "wpn_ak74",
      2,
      "ak74",
      250,
      "desert",
      100,
      2,
      "af_1",
      "af_2",
      2,
      300,
      1_000,
      20,
    ]);

    disposeManager(StatisticsManager);

    const newManager: StatisticsManager = getManager(StatisticsManager);

    newManager.load(processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(oldManager);

    expect(newManager.actorStatistics).toEqualLuaTables({
      collectedArtefacts: $fromObject<TName, boolean>({ af_1: true, af_2: true }),
      collectedArtefactsCount: 10,
      collectedTreasuresCount: 24,
      killedMonstersCount: 30,
      killedStalkersCount: 4,
      bestKilledMonsterRank: 16,
      surgesCount: 1,
      completedTasksCount: 40,
      favoriteWeapon: "wpn_ak74",
      bestKilledMonster: "bloodsucker_strong",
    });
    expect(newManager.weaponsStatistics).toEqualLuaTables({ ak74: 250, desert: 100 });
    expect(newManager.takenArtefacts).toEqualLuaTables({ 300: 300, 1_000: 1_000 });
  });

  it("should correctly handle debug dump event", () => {
    const manager: StatisticsManager = getManager(StatisticsManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ StatisticsManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ StatisticsManager: expect.any(Object) });
  });
});
