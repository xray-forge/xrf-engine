import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, ServerHumanObject, ServerObject } from "xray16/alias";
import { AnyObject, TNumberId } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import {
  EMockPacketDataType,
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockGameObject,
  MockNetProcessor,
} from "xray16/mocks";

import {
  disposeManager,
  getManager,
  registerObject,
  registerSimulator,
  registerStoryLink,
  registry,
} from "@/engine/core/database";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { ReleaseBodyManager } from "@/engine/core/managers/death/ReleaseBodyManager";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("ReleaseBodyManager", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();

    deathConfig.RELEASE_OBJECTS_REGISTRY = new LuaTable();
    deathConfig.MAX_BODY_COUNT = 5;

    jest.spyOn(Date, "now").mockImplementation(() => 60_000);
  });

  it("should correctly initialize and destroy", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);

    getManager(ReleaseBodyManager);

    expect(eventsManager.getSubscribersCount()).toBe(2);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.STALKER_DEATH)).toBe(1);

    disposeManager(ReleaseBodyManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly add dead bodies", () => {
    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);

    jest.spyOn(manager, "releaseCorpses").mockImplementation(jest.fn());

    for (let it = 0; it < deathConfig.MAX_BODY_COUNT; it++) {
      const object: GameObject = MockGameObject.mock();

      registerObject(object);

      manager.registerCorpse(object);
    }

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY.length()).toBe(5);
    expect(manager.releaseCorpses).toHaveBeenCalledTimes(0);

    const objectOverLimit: GameObject = MockGameObject.mock();

    registerObject(objectOverLimit);

    manager.registerCorpse(objectOverLimit);

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY.length()).toBe(6);
    expect(manager.releaseCorpses).toHaveBeenCalledTimes(1);

    const objectWithStoryId: GameObject = MockGameObject.mock();

    registerObject(objectWithStoryId);
    registerStoryLink(objectWithStoryId.id(), "test_sid");

    manager.registerCorpse(objectWithStoryId);

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY.length()).toBe(6);
    expect(manager.releaseCorpses).toHaveBeenCalledTimes(1);
  });

  it("should not register the same corpse more than once", () => {
    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const object: GameObject = MockGameObject.mock();

    registerObject(object);

    manager.registerCorpse(object);
    manager.registerCorpse(object);

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([object.id()]);
  });

  it("should correctly try releasing", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const first: ServerHumanObject = MockAlifeHumanStalker.mock();
    const second: ServerHumanObject = MockAlifeHumanStalker.mock();

    jest.spyOn(first, "alive").mockImplementation(() => false);
    jest.spyOn(second, "alive").mockImplementation(() => false);

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => deathConfig.MIN_DISTANCE_SQR + 1);

    deathConfig.MAX_BODY_COUNT = 0;
    deathConfig.RELEASE_OBJECTS_REGISTRY = $fromArray<TNumberId>([10, 11, 12, 13, 14, 15, first.id, second.id]);

    manager.releaseCorpses();

    expect(registry.simulator.release).toHaveBeenCalledTimes(2);
    expect(registry.simulator.release).toHaveBeenCalledWith(first, true);
    expect(registry.simulator.release).toHaveBeenCalledWith(second, true);
  });

  it("should discard stale and non-creature descriptors while retaining alive creatures", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const alive: ServerHumanObject = MockAlifeHumanStalker.mock();
    const nonCreature: ServerObject = MockAlifeObject.mock({ alive: false });

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => deathConfig.MIN_DISTANCE_SQR + 1);

    deathConfig.MAX_BODY_COUNT = 0;
    deathConfig.RELEASE_OBJECTS_REGISTRY = $fromArray<TNumberId>([10, alive.id, nonCreature.id]);

    manager.releaseCorpses();

    expect(registry.simulator.release).not.toHaveBeenCalled();
    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([alive.id]);
  });

  it("should preserve a corpse that becomes protected before release", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const item: GameObject = MockGameObject.mock({ section: "keep_item_section" });
    const object: GameObject = MockGameObject.mock();

    MockAlifeHumanStalker.mock({ id: object.id(), alive: false });

    registerObject(object);
    manager.registerCorpse(object);
    MockGameObject.asMock(object).objectInventory.set(item.section(), item);

    deathConfig.MAX_BODY_COUNT = 0;
    jest.spyOn(Date, "now").mockImplementation(() => 120_000);
    jest.spyOn(object, "death_time").mockImplementation(() => 0);

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => deathConfig.MIN_DISTANCE_SQR + 1);

    manager.releaseCorpses();

    expect(registry.simulator.release).not.toHaveBeenCalled();
    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([object.id()]);
  });

  it("should release another eligible corpse when a farther corpse is protected", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const item: GameObject = MockGameObject.mock({ section: "keep_item_section" });
    const protectedObject: GameObject = MockGameObject.mock();
    const protectedServerObject: ServerHumanObject = MockAlifeHumanStalker.mock({
      id: protectedObject.id(),
      alive: false,
    });
    const releasableServerObject: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: false });

    registerObject(protectedObject);
    manager.registerCorpse(protectedObject);
    MockGameObject.asMock(protectedObject).objectInventory.set(item.section(), item);
    table.insert(deathConfig.RELEASE_OBJECTS_REGISTRY, releasableServerObject.id);

    deathConfig.MAX_BODY_COUNT = 0;
    jest.spyOn(Date, "now").mockImplementation(() => 120_000);
    jest.spyOn(protectedObject, "death_time").mockImplementation(() => 0);
    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation((position) => {
      return position === protectedServerObject.position
        ? deathConfig.MIN_DISTANCE_SQR + 2
        : deathConfig.MIN_DISTANCE_SQR + 1;
    });

    manager.releaseCorpses();

    expect(registry.simulator.release).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledWith(releasableServerObject, true);
    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([protectedObject.id()]);
  });

  it("should correctly save/load", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    deathConfig.RELEASE_OBJECTS_REGISTRY = $fromArray<TNumberId>([10, 11, 12, 13]);

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([4, 10, 11, 12, 13, 5, 6]);

    disposeManager(ReleaseBodyManager);

    deathConfig.RELEASE_OBJECTS_REGISTRY = new LuaTable();

    getManager(ReleaseBodyManager).load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([10, 11, 12, 13]);
  });

  it("should correctly save/load when level is changed", () => {
    mockRegisteredActor();

    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    deathConfig.RELEASE_OBJECTS_REGISTRY = $fromArray<TNumberId>([10, 11]);

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([2, 10, 11, 5, 4]);

    disposeManager(ReleaseBodyManager);

    (registry.actorServer as AnyObject).m_game_vertex_id = 1000;

    deathConfig.RELEASE_OBJECTS_REGISTRY = new LuaTable();

    getManager(ReleaseBodyManager).load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(deathConfig.RELEASE_OBJECTS_REGISTRY).toEqualLuaArrays([]);
  });

  it("should correctly handle object death", () => {
    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const object: GameObject = MockGameObject.mock();
    const killer: GameObject = MockGameObject.mock();

    jest.spyOn(manager, "registerCorpse").mockImplementation(jest.fn());

    EventsManager.emitEvent(EGameEvent.STALKER_DEATH, object, killer);

    expect(manager.registerCorpse).toHaveBeenCalledTimes(1);
    expect(manager.registerCorpse).toHaveBeenCalledWith(object);
  });

  it("should correctly handle debug dump event", () => {
    const manager: ReleaseBodyManager = getManager(ReleaseBodyManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ ReleaseBodyManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ ReleaseBodyManager: expect.any(Object) });
  });
});
