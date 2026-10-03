import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { callback, level } from "xray16";
import { GameObject, NetPacket, NetReader, ServerHumanObject } from "xray16/alias";
import { ACTOR_ID, AnyObject, createTime, X_VECTOR, ZERO_VECTOR } from "xray16/lib";
import {
  EMockPacketDataType,
  MockAlifeHumanStalker,
  MockGameObject,
  MockNetProcessor,
  MockObjectBinder,
  MockPatrol,
} from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { StalkerPatrolController } from "@/engine/core/ai/patrol/StalkerPatrolController";
import { StalkerStateController } from "@/engine/core/ai/state";
import { StalkerBinder } from "@/engine/core/binders/creature/StalkerBinder";
import { getManager, IRegistryObjectState, registerObject, registerSimulator, registry } from "@/engine/core/database";
import { DialogManager } from "@/engine/core/managers/dialogs";
import { DropManager } from "@/engine/core/managers/drop";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SoundManager } from "@/engine/core/managers/sounds";
import { invalidateObjectThemes } from "@/engine/core/managers/sounds/utils";
import { TradeManager } from "@/engine/core/managers/trade";
import { syncObjectHitSmartTerrainAlert } from "@/engine/core/objects/smart_terrain/utils";
import { emitSchemeEvent, setupObjectLogicsOnSpawn } from "@/engine/core/schemes/runtime";
import { SchemeHear } from "@/engine/core/schemes/shared/hear";
import { SchemePostCombatIdle } from "@/engine/core/schemes/stalker/combat_idle";
import { SchemeReachTask } from "@/engine/core/schemes/stalker/reach_task";
import { ISchemeWalkerState } from "@/engine/core/schemes/stalker/walker/walker_types";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded/wounded_types";
import { getSchemeStateOptimistic, setSchemeState } from "@/engine/core/schemes/state";
import { EScheme, ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import {
  setupObjectInfoPortions,
  setupObjectStalkerVisual,
  setupSpawnedObjectPosition,
} from "@/engine/core/utils/object";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/sounds/utils");
jest.mock("@/engine/core/objects/smart_terrain/utils");
jest.mock("@/engine/core/utils/object");
jest.mock("@/engine/core/schemes/runtime");

describe("StalkerBinder", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();

    resetFunctionMock(setupObjectLogicsOnSpawn);
    resetFunctionMock(setupSpawnedObjectPosition);
    resetFunctionMock(emitSchemeEvent);
  });

  it("reinitializes registry state, state control, and patrol control", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);

    binder.reinit();

    expect(binder.state).toBe(registry.objects.get(object.id()));
    expect(binder.state.stateController).toBeInstanceOf(StalkerStateController);
    expect(binder.state.patrolController).toBeInstanceOf(StalkerPatrolController);
  });

  it("does not reinitialize spawn info portions after loading", () => {
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const binder: StalkerBinder = new StalkerBinder(object);

    binder.isLoaded = true;

    expect(binder.net_spawn(serverObject)).toBe(true);
    expect(setupObjectInfoPortions).not.toHaveBeenCalled();

    binder.net_destroy();
  });

  it("registers and clears every binder callback", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);

    binder.setupCallbacks();

    expect(object.set_callback).toHaveBeenCalledWith(callback.hit, binder.onHit, binder);
    expect(object.set_callback).toHaveBeenCalledWith(callback.death, binder.onDeath, binder);
    expect(object.set_callback).toHaveBeenCalledWith(callback.use_object, binder.onUse, binder);
    expect(object.set_callback).toHaveBeenCalledWith(callback.sound, binder.onHearSound, binder);

    binder.resetCallbacks();

    expect(object.set_callback).toHaveBeenCalledWith(callback.hit, null);
    expect(object.set_callback).toHaveBeenCalledWith(callback.death, null);
    expect(object.set_callback).toHaveBeenCalledWith(callback.use_object, null);
    expect(object.set_callback).toHaveBeenCalledWith(callback.sound, null);
  });

  it("should correctly handle going online/offline", () => {
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const binder: StalkerBinder = new StalkerBinder(object);

    jest.spyOn(SchemeReachTask, "setup").mockImplementation(jest.fn());
    jest.spyOn(SchemePostCombatIdle, "setup").mockImplementation(jest.fn());

    binder.net_spawn(serverObject);

    expect(registry.objects.length()).toBe(1);
    expect(registry.stalkers.length()).toBe(1);
    expect(registry.helicopter.enemies.length()).toBe(1);

    expect(binder.helicopterEnemyIndex).toBe(0);

    expect(object.set_callback).toHaveBeenCalledTimes(4);
    // todo: check callback calls.

    expect(setupObjectStalkerVisual).toHaveBeenCalledTimes(1);
    expect(setupObjectInfoPortions).toHaveBeenCalledTimes(1);
    expect(setupObjectLogicsOnSpawn).toHaveBeenCalledWith(object, binder.state, ESchemeType.STALKER, false);
    expect(invalidateObjectThemes).not.toHaveBeenCalled();
    expect(SchemeReachTask.setup).toHaveBeenCalledWith(object);
    expect(SchemePostCombatIdle.setup).toHaveBeenCalledWith(object);
    expect(object.group_throw_time_interval).toHaveBeenCalledWith(2000);
    expect(object.apply_loophole_direction_distance).toHaveBeenCalledWith(1);

    expect(setupSpawnedObjectPosition).toHaveBeenCalledTimes(1);
    expect(setupSpawnedObjectPosition).toHaveBeenCalledWith(object, serverObject.m_smart_terrain_id);

    binder.net_destroy();

    expect(registry.objects.length()).toBe(0);
    expect(registry.stalkers.length()).toBe(0);
    expect(registry.helicopter.enemies.length()).toBe(0);
    expect(binder.helicopterEnemyIndex).toBeNull();
    expect(object.set_callback).toHaveBeenCalledWith(callback.use_object, null);
    expect(invalidateObjectThemes).toHaveBeenCalledWith(object.id());
  });

  it("ends the actor's talk when the stalker it talks to goes offline", () => {
    const { actorGameObject } = mockRegisteredActor();
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const binder: StalkerBinder = new StalkerBinder(object);

    binder.net_spawn(serverObject);
    binder.net_destroy();

    expect(actorGameObject.stop_talk).not.toHaveBeenCalled();

    binder.net_spawn(serverObject);
    jest.spyOn(object, "is_talking").mockImplementation(() => true);
    binder.net_destroy();

    expect(actorGameObject.stop_talk).toHaveBeenCalledTimes(1);
  });

  it("does not register or configure a stalker when the engine rejects its spawn", () => {
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const binder: StalkerBinder = new StalkerBinder(object);

    (binder as unknown as MockObjectBinder).canSpawn = false;

    expect(binder.net_spawn(serverObject)).toBe(false);
    expect(registry.objects.length()).toBe(0);
    expect(registry.stalkers.length()).toBe(0);
    expect(registry.helicopter.enemies.length()).toBe(0);
    expect(object.set_callback).not.toHaveBeenCalled();
  });

  it("releases corpse items once during the first dead-object update", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const dropManager: DropManager = getManager(DropManager);

    binder.state = registerObject(object);
    jest.spyOn(object, "alive").mockReturnValue(false);
    jest.spyOn(dropManager, "forceCorpseReleaseItemsSpawn").mockImplementation(jest.fn());
    jest.spyOn(Date, "now").mockReturnValue(0);

    binder.update(16);
    binder.update(16);

    expect(dropManager.forceCorpseReleaseItemsSpawn).toHaveBeenCalledTimes(1);
    expect(dropManager.forceCorpseReleaseItemsSpawn).toHaveBeenCalledWith(object);
  });

  it("recalculates the wound state of a living stalker on update", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const state: IRegistryObjectState = registerObject(object);
    const woundedState: ISchemeWoundedState = mockSchemeState<ISchemeWoundedState>(EScheme.WOUNDED, {
      isWoundedInitialized: true,
    });

    woundedState.woundController = { update: jest.fn() } as AnyObject as WoundController;
    setSchemeState(state, EScheme.WOUNDED, woundedState);
    binder.state = state;

    binder.update(16);
    expect(woundedState.woundController.update).toHaveBeenCalledTimes(1);

    jest.spyOn(object, "alive").mockReturnValue(false);
    binder.update(16);
    expect(woundedState.woundController.update).toHaveBeenCalledTimes(1);
  });

  it("should correctly handle save/load", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const soundManager: SoundManager = getManager(SoundManager);
    const dialogManager: DialogManager = getManager(DialogManager);

    jest.spyOn(tradeManager, "saveObjectState").mockImplementation(jest.fn());
    jest.spyOn(tradeManager, "loadObjectState").mockImplementation(jest.fn());
    jest.spyOn(soundManager, "saveObject").mockImplementation(jest.fn());
    jest.spyOn(soundManager, "loadObject").mockImplementation(jest.fn());
    jest.spyOn(dialogManager, "saveObjectDialogs").mockImplementation(jest.fn());
    jest.spyOn(dialogManager, "loadObjectDialogs").mockImplementation(jest.fn());

    jest.spyOn(Date, "now").mockImplementationOnce(() => 7000);

    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const processor: MockNetProcessor = new MockNetProcessor();

    registerObject(object);

    binder.reinit();

    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activationTime = 5000;
    state.activationGameTime = createTime(2012, 6, 12, 20, 15, 30, 500);
    state.jobIni = "job_ini.ltx";
    state.iniFilename = "ini.ltx";
    state.sectionLogic = "logic";
    state.activeSection = "scheme@section";
    state.smartTerrainName = "some_smart";

    const packet: NetPacket = processor.asNetPacket();

    binder.save(packet);

    expect(tradeManager.saveObjectState).toHaveBeenCalledWith(object, packet);
    expect(soundManager.saveObject).toHaveBeenCalledWith(object, packet);
    expect(dialogManager.saveObjectDialogs).toHaveBeenCalledWith(object, packet);

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      "save_from_StalkerBinder",
      "job_ini.ltx",
      "ini.ltx",
      "logic",
      "scheme@section",
      "some_smart",
      -2000,
      12,
      6,
      12,
      20,
      15,
      30,
      500,
      0,
      14,
      16,
    ]);

    const reader: NetReader = processor.asNetReader();

    binder.load(reader);

    expect(tradeManager.loadObjectState).toHaveBeenCalledWith(object, reader);
    expect(soundManager.loadObject).toHaveBeenCalledWith(object, reader);
    expect(dialogManager.loadObjectDialogs).toHaveBeenCalledWith(object, reader);

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should correctly update torch light state", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const torch: GameObject = MockGameObject.mock();

    registerObject(object);
    jest.spyOn(object, "object").mockImplementation(() => torch);

    // Daytime, outdoors, no light zone, alive, no enemy => torch must be turned OFF (was never turned off before).
    binder.updateLightState(object);
    expect(torch.enable_attachable_item).toHaveBeenLastCalledWith(false);

    // Night => torch must be turned ON.
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 23);
    binder.updateLightState(object);
    expect(torch.enable_attachable_item).toHaveBeenLastCalledWith(true);
  });

  it("unregisters a dead stalker and releases all binder callbacks", () => {
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const binder: StalkerBinder = new StalkerBinder(object);
    const eventsManager: EventsManager = getManager(EventsManager);

    binder.net_spawn(serverObject);
    jest.spyOn(binder, "onHit").mockImplementation(jest.fn());
    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    binder.onDeath(object, null);

    expect(registry.stalkers.length()).toBe(0);
    expect(registry.helicopter.enemies.length()).toBe(0);
    expect(object.set_callback).toHaveBeenCalledWith(callback.use_object, null);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.STALKER_DEATH, object, null);
  });

  it("should handle hear event", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);

    jest.spyOn(SchemeHear, "onObjectHearSound").mockImplementation(jest.fn());

    // Do not listen for self.
    binder.onHearSound(object, object.id(), 128, X_VECTOR, 10);
    expect(SchemeHear.onObjectHearSound).not.toHaveBeenCalled();

    // Do not listen when dead.
    jest.spyOn(object, "alive").mockImplementationOnce(() => false);
    binder.onHearSound(object, ACTOR_ID, 128, X_VECTOR, 10);
    expect(SchemeHear.onObjectHearSound).not.toHaveBeenCalled();

    binder.onHearSound(object, ACTOR_ID, 128, X_VECTOR, 10);
    expect(SchemeHear.onObjectHearSound).toHaveBeenCalledWith(object, ACTOR_ID, 128, X_VECTOR, 10);
  });

  it("emits an interaction event and resets dialog phrases when used alive", () => {
    const object: GameObject = MockGameObject.mock();
    const user: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const eventsManager: EventsManager = getManager(EventsManager);
    const dialogManager: DialogManager = getManager(DialogManager);

    binder.state = registerObject(object);
    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());
    jest.spyOn(dialogManager, "resetObjectPhrases").mockImplementation(jest.fn());

    binder.onUse(object, user);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.STALKER_INTERACTION, object, user);
    expect(dialogManager.resetObjectPhrases).toHaveBeenCalledWith(object.id());
  });

  it("forwards patrol extrapolation to the active scheme and patrol controller", () => {
    const object: GameObject = MockGameObject.mock();
    const binder: StalkerBinder = new StalkerBinder(object);
    const state: IRegistryObjectState = registerObject(object);
    const schemeState: ISchemeWalkerState = mockSchemeState<ISchemeWalkerState>(EScheme.WALKER);

    MockPatrol.setup({
      "binder-patrol": {
        points: [{ name: "point-0", gvid: 0, lvid: 0, position: object.position() as any, flag: 0 }],
      },
    });
    state.activeScheme = EScheme.WALKER;
    jest.spyOn(object, "patrol").mockReturnValue("binder-patrol");
    setSchemeState(state, EScheme.WALKER, schemeState);
    state.patrolController = new StalkerPatrolController(object).initialize();
    binder.state = state;
    jest.spyOn(state.patrolController, "onExtrapolate").mockImplementation(jest.fn());

    expect(binder.onPatrolExtrapolate(0)).toBe(true);
    expect(state.patrolController.onExtrapolate).toHaveBeenCalledWith(object, 0);
    expect(emitSchemeEvent).toHaveBeenCalledWith(schemeState, ESchemeEvent.EXTRAPOLATE, 0);
  });

  it("should correctly handle hit event", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mock({ health: 0.01 });
    const state: IRegistryObjectState = registerObject(object);
    const binder: StalkerBinder = new StalkerBinder(object);
    const manager: EventsManager = getManager(EventsManager);

    binder.state = state;

    jest.spyOn(manager, "emitEvent").mockImplementation(jest.fn());

    state.activeScheme = EScheme.ANIMPOINT;
    setSchemeState(state, EScheme.ANIMPOINT, mockSchemeState(EScheme.ANIMPOINT));
    setSchemeState(state, EScheme.COMBAT_IGNORE, mockSchemeState(EScheme.COMBAT_IGNORE));
    setSchemeState(state, EScheme.COMBAT, mockSchemeState(EScheme.COMBAT));
    setSchemeState(state, EScheme.HIT, mockSchemeState(EScheme.HIT));
    setSchemeState(state, EScheme.WOUNDED, mockSchemeState(EScheme.WOUNDED));
    getSchemeStateOptimistic(state, EScheme.WOUNDED).woundController = {
      onHit: jest.fn(),
    } as AnyObject as WoundController;

    binder.onHit(object, 1000, ZERO_VECTOR, actorGameObject, 10);

    expect(object.health).toBeCloseTo(0.16);

    expect(syncObjectHitSmartTerrainAlert).toHaveBeenCalledWith(object);

    expect(getSchemeStateOptimistic(state, EScheme.WOUNDED).woundController.onHit).toHaveBeenCalledTimes(1);

    expect(manager.emitEvent).toHaveBeenCalledTimes(1);
    expect(manager.emitEvent).toHaveBeenCalledWith(
      EGameEvent.STALKER_HIT,
      object,
      1000,
      ZERO_VECTOR,
      actorGameObject,
      10
    );

    expect(emitSchemeEvent).toHaveBeenCalledTimes(4);
    expect(emitSchemeEvent).toHaveBeenCalledWith(
      getSchemeStateOptimistic(state, EScheme.ANIMPOINT),
      ESchemeEvent.HIT,
      object,
      1000,
      ZERO_VECTOR,
      actorGameObject,
      10
    );
    expect(emitSchemeEvent).toHaveBeenCalledWith(
      getSchemeStateOptimistic(state, EScheme.COMBAT_IGNORE),
      ESchemeEvent.HIT,
      object,
      1000,
      ZERO_VECTOR,
      actorGameObject,
      10
    );
    expect(emitSchemeEvent).toHaveBeenCalledWith(
      getSchemeStateOptimistic(state, EScheme.COMBAT),
      ESchemeEvent.HIT,
      object,
      1000,
      ZERO_VECTOR,
      actorGameObject,
      10
    );
    expect(emitSchemeEvent).toHaveBeenCalledWith(
      getSchemeStateOptimistic(state, EScheme.HIT),
      ESchemeEvent.HIT,
      object,
      1000,
      ZERO_VECTOR,
      actorGameObject,
      10
    );
  });
});
