import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ServerObject } from "xray16/alias";
import { EMockPacketDataType, MockAlifeObject, MockGameObject, MockNetProcessor, MockObjectBinder } from "xray16/mocks";

import { SmartTerrainBinder } from "@/engine/core/binders/smart_terrain/index";
import { getManager, registerSimulator, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SoundManager } from "@/engine/core/managers/sounds";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("SmartTerrainBinder", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should correctly initialize", () => {
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());

    expect(binder.isVisited).toBe(false);
    expect(binder.serverObject).toBeUndefined();
  });

  it("should be save relevant", () => {
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());

    expect(binder.net_save_relevant()).toBe(true);
  });

  it("should correctly handle going online/offline", () => {
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());
    const serverObject: ServerObject = MockAlifeObject.mock({ id: binder.object.id() });
    const soundManager: SoundManager = getManager(SoundManager);

    jest.spyOn(soundManager, "stop").mockImplementation(jest.fn());

    binder.net_spawn(serverObject);

    expect(binder.serverObject).toBe(serverObject);
    expect(registry.smartTerrains.length()).toBe(1);
    expect(registry.zones.length()).toBe(1);
    expect(registry.objects.length()).toBe(1);

    binder.net_destroy();

    expect(registry.smartTerrains.length()).toBe(0);
    expect(registry.zones.length()).toBe(0);
    expect(registry.objects.length()).toBe(0);

    expect(soundManager.stop).toHaveBeenCalledTimes(1);
    expect(soundManager.stop).toHaveBeenCalledWith(serverObject.id);
  });

  it("should correctly handle going online/offline when check to spawn is falsy", () => {
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());
    const serverObject: ServerObject = MockAlifeObject.mock({ id: binder.object.id() });
    const soundManager: SoundManager = getManager(SoundManager);

    (binder as unknown as MockObjectBinder).canSpawn = false;
    jest.spyOn(soundManager, "stop").mockImplementation(jest.fn());

    binder.net_spawn(serverObject);

    expect(registry.smartTerrains.length()).toBe(0);
    expect(registry.zones.length()).toBe(0);
    expect(registry.objects.length()).toBe(0);

    expect(soundManager.stop).toHaveBeenCalledTimes(0);
  });

  it("should correctly handle update event", () => {
    mockRegisteredActor();

    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());
    const serverObject: ServerObject = MockAlifeObject.mock({ id: binder.object.id() });
    const onVisit = jest.fn();

    getManager(EventsManager).registerCallback(EGameEvent.SMART_TERRAIN_VISITED, onVisit);

    jest.spyOn(serverObject, "update").mockImplementation(jest.fn());

    binder.net_spawn(serverObject);
    binder.update(255);

    expect(serverObject.update).toHaveBeenCalledTimes(1);
    expect(binder.isVisited).toBe(false);
    expect(hasInfoPortion(binder.object.name() + "_visited")).toBe(false);
    expect(onVisit).toHaveBeenCalledTimes(0);

    jest.spyOn(binder.object, "inside").mockImplementation(() => true);

    binder.update(312);

    expect(binder.isVisited).toBe(true);
    expect(hasInfoPortion(binder.object.name() + "_visited")).toBe(true);
    expect(onVisit).toHaveBeenCalledTimes(1);
    expect(onVisit).toHaveBeenCalledWith(binder.object, binder);

    binder.update(312);
    expect(onVisit).toHaveBeenCalledTimes(1);
  });

  it("should check whether the actor visited on the distance check interval", () => {
    mockRegisteredActor();

    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());
    const serverObject: ServerObject = MockAlifeObject.mock({ id: binder.object.id() });

    jest.spyOn(serverObject, "update").mockImplementation(jest.fn());
    jest.spyOn(binder.object, "inside").mockImplementation(() => false);

    binder.net_spawn(serverObject);
    binder.update(16);

    expect(binder.object.inside).toHaveBeenCalledTimes(1);

    binder.update(16);
    binder.update(16);

    expect(binder.object.inside).toHaveBeenCalledTimes(1);

    binder.update(250);

    expect(binder.object.inside).toHaveBeenCalledTimes(2);
  });

  it("updates the server terrain before the actor is available without marking it visited", () => {
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());
    const serverObject: ServerObject = MockAlifeObject.mock({ id: binder.object.id() });

    jest.spyOn(serverObject, "update").mockImplementation(jest.fn());

    binder.net_spawn(serverObject);
    binder.update(255);

    expect(serverObject.update).toHaveBeenCalledTimes(1);
    expect(binder.isVisited).toBe(false);
    expect(hasInfoPortion(binder.object.name() + "_visited")).toBe(false);
  });

  it("should correctly handle save/load", () => {
    const processor: MockNetProcessor = new MockNetProcessor();
    const binder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());

    binder.isVisited = true;

    binder.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual(["save_from_SmartTerrainBinder", true, 2]);

    const newBinder: SmartTerrainBinder = new SmartTerrainBinder(MockGameObject.mock());

    newBinder.load(processor.asNetReader());

    expect(newBinder.isVisited).toBe(true);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });
});
