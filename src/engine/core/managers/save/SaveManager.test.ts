import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyObject, TName } from "xray16/lib";
import { MockGameObject, MockIoFile, MockNetProcessor } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager, initializeManager, registerActor, registry } from "@/engine/core/database";
import { IExtensionsDescriptor } from "@/engine/core/extensions";
import { TAbstractCoreManagerConstructor } from "@/engine/core/managers/abstract";
import { ActorInputManager } from "@/engine/core/managers/actor";
import { ArtefactManager } from "@/engine/core/managers/artefacts";
import { ReleaseBodyManager } from "@/engine/core/managers/death/ReleaseBodyManager";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { PsyAntennaManager } from "@/engine/core/managers/psy/PsyAntennaManager";
import { SaveManager } from "@/engine/core/managers/save";
import { GameSettingsManager } from "@/engine/core/managers/settings/GameSettingsManager";
import { SimulationManager } from "@/engine/core/managers/simulation/SimulationManager";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { StatisticsManager } from "@/engine/core/managers/statistics";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { TaskManager } from "@/engine/core/managers/tasks";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { mockExtension, resetRegistry } from "@/fixtures/engine";

function mockLifecycleMethods(): [Array<TAbstractCoreManagerConstructor>, Array<TAbstractCoreManagerConstructor>] {
  const saveOrder: Array<TAbstractCoreManagerConstructor> = [];
  const loadOrder: Array<TAbstractCoreManagerConstructor> = [];

  for (const [managerClass, managerInstance] of registry.managers) {
    (managerClass as AnyObject).save = jest.fn(() => saveOrder.push(managerClass));
    (managerClass as AnyObject).load = jest.fn(() => loadOrder.push(managerClass));

    managerInstance.save = jest.fn(() => saveOrder.push(managerClass));
    managerInstance.load = jest.fn(() => loadOrder.push(managerClass));
    managerInstance.initialize = jest.fn();
  }

  return [saveOrder, loadOrder];
}

describe("SaveManager", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(io.open);
  });

  it("should correctly initialize without subscriptions", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    initializeManager(SaveManager);
    expect(eventsManager.getSubscribersCount()).toBe(0);

    disposeManager(SaveManager);
    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should save and load data from managers in a same order", () => {
    const expectedOrder: Array<TAbstractCoreManagerConstructor> = [
      WeatherManager,
      ReleaseBodyManager,
      SurgeManager,
      ArtefactManager,
      PsyAntennaManager,
      SoundManager,
      StatisticsManager,
      TreasureManager,
      TaskManager,
      ActorInputManager,
      GameSettingsManager,
      DeimosManager,
    ];

    expectedOrder.forEach((it) => initializeManager(it));

    const [saveOrder, loadOrder] = mockLifecycleMethods();

    expect(saveOrder).toEqual([]);
    expect(loadOrder).toEqual([]);

    getManager(SaveManager).clientSave(new MockNetProcessor().asNetPacket());

    expect(saveOrder).toEqual(expectedOrder);
    expect(loadOrder).toEqual([]);

    getManager(SaveManager).clientLoad(new MockNetProcessor().asNetPacket());

    expect(saveOrder).toEqual(expectedOrder);
    expect(loadOrder).toEqual(expectedOrder);
  });

  it("should read and write data from managers in a strict order", () => {
    registerActor(MockGameObject.mock());

    const expectedOrder: Array<TAbstractCoreManagerConstructor> = [SimulationManager];

    expectedOrder.forEach((it) => initializeManager(it));

    const [saveOrder, loadOrder] = mockLifecycleMethods();

    expect(saveOrder).toEqual([]);
    expect(loadOrder).toEqual([]);

    getManager(SaveManager).serverSave(new MockNetProcessor().asNetPacket());

    expect(saveOrder).toEqual(expectedOrder);
    expect(loadOrder).toEqual([]);

    getManager(SaveManager).serverLoad(new MockNetProcessor().asNetPacket());

    expect(saveOrder).toEqual(expectedOrder);
    expect(loadOrder).toEqual(expectedOrder);
  });

  it("should have implementation base for save callbacks", () => {
    const saveManager: SaveManager = getManager(SaveManager);

    expect(saveManager.onBeforeGameSave).toBeDefined();
    expect(saveManager.onGameSave).toBeDefined();
    expect(saveManager.onGameLoad).toBeDefined();
    expect(saveManager.onAfterGameLoad).toBeDefined();
  });

  it("should properly create dynamic saves", () => {
    const saveManager: SaveManager = getManager(SaveManager);
    const file: MockIoFile = new MockIoFile("test", "wb");
    const firstExtension: IExtensionsDescriptor = mockExtension({ name: "first" });
    const secondExtension: IExtensionsDescriptor = mockExtension({ name: "second" });

    registry.dynamicData.extensions[firstExtension.name] = { a: 1, b: true, c: null };
    registry.dynamicData.extensions[secondExtension.name] = { a: "a", b: "b" };
    registry.dynamicData.extensions["not-existing"] = { a: "not-existing" };

    registry.extensions.set(firstExtension.name, firstExtension);
    registry.extensions.set(secondExtension.name, secondExtension);

    const onSave = jest.fn((saveName: TName, data: AnyObject) => {
      expect(saveName).toBe("test.scop");
      data.example = 123;
    });

    getManager(EventsManager).registerCallback(EGameEvent.GAME_SAVE, onSave);

    jest.spyOn(io, "open").mockImplementationOnce(() => $multi(file.asMock()));

    saveManager.onBeforeGameSave("test.scop");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(io.open).toHaveBeenCalledWith("$game_saves$\\test.scopx", "wb");
    expect(file.write).toHaveBeenCalledWith(
      JSON.stringify({
        event: { example: 123 },
        extensions: {
          first: { a: 1, b: true, c: null },
          second: { a: "a", b: "b" },
          "not-existing": { a: "not-existing" },
        },
        store: {},
        objects: {},
      })
    );
    expect(file.close).toHaveBeenCalledTimes(1);
  });

  it("should properly handle after game saved event", () => {
    const saveManager: SaveManager = getManager(SaveManager);

    const onSaved = jest.fn();

    getManager(EventsManager).registerCallback(EGameEvent.GAME_SAVED, onSaved);

    saveManager.onGameSave("test.scop");

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith("test.scop");
  });

  it("should properly load dynamic saves", () => {
    const saveManager: SaveManager = getManager(SaveManager);
    const file: MockIoFile = new MockIoFile("test", "wb");
    const firstExtension: IExtensionsDescriptor = mockExtension({ name: "first" });
    const secondExtension: IExtensionsDescriptor = mockExtension({ name: "second" });

    registry.extensions.set(firstExtension.name, firstExtension);
    registry.extensions.set(secondExtension.name, secondExtension);

    file.content = JSON.stringify({
      event: { example: 123 },
      store: {},
      extensions: {
        first: { a: 1, b: true, c: null },
        second: { a: "a", b: "b" },
        third: { a: "not-registered" },
      },
      objects: {},
    });

    const onLoad = jest.fn((saveName: TName, data: AnyObject) => {
      expect(saveName).toBe("F:\\\\parent\\\\test.scop");
      expect(data).toEqual({ example: 123 });
    });

    getManager(EventsManager).registerCallback(EGameEvent.GAME_LOAD, onLoad);

    jest.spyOn(io, "open").mockImplementation(() => $multi(file.asMock()));

    const contentBefore: AnyObject = registry.dynamicData;

    saveManager.onGameLoad("F:\\\\parent\\\\test.scop");

    expect(marshal.decode).toHaveBeenCalledWith(file.content);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(io.open).toHaveBeenCalledWith("F:\\\\parent\\\\test.scopx", "rb");
    expect(file.read).toHaveBeenCalledTimes(1);
    expect(file.close).toHaveBeenCalledTimes(1);
    expect(contentBefore).not.toBe(registry.dynamicData);
    expect(registry.dynamicData.extensions).toEqual({
      first: {
        a: 1,
        b: true,
        c: null,
      },
      second: {
        a: "a",
        b: "b",
      },
      third: {
        a: "not-registered",
      },
    });

    // In case of empty file data should stay same.
    const contentAfter: AnyObject = registry.dynamicData;

    file.content = "";
    saveManager.onGameLoad("F:\\\\parent\\\\test.scop");
    expect(contentAfter).toBe(registry.dynamicData);

    file.content = null;
    saveManager.onGameLoad("F:\\\\parent\\\\test.scop");
    expect(contentAfter).toBe(registry.dynamicData);

    file.content = "{}";
    file.isOpen = false;
    saveManager.onGameLoad("F:\\\\parent\\\\test.scop");
    expect(contentAfter).toBe(registry.dynamicData);
  });

  it("should properly handle callback after game loaded", () => {
    const saveManager: SaveManager = getManager(SaveManager);

    const onLoad = jest.fn();

    getManager(EventsManager).registerCallback(EGameEvent.GAME_LOADED, onLoad);

    saveManager.onAfterGameLoad("F:\\\\parent\\\\test.scop");

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoad).toHaveBeenCalledWith("F:\\\\parent\\\\test.scop");
  });
});
