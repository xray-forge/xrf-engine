import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { callback, CHelicopter } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { ZERO_VECTOR } from "xray16/lib";
import { EMockPacketDataType, MockAlifeObject, MockGameObject, MockNetProcessor, MockObjectBinder } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { HelicopterBinder } from "@/engine/core/binders/helicopter/HelicopterBinder";
import { getManager, IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { SoundManager } from "@/engine/core/managers/sounds";
import { ISchemeHelicopterMoveState } from "@/engine/core/schemes/helicopter/heli_move";
import { HelicopterCombatController } from "@/engine/core/schemes/helicopter/heli_move/combat";
import { HelicopterFireController } from "@/engine/core/schemes/helicopter/heli_move/fire";
import { emitSchemeEvent, initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import { ISchemeHitState } from "@/engine/core/schemes/stalker/hit";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme, ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime");

describe("HelicopterBinder", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(emitSchemeEvent);
    resetFunctionMock(initializeObjectSchemeLogic);
  });

  it("should correctly initialize", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);

    expect(binder.isInitialized).toBe(false);
    expect(binder.isLoaded).toBe(false);
    expect(binder.flameStartHealth).toBe(0);
    expect(binder.helicopter).toBeInstanceOf(CHelicopter);
    expect(binder.helicopterFireController).toBeInstanceOf(HelicopterFireController);
  });

  it("resets runtime state and registers helicopter callbacks on reinitialization", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);

    binder.isInitialized = true;
    binder.reinit();

    expect(binder.isInitialized).toBe(false);
    expect(binder.state).toBe(registry.objects.get(object.id()));
    expect(binder.combatController).toBeInstanceOf(HelicopterCombatController);
    expect(binder.flameStartHealth).toBeGreaterThan(0);
    expect(object.set_callback).toHaveBeenCalledWith(callback.helicopter_on_point, binder.onWaypoint, binder);
    expect(object.set_callback).toHaveBeenCalledWith(callback.helicopter_on_hit, binder.onHit, binder);
  });

  it("initializes schemes once after the actor exists and updates active logic and sounds", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);
    const soundManager: SoundManager = getManager(SoundManager);
    const schemeState: ISchemeHelicopterMoveState = mockSchemeState(EScheme.HELI_MOVE);

    binder.reinit();
    binder.state.activeScheme = EScheme.HELI_MOVE;
    setSchemeState(binder.state, EScheme.HELI_MOVE, schemeState);
    jest.spyOn(soundManager, "updateObject").mockImplementation(jest.fn());

    binder.update(16);

    expect(initializeObjectSchemeLogic).not.toHaveBeenCalled();

    mockRegisteredActor();
    binder.update(16);
    binder.update(16);

    expect(initializeObjectSchemeLogic).toHaveBeenCalledTimes(1);
    expect(initializeObjectSchemeLogic).toHaveBeenCalledWith(object, binder.state, false, ESchemeType.HELICOPTER);
    expect(emitSchemeEvent).toHaveBeenCalledWith(schemeState, ESchemeEvent.UPDATE, 16);
    expect(soundManager.updateObject).toHaveBeenLastCalledWith(object.id());
  });

  it("should correctly handle going online and offline when spawn disabled", () => {
    const serverObject: ServerObject = MockAlifeObject.mock();
    const object: GameObject = MockGameObject.mockHelicopter({ id: serverObject.id });
    const binder: HelicopterBinder = new HelicopterBinder(object);

    MockObjectBinder.asMock(binder).canSpawn = false;

    expect(binder.net_spawn(serverObject)).toBe(false);

    expect(registry.objects.length()).toBe(0);
    expect(registry.helicopter.storage.length()).toBe(0);
  });

  it("should correctly handle going online and offline", () => {
    const serverObject: ServerObject = MockAlifeObject.mock();
    const object: GameObject = MockGameObject.mockHelicopter({ id: serverObject.id });
    const binder: HelicopterBinder = new HelicopterBinder(object);

    expect(binder.net_spawn(serverObject)).toBe(true);

    expect(registry.objects.length()).toBe(1);
    expect(registry.helicopter.storage.length()).toBe(1);

    binder.net_destroy();

    expect(registry.objects.length()).toBe(0);
    expect(registry.helicopter.storage.length()).toBe(0);
    expect(object.set_callback).toHaveBeenCalledWith(callback.helicopter_on_point, null);
    expect(object.set_callback).toHaveBeenCalledWith(callback.helicopter_on_hit, null);
  });

  it("should be net save relevant", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);

    expect(binder.net_save_relevant()).toBe(true);
  });

  it("should correctly handle save/load events", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 5000);

    const processor: MockNetProcessor = new MockNetProcessor();
    const binder: HelicopterBinder = new HelicopterBinder(MockGameObject.mockHelicopter());
    const binderState: IRegistryObjectState = registerObject(binder.object);

    binder.combatController = new HelicopterCombatController(binder.object);

    jest.spyOn(binder.combatController, "save").mockImplementation(jest.fn());

    binderState.iniFilename = "test_filename.ltx";
    binderState.jobIni = "test.ltx";
    binderState.sectionLogic = "logic";
    binderState.activeSection = "test@test";
    binderState.smartTerrainName = "test-smart";

    binder.save(processor.asNetPacket());

    expect(binder.combatController.save).toHaveBeenCalledWith(processor);

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.U8,
      EMockPacketDataType.U32,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      "save_from_HelicopterBinder",
      "test.ltx",
      "test_filename.ltx",
      "logic",
      "test@test",
      "test-smart",
      -5000,
      255,
      0,
      8,
      10,
    ]);

    const newBinder: HelicopterBinder = new HelicopterBinder(MockGameObject.mock());
    const newBinderState: IRegistryObjectState = registerObject(newBinder.object);

    newBinder.combatController = new HelicopterCombatController(binder.object);

    jest.spyOn(newBinder.combatController, "load").mockImplementation(jest.fn());

    newBinder.load(processor.asNetReader());

    expect(newBinder.combatController.load).toHaveBeenCalledWith(processor);

    expect(newBinderState.jobIni).toBe("test.ltx");
    expect(newBinderState.loadedSectionLogic).toBe("logic");
    expect(newBinderState.loadedActiveSection).toBe("test@test");
    expect(newBinderState.loadedSmartTerrainName).toBe("test-smart");
    expect(newBinderState.loadedIniFilename).toBe("test_filename.ltx");

    expect(newBinder.isLoaded).toBe(true);

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("starts burning below the threshold and removes a mortal helicopter after lethal damage", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);

    binder.reinit();
    binder.net_spawn(MockAlifeObject.mock({ id: object.id() }));
    binder.flameStartHealth = 0.75;
    jest.spyOn(binder.helicopter, "GetfHealth").mockReturnValue(0.5);

    binder.update(16);

    expect(binder.helicopter.StartFlame).toHaveBeenCalledTimes(1);

    jest.spyOn(binder.helicopter, "GetfHealth").mockReturnValue(0);
    binder.update(16);

    expect(binder.helicopter.Die).toHaveBeenCalledTimes(1);
    expect(registry.helicopter.storage.length()).toBe(0);
  });

  it("keeps an immortal helicopter in the registry at lethal health", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);

    binder.reinit();
    binder.net_spawn(MockAlifeObject.mock({ id: object.id() }));
    binder.state.immortal = true;
    jest.spyOn(binder.helicopter, "GetfHealth").mockReturnValue(0);

    binder.update(16);

    expect(binder.helicopter.Die).not.toHaveBeenCalled();
    expect(registry.helicopter.storage.length()).toBe(1);
  });

  it("should correctly handle hit events", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const enemy: GameObject = MockGameObject.mockStalker();
    const binder: HelicopterBinder = new HelicopterBinder(object);
    const state: IRegistryObjectState = registerObject(object);
    const schemeState: ISchemeHitState = mockSchemeState<ISchemeHitState>(EScheme.HIT);

    state.activeScheme = EScheme.HIT;
    setSchemeState(state, EScheme.HIT, schemeState);
    binder.state = state;

    jest.spyOn(binder.helicopterFireController, "onHit").mockImplementation(jest.fn());

    binder.onHit(0.5, 1, 10, enemy.id());

    expect(binder.helicopterFireController.enemy).toBe(enemy);
    expect(binder.helicopterFireController.onHit).toHaveBeenCalledTimes(1);

    expect(emitSchemeEvent).toHaveBeenCalledTimes(1);
    expect(emitSchemeEvent).toHaveBeenCalledWith(schemeState, ESchemeEvent.HIT, object, 0.5, null, enemy, null);
  });

  it("should correctly handle waypoint events", () => {
    const object: GameObject = MockGameObject.mockHelicopter();
    const binder: HelicopterBinder = new HelicopterBinder(object);
    const state: IRegistryObjectState = registerObject(object);
    const schemeState: ISchemeHelicopterMoveState = mockSchemeState(EScheme.HELI_MOVE);

    state.activeScheme = EScheme.HELI_MOVE;
    setSchemeState(state, EScheme.HELI_MOVE, schemeState);

    binder.state = state;
    binder.onWaypoint(10, ZERO_VECTOR, 4);

    expect(emitSchemeEvent).toHaveBeenCalledTimes(1);
    expect(emitSchemeEvent).toHaveBeenCalledWith(schemeState, ESchemeEvent.WAYPOINT, object, null, 4);
  });
});
