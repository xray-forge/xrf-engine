import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, get_hud, level } from "xray16";
import { GameHud, GameObject, Time } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager, registerActor, registry } from "@/engine/core/database";
import { EActiveItemSlot } from "@/engine/core/managers/actor";
import { EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor/actor_input_types";
import { actorConfig } from "@/engine/core/managers/actor/ActorConfig";
import { ActorInputManager } from "@/engine/core/managers/actor/ActorInputManager";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("ActorInputManager", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();

    actorConfig.IS_WEAPON_HIDDEN = false;
    actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG = false;
  });

  it("should correctly initialize and destroy", () => {
    getManager(ActorInputManager);

    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(4);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_FIRST_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_ONLINE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);

    disposeManager(ActorInputManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should persist and restore all control state through the actor input packet", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    registerActor(MockGameObject.mock());
    replaceFunctionMock(registry.actor.active_slot, () => 10);

    manager.setInactiveInputTime(10);
    manager.acquireControl(EActorControlHandle.TRAVEL, "travel", EActorControlPolicy.INPUT_AND_INDICATORS);
    manager.disableGameUi(true);

    manager.save(processor.asNetPacket());

    const savedDataOrder: Array<EMockPacketDataType> = [...processor.writeDataOrder];
    const savedData: Array<unknown> = [...processor.dataList];

    expect(savedDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U16,
    ]);
    expect(savedData).toEqual([
      true,
      12,
      6,
      12,
      9,
      30,
      0,
      0,
      10,
      10,
      10,
      3,
      "timed",
      "timed",
      EActorControlPolicy.INPUT,
      false,
      "travel",
      "travel",
      EActorControlPolicy.INPUT_AND_INDICATORS,
      false,
      "script-ui",
      "script-ui",
      EActorControlPolicy.FULL_UI,
      true,
      24,
    ]);

    disposeManager(ActorInputManager);

    const newActorInputManager: ActorInputManager = getManager(ActorInputManager);

    newActorInputManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newActorInputManager).not.toBe(manager);

    jest.clearAllMocks();
    newActorInputManager.onFirstUpdate();

    expect(registry.actor.activate_slot).toHaveBeenCalledWith(10);

    const restoredProcessor: MockNetProcessor = new MockNetProcessor();

    newActorInputManager.save(restoredProcessor.asNetPacket());

    // The travel lock is dropped on load, as no travel goes on after it.
    expect(restoredProcessor.writeDataOrder).toEqual([...savedDataOrder.slice(0, 16), ...savedDataOrder.slice(20)]);
    expect(restoredProcessor.dataList).toEqual([
      ...savedData.slice(0, 11),
      2,
      ...savedData.slice(12, 16),
      ...savedData.slice(20, 24),
      // Marker of the saved size, short of the dropped lock.
      20,
    ]);

    jest.clearAllMocks();

    jest.spyOn(registry.actor, "item_in_slot").mockReturnValue(MockGameObject.mock());
    newActorInputManager.releaseGameUiControl(EActorControlHandle.SCRIPT_UI, true);

    expect(level.disable_input).toHaveBeenCalledTimes(1);
    expect(level.enable_input).not.toHaveBeenCalled();
    expect(registry.actor.activate_slot).toHaveBeenCalledWith(10);

    newActorInputManager.releaseControl(EActorControlHandle.TIMED, false);

    expect(level.enable_input).toHaveBeenCalledTimes(1);
  });

  it("should drop locks of sequences not resumed after load, giving back the item slot they put away", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    replaceFunctionMock(registry.actor.active_slot, () => EActiveItemSlot.PRIMARY);

    manager.acquireControl(EActorControlHandle.ANABIOTIC, "anabiotic", EActorControlPolicy.UI_ONLY, true);
    manager.acquireControl(EActorControlHandle.SLEEP, "sleep", EActorControlPolicy.FULL_UI);

    expect(registry.actor.activate_slot).toHaveBeenCalledWith(EActiveItemSlot.NONE);

    replaceFunctionMock(registry.actor.active_slot, () => EActiveItemSlot.NONE);

    manager.save(processor.asNetPacket());

    disposeManager(ActorInputManager);

    const newManager: ActorInputManager = getManager(ActorInputManager);

    jest.clearAllMocks();
    newManager.load(processor.asNetReader());

    expect(processor.dataList).toHaveLength(0);
    expect(level.enable_input).toHaveBeenCalledTimes(1);
    expect(level.disable_input).not.toHaveBeenCalled();

    newManager.onFirstUpdate();

    expect(registry.actor.activate_slot).toHaveBeenCalledWith(EActiveItemSlot.PRIMARY);
  });

  it("should correctly toggle inactive input state", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.setInactiveInputTime(7_000);
    expect(level.disable_input).toHaveBeenCalledTimes(1);

    manager.releaseControl(EActorControlHandle.TIMED, false);
    expect(level.enable_input).toHaveBeenCalledTimes(1);
  });

  it("should correctly toggle night vision state", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const torch: GameObject = MockGameObject.mock({ section: "device_torch" });

    manager.enableActorNightVision();
    expect(actorConfig.IS_NIGHT_VISION_TURNED_OFF).toBe(false);

    const inventory: Map<string | number, GameObject> = MockGameObject.asMock(registry.actor).objectInventory;

    inventory.set("device_torch", torch);

    // Night vision is off and no restore is owed:
    manager.enableActorNightVision();
    expect(actorConfig.IS_NIGHT_VISION_TURNED_OFF).toBe(false);
    expect(torch.enable_night_vision).not.toHaveBeenCalled();

    // Night vision is currently on -> disabling turns it off and records that a restore is owed:
    jest.spyOn(torch, "night_vision_enabled").mockImplementation(() => true);

    manager.disableActorNightVision();
    expect(actorConfig.IS_NIGHT_VISION_TURNED_OFF).toBe(true);
    expect(torch.enable_night_vision).toHaveBeenCalledTimes(1);
    expect(torch.enable_night_vision).toHaveBeenNthCalledWith(1, false);

    // Night vision is off again with a restore owed -> enabling restores it and clears the flag:
    jest.spyOn(torch, "night_vision_enabled").mockImplementation(() => false);

    manager.enableActorNightVision();
    expect(actorConfig.IS_NIGHT_VISION_TURNED_OFF).toBe(false);
    expect(torch.enable_night_vision).toHaveBeenCalledTimes(2);
    expect(torch.enable_night_vision).toHaveBeenNthCalledWith(2, true);
  });

  it("should correctly toggle torch state", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const torch: GameObject = MockGameObject.mock({ section: "device_torch" });

    manager.enableActorTorch();
    expect(actorConfig.IS_TORCH_TURNED_OFF).toBe(false);

    const inventory: Map<string | number, GameObject> = MockGameObject.asMock(registry.actor).objectInventory;

    inventory.set("device_torch", torch);

    // Torch is off and was not turned off by a lock, so it stays off:
    manager.enableActorTorch();
    expect(actorConfig.IS_TORCH_TURNED_OFF).toBe(false);
    expect(torch.enable_torch).not.toHaveBeenCalled();

    // Torch is on -> disabling turns it off and records that a restore is owed:
    jest.spyOn(torch, "torch_enabled").mockImplementation(() => true);

    manager.disableActorTorch();
    expect(actorConfig.IS_TORCH_TURNED_OFF).toBe(true);
    expect(torch.enable_torch).toHaveBeenCalledTimes(1);
    expect(torch.enable_torch).toHaveBeenNthCalledWith(1, false);

    // Torch is off again with a restore owed -> enabling restores it and clears the flag:
    jest.spyOn(torch, "torch_enabled").mockImplementation(() => false);

    manager.enableActorTorch();
    expect(actorConfig.IS_TORCH_TURNED_OFF).toBe(false);
    expect(torch.enable_torch).toHaveBeenCalledTimes(2);
    expect(torch.enable_torch).toHaveBeenNthCalledWith(2, true);
  });

  it("should correctly disable and enable game UI", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const hud: GameHud = get_hud();

    jest.spyOn(registry.actor, "active_slot").mockReturnValue(EActiveItemSlot.PRIMARY);
    jest.spyOn(registry.actor, "item_in_slot").mockReturnValue(MockGameObject.mock());

    manager.disableGameUi(true);

    expect(level.show_weapon).toHaveBeenCalledWith(false);
    expect(level.disable_input).toHaveBeenCalledTimes(1);
    expect(level.hide_indicators_safe).toHaveBeenCalledTimes(1);
    expect(hud.HideActorMenu).toHaveBeenCalledTimes(1);
    expect(hud.HidePdaMenu).toHaveBeenCalledTimes(1);
    expect(registry.actor.activate_slot).toHaveBeenCalledWith(EActiveItemSlot.NONE);

    manager.enableGameUi(true);

    expect(level.show_weapon).toHaveBeenCalledWith(true);
    expect(level.enable_input).toHaveBeenCalledTimes(1);
    expect(level.show_indicators).toHaveBeenCalledTimes(1);
    expect(registry.actor.activate_slot).toHaveBeenLastCalledWith(EActiveItemSlot.PRIMARY);
  });

  it("should give back the item slot a UI-only lock put away once released with restore", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(registry.actor, "active_slot").mockReturnValue(EActiveItemSlot.PRIMARY);
    jest.spyOn(registry.actor, "item_in_slot").mockReturnValue(MockGameObject.mock());

    manager.acquireControl(EActorControlHandle.SURGE, "surge", EActorControlPolicy.UI_ONLY, true);

    expect(registry.actor.activate_slot).toHaveBeenCalledWith(EActiveItemSlot.NONE);

    manager.releaseGameUiControl(EActorControlHandle.SURGE, true);

    expect(registry.actor.activate_slot).toHaveBeenLastCalledWith(EActiveItemSlot.PRIMARY);
  });

  it("should keep the active item slot under a UI-only lock that does not reset it", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(registry.actor, "active_slot").mockReturnValue(EActiveItemSlot.PRIMARY);

    manager.acquireControl(EActorControlHandle.OUTRO, "outro", EActorControlPolicy.UI_ONLY, false);

    expect(level.show_weapon).toHaveBeenCalledWith(false);
    expect(registry.actor.activate_slot).not.toHaveBeenCalled();
  });

  it("should expire timed input and restore dialog and no-weapon state on update", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.setInactiveInputTime(1);

    jest.spyOn(game, "get_game_time").mockReturnValue({ diffSec: () => 1 } as unknown as Time);
    jest.spyOn(registry.actor, "is_talking").mockReturnValue(true);
    registry.noWeaponZones.set(1, true);

    manager.onUpdate(0);

    expect(level.enable_input).toHaveBeenCalledTimes(1);
    expect(registry.actor.hide_weapon).toHaveBeenCalledTimes(2);
    expect(actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG).toBe(true);
    expect(actorConfig.IS_WEAPON_HIDDEN).toBe(true);

    jest.spyOn(registry.actor, "is_talking").mockReturnValue(false);
    registry.noWeaponZones.delete(1);

    manager.onUpdate(0);

    expect(registry.actor.restore_weapon).toHaveBeenCalledTimes(2);
    expect(actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG).toBe(false);
    expect(actorConfig.IS_WEAPON_HIDDEN).toBe(false);
  });

  it("should correctly handle first update event", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.onFirstUpdate();

    expect(registry.actor.activate_slot).toHaveBeenNthCalledWith(1, EActiveItemSlot.PRIMARY);
  });

  it("should correctly handle network spawn event", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI, true);

    jest.clearAllMocks();

    manager.onActorGoOnline();

    expect(level.disable_input).toHaveBeenCalledTimes(1);
    expect(level.enable_input).toHaveBeenCalledTimes(0);

    manager.releaseControl(EActorControlHandle.SCRIPT_UI, false);

    jest.clearAllMocks();

    manager.onActorGoOnline();
    expect(level.enable_input).toHaveBeenCalledTimes(1);
  });

  it("keeps input disabled until every independent control owner releases its lock", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.acquireControl(EActorControlHandle.TRAVEL, "travel", EActorControlPolicy.INPUT_AND_INDICATORS);
    manager.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI, true);
    manager.releaseControl(EActorControlHandle.TRAVEL);

    expect(level.enable_input).not.toHaveBeenCalled();
    expect(level.disable_input).toHaveBeenCalledTimes(3);

    manager.releaseControl(EActorControlHandle.SCRIPT_UI);

    expect(level.enable_input).toHaveBeenCalledTimes(1);
  });

  it("restores the UI without enabling input when an input-only lock remains", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.acquireControl(EActorControlHandle.TIMED, "timed", EActorControlPolicy.INPUT);
    manager.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI, true);
    manager.releaseGameUiControl(EActorControlHandle.SCRIPT_UI);

    expect(level.enable_input).not.toHaveBeenCalled();
    expect(level.show_indicators).toHaveBeenCalledTimes(1);

    manager.releaseControl(EActorControlHandle.TIMED, false);
    expect(level.enable_input).toHaveBeenCalledTimes(1);
  });

  it("should list the owners of the active control locks", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    expect(manager.getActiveControlHandles()).toEqualLuaArrays([]);

    manager.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI);
    manager.acquireControl(EActorControlHandle.TIMED, "timed", EActorControlPolicy.INPUT);

    expect(manager.getActiveControlHandles()).toEqualLuaArrays([
      EActorControlHandle.SCRIPT_UI,
      EActorControlHandle.TIMED,
    ]);

    manager.releaseControl(EActorControlHandle.SCRIPT_UI);

    expect(manager.getActiveControlHandles()).toEqualLuaArrays([EActorControlHandle.TIMED]);
  });

  it("should correctly handle keyboard input event", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    expect(manager.onKeyPress(1, 2)).toBe(false);
  });

  it("should correctly handle debug dump event", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ ActorInputManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ ActorInputManager: expect.any(Object) });
  });
});
