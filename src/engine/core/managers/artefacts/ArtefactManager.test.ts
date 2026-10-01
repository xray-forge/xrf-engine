import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CArtefact, clsid, level } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, createVector } from "xray16/lib";
import { EMockPacketDataType, MockCArtefact, MockGameObject, MockNetProcessor } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { AnomalyZoneBinder } from "@/engine/core/binders/zones";
import { disposeManager, getManager, registerSimulator, registry } from "@/engine/core/database";
import { ArtefactManager } from "@/engine/core/managers/artefacts/ArtefactManager";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateAnomalyZonesDisplay } from "@/engine/core/managers/map/utils";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils");

describe("ArtefactManager", () => {
  let anomalyZone: AnomalyZoneBinder;

  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    resetFunctionMock(updateAnomalyZonesDisplay);

    anomalyZone = { respawnArtefactsAndChangeLayers: jest.fn() } as unknown as AnomalyZoneBinder;
    registry.anomalyZones.set("test_zone", anomalyZone);
  });

  it("should correctly initialize and destroy", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    getManager(ArtefactManager);

    expect(eventsManager.getSubscribersCount()).toBe(5);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_FIRST_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_ITEM_TAKE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_ENDED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_SKIPPED)).toBe(1);

    disposeManager(ArtefactManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly save and load levels to respawn artefacts on", () => {
    const manager: ArtefactManager = getManager(ArtefactManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.respawnLevels.set("jupiter", true);
    manager.respawnLevels.set("pripyat", true);

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.U16,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);

    disposeManager(ArtefactManager);

    const newManager: ArtefactManager = getManager(ArtefactManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager.respawnLevels).toEqualLuaTables({ jupiter: true, pripyat: true });
  });

  it("should respawn artefacts here at once and on the other game levels surges happen on after a surge", () => {
    const manager: ArtefactManager = getManager(ArtefactManager);

    surgeConfig.SURGE_DISABLED_LEVELS.set("pripyat", true);

    try {
      EventsManager.emitEvent(EGameEvent.SURGE_ENDED);

      expect(level.name()).toBe("zaton");
      expect(anomalyZone.respawnArtefactsAndChangeLayers).toHaveBeenCalledTimes(1);
      expect(updateAnomalyZonesDisplay).toHaveBeenCalledTimes(1);
      expect(manager.respawnLevels).toEqualLuaTables({ jupiter: true });

      EventsManager.emitEvent(EGameEvent.SURGE_SKIPPED, true);

      expect(anomalyZone.respawnArtefactsAndChangeLayers).toHaveBeenCalledTimes(2);
    } finally {
      surgeConfig.SURGE_DISABLED_LEVELS.delete("pripyat");
    }
  });

  it("should not respawn artefacts of the current level when surges do not happen on it", () => {
    const manager: ArtefactManager = getManager(ArtefactManager);

    surgeConfig.SURGE_DISABLED_LEVELS.set("zaton", true);

    try {
      manager.onSurgeFinished();

      expect(anomalyZone.respawnArtefactsAndChangeLayers).not.toHaveBeenCalled();
      expect(manager.respawnLevels).toEqualLuaTables({ jupiter: true, pripyat: true });
    } finally {
      surgeConfig.SURGE_DISABLED_LEVELS.delete("zaton");
    }
  });

  it("should respawn artefacts on the actor first update on a level flagged for it", () => {
    const manager: ArtefactManager = getManager(ArtefactManager);

    EventsManager.emitEvent(EGameEvent.ACTOR_FIRST_UPDATE);

    expect(anomalyZone.respawnArtefactsAndChangeLayers).not.toHaveBeenCalled();

    manager.respawnLevels.set(level.name(), true);
    manager.respawnLevels.set("jupiter", true);

    EventsManager.emitEvent(EGameEvent.ACTOR_FIRST_UPDATE);

    expect(anomalyZone.respawnArtefactsAndChangeLayers).toHaveBeenCalledTimes(1);
    expect(manager.respawnLevels).toEqualLuaTables({ jupiter: true });
  });

  it("should ignore actor taking generic items", () => {
    const object: GameObject = MockGameObject.mock();

    getManager(ArtefactManager).onActorItemTake(object);

    expect(object.get_artefact).not.toHaveBeenCalled();
  });

  it("should release artefacts taken from anomaly zones", () => {
    const object: GameObject = MockGameObject.mock();
    const artefact: CArtefact = MockCArtefact.mock();
    const zone: AnomalyZoneBinder = new AnomalyZoneBinder(MockGameObject.mock());

    jest.spyOn(object, "clsid").mockImplementation(() => clsid.artefact_s);
    jest.spyOn(object, "get_artefact").mockImplementation(() => artefact);
    jest.spyOn(zone, "onArtefactTaken").mockImplementation(jest.fn());

    registry.artefacts.parentZones.set(object.id(), zone);

    getManager(ArtefactManager);
    EventsManager.emitEvent(EGameEvent.ACTOR_ITEM_TAKE, object);

    expect(zone.onArtefactTaken).toHaveBeenCalledWith(object.id());
    expect(artefact.FollowByPath).toHaveBeenCalledWith("NULL", 0, createVector(500, 500, 500));
  });

  it("should release artefacts taken from the world", () => {
    const object: GameObject = MockGameObject.mock();
    const artefact: CArtefact = MockCArtefact.mock();

    jest.spyOn(object, "clsid").mockImplementation(() => clsid.artefact_s);
    jest.spyOn(object, "get_artefact").mockImplementation(() => artefact);

    registry.artefacts.ways.set(object.id(), "path_example");

    getManager(ArtefactManager).onActorItemTake(object);

    expect(artefact.FollowByPath).toHaveBeenCalledWith("NULL", 0, createVector(500, 500, 500));
    expect(registry.artefacts.ways.has(object.id())).toBe(false);
  });

  it("should correctly handle debug dump event", () => {
    const manager: ArtefactManager = getManager(ArtefactManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ ArtefactManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ ArtefactManager: expect.any(Object) });
  });
});
