import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_hud, hit, level, time_global } from "xray16";
import { ESoundObjectType } from "xray16/alias";
import { NIL } from "xray16/lib";
import { EMockPacketDataType, MockNetProcessor } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager, isManagerInitialized, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { PhantomManager } from "@/engine/core/managers/psy/PhantomManager";
import { IPsyZoneEffects } from "@/engine/core/managers/psy/psy_antenna_types";
import { psyAntennaConfig } from "@/engine/core/managers/psy/PsyAntennaConfig";
import { PsyAntennaManager } from "@/engine/core/managers/psy/PsyAntennaManager";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

function mockZoneEffects(base: Partial<IPsyZoneEffects> = {}): IPsyZoneEffects {
  return {
    intensity: 1,
    postprocess: NIL,
    hitIntensity: 2,
    phantomProb: 0.5,
    muteSoundThreshold: 3,
    noStatic: false,
    noMumble: false,
    hitType: "wound",
    hitFreq: 5,
    ...base,
  };
}

describe("PsyAntennaManager", () => {
  beforeEach(() => {
    resetRegistry();

    resetFunctionMock(level.add_pp_effector);
    resetFunctionMock(level.set_pp_effector_factor);
    resetFunctionMock(level.remove_pp_effector);
    resetFunctionMock(level.spawn_phantom);
    resetFunctionMock(get_hud().enable_fake_indicators);
  });

  it("should register and unregister event callbacks during its lifecycle", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);

    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_OFFLINE)).toBe(1);

    disposeManager(PsyAntennaManager);

    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(0);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_OFFLINE)).toBe(0);
    expect(manager.soundObjectLeft.stop).toHaveBeenCalledTimes(1);
    expect(manager.soundObjectRight.stop).toHaveBeenCalledTimes(1);
    expect(level.set_snd_volume).toHaveBeenCalledWith(manager.initialSoundVolume);
    expect(get_hud().enable_fake_indicators).toHaveBeenCalledWith(false);
  });

  it("should add up the effects of the zones the actor is in", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);

    manager.addZoneEffects(mockZoneEffects());
    manager.addZoneEffects(mockZoneEffects({ hitType: "chemical", hitFreq: 7, noStatic: true, noMumble: true }));

    expect(manager.zonesCount).toBe(2);
    expect(manager.soundIntensityBase).toBe(2);
    expect(manager.muteSoundThreshold).toBe(6);
    expect(manager.hitIntensity).toBe(4);
    expect(manager.phantomSpawnProbability).toBeCloseTo(1);
    expect(manager.hitType).toBe("chemical");
    expect(manager.hitFreq).toBe(7);
    expect(manager.noStatic).toBe(true);
    expect(manager.noMumble).toBe(true);
    expect(get_hud().enable_fake_indicators).toHaveBeenCalledWith(true);
    expect(level.add_pp_effector).not.toHaveBeenCalled();

    manager.removeZoneEffects(mockZoneEffects());
    manager.removeZoneEffects(mockZoneEffects());

    expect(manager.zonesCount).toBe(0);
    expect(manager.soundIntensityBase).toBe(0);
    expect(manager.muteSoundThreshold).toBe(0);
    expect(manager.hitIntensity).toBe(0);
    expect(manager.phantomSpawnProbability).toBeCloseTo(0);
  });

  it("should keep psy indicators while the actor is still inside another zone", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);
    const hud = get_hud();

    manager.addZoneEffects(mockZoneEffects());
    manager.addZoneEffects(mockZoneEffects());
    manager.removeZoneEffects(mockZoneEffects());

    expect(hud.enable_fake_indicators).toHaveBeenLastCalledWith(true);

    manager.removeZoneEffects(mockZoneEffects());

    expect(hud.enable_fake_indicators).toHaveBeenLastCalledWith(false);
  });

  it("should start a zone post process once and share it between zones", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);
    const id: number = psyAntennaConfig.POSTPROCESS_BASE_ID + 1;

    manager.addZoneEffects(mockZoneEffects({ postprocess: "psy.ppe" }));
    manager.addZoneEffects(mockZoneEffects({ postprocess: "psy.ppe", intensity: 2 }));

    expect(manager.postprocess.get("psy.ppe")).toEqual({ intensityBase: 3, intensity: 0, id });
    expect(manager.postprocessLastId).toBe(id);
    expect(level.add_pp_effector).toHaveBeenCalledTimes(1);
    expect(level.add_pp_effector).toHaveBeenCalledWith("psy.ppe", id, true);
    expect(level.set_pp_effector_factor).toHaveBeenCalledWith(id, 0.01);

    manager.removeZoneEffects(mockZoneEffects({ postprocess: "psy.ppe", intensity: 2 }));

    expect(manager.postprocess.get("psy.ppe").intensityBase).toBe(1);

    manager.removeZoneEffects(mockZoneEffects({ postprocess: "other.ppe" }));

    expect(manager.postprocess.has("other.ppe")).toBe(false);
  });

  it("should save and load its state", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.zonesCount = 2;
    manager.hitIntensity = 0.6;
    manager.soundIntensity = 0.4;
    manager.soundIntensityBase = 0.8;
    manager.muteSoundThreshold = 0.2;
    manager.phantomSpawnProbability = 0.3;
    manager.noStatic = true;
    manager.noMumble = true;
    manager.hitType = "chemical";
    manager.hitFreq = 1_500;
    manager.postprocess.set("first.ppe", { intensity: 0.4, intensityBase: 0.8, id: 1501 });
    manager.postprocess.set("second.ppe", { intensity: 0.2, intensityBase: 0.3, id: 1505 });

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder.slice(0, 11)).toEqual([
      EMockPacketDataType.U8,
      EMockPacketDataType.F32,
      EMockPacketDataType.F32,
      EMockPacketDataType.F32,
      EMockPacketDataType.F32,
      EMockPacketDataType.F32,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U32,
      EMockPacketDataType.U8,
    ]);

    disposeManager(PsyAntennaManager);

    const loadedManager: PsyAntennaManager = getManager(PsyAntennaManager);

    loadedManager.load(processor.asNetReader());

    expect(loadedManager.zonesCount).toBe(2);
    expect(loadedManager.hitIntensity).toBe(0.6);
    expect(loadedManager.soundIntensity).toBe(0.4);
    expect(loadedManager.soundIntensityBase).toBe(0.8);
    expect(loadedManager.muteSoundThreshold).toBe(0.2);
    expect(loadedManager.phantomSpawnProbability).toBe(0.3);
    expect(loadedManager.noStatic).toBe(true);
    expect(loadedManager.noMumble).toBe(true);
    expect(loadedManager.hitType).toBe("chemical");
    expect(loadedManager.hitFreq).toBe(1_500);
    expect(loadedManager.postprocess.get("first.ppe")).toEqual({ intensity: 0.4, intensityBase: 0.8, id: 1501 });
    expect(loadedManager.postprocess.get("second.ppe")).toEqual({ intensity: 0.2, intensityBase: 0.3, id: 1505 });
    // Post process ids continue after the highest loaded one.
    expect(loadedManager.postprocessLastId).toBe(1505);
    expect(level.add_pp_effector).toHaveBeenCalledWith("second.ppe", 1505, true);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should save and restore the static manager state", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.hitIntensity = 0.75;

    PsyAntennaManager.save(processor.asNetPacket());
    disposeManager(PsyAntennaManager);

    PsyAntennaManager.load(processor.asNetReader());

    expect(isManagerInitialized(PsyAntennaManager)).toBe(true);
    expect(getManager(PsyAntennaManager).hitIntensity).toBe(0.75);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should move sound and post-process intensities towards the zone ones", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);

    jest.spyOn(manager, "generatePhantoms").mockImplementation(jest.fn());
    jest.spyOn(manager, "updateSound").mockImplementation(jest.fn());
    jest.spyOn(manager, "updatePsyHit").mockImplementation(jest.fn());

    manager.soundIntensity = 0;
    manager.soundIntensityBase = 1;
    manager.postprocess.set("psy.ppe", { intensity: 0, intensityBase: 1, id: 1501 });
    manager.postprocess.set("ended.ppe", { intensity: 0.01, intensityBase: 0, id: 1502 });

    manager.update(100);

    expect(manager.soundIntensity).toBe(0.05);
    expect(manager.updateSound).toHaveBeenCalledTimes(1);
    expect(manager.postprocess.get("psy.ppe").intensity).toBe(0.05);
    expect(level.set_pp_effector_factor).toHaveBeenCalledWith(1501, 0.05, 0.3);
    // Within one step of the target, intensity reaches it and the faded post process ends.
    expect(manager.postprocess.has("ended.ppe")).toBe(false);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(1502);
    expect(manager.updatePsyHit).toHaveBeenCalledWith(100);
  });

  it("should not update mumble sound when zones mute it", () => {
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);

    jest.spyOn(manager, "generatePhantoms").mockImplementation(jest.fn());
    jest.spyOn(manager, "updateSound").mockImplementation(jest.fn());
    jest.spyOn(manager, "updatePsyHit").mockImplementation(jest.fn());

    manager.noMumble = true;
    manager.soundIntensityBase = 1;

    manager.update(100);

    expect(manager.soundIntensity).toBe(0);
    expect(manager.updateSound).not.toHaveBeenCalled();
  });

  it("should create phantoms after the idle delay when below the configured limit", () => {
    mockRegisteredActor();

    const manager: PsyAntennaManager = getManager(PsyAntennaManager);
    const phantomManager: PhantomManager = getManager(PhantomManager);

    (time_global as unknown as jest.Mock).mockReturnValue(1);
    jest.spyOn(math, "random").mockReturnValue(0);
    jest.spyOn(phantomManager, "spawnPhantom");

    manager.lastPhantomRollAt = 0;
    manager.phantomRollDelay = 0;
    manager.phantomSpawnProbability = 1;
    phantomManager.phantomsCount = psyAntennaConfig.PHANTOM_MAX_COUNT;

    manager.generatePhantoms();

    expect(manager.lastPhantomRollAt).toBe(1);
    expect(phantomManager.spawnPhantom).not.toHaveBeenCalled();

    (time_global as unknown as jest.Mock).mockReturnValue(2);
    manager.phantomRollDelay = 0;
    phantomManager.phantomsCount = psyAntennaConfig.PHANTOM_MAX_COUNT - 1;

    manager.generatePhantoms();

    expect(phantomManager.spawnPhantom).toHaveBeenCalledTimes(1);
  });

  it("should apply configured psy hits to the actor", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: PsyAntennaManager = getManager(PsyAntennaManager);

    (time_global as unknown as jest.Mock).mockReturnValue(1);
    manager.hitIntensity = 0.5;
    manager.hitFreq = 0;

    manager.updatePsyHit(0);

    expect(actorGameObject.hit).toHaveBeenCalledWith(
      expect.objectContaining({
        draftsman: actorGameObject,
        power: 0.5 * psyAntennaConfig.HIT_AMPLITUDE,
        type: hit.telepatic,
      })
    );
  });

  it("should play both psy voice channels looped", () => {
    mockRegisteredActor();

    const psyAntennaManager: PsyAntennaManager = getManager(PsyAntennaManager);

    psyAntennaManager.updateSound();
    psyAntennaManager.updateSound();

    // Both channels must be looped (S2D + LOOPED), started once.
    const loopedFlags: number = ESoundObjectType.S2D + ESoundObjectType.LOOPED;

    expect(psyAntennaManager.soundObjectLeft.play_at_pos).toHaveBeenCalledTimes(1);
    expect(psyAntennaManager.soundObjectLeft.play_at_pos).toHaveBeenCalledWith(
      registry.actor,
      expect.anything(),
      0,
      loopedFlags
    );
    expect(psyAntennaManager.soundObjectRight.play_at_pos).toHaveBeenCalledWith(
      registry.actor,
      expect.anything(),
      0,
      loopedFlags
    );
  });

  it("should dispose itself once the actor goes offline", () => {
    getManager(PsyAntennaManager);

    expect(table.size(registry.managers)).toBe(2);
    expect(isManagerInitialized(PsyAntennaManager)).toBe(true);

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_OFFLINE);

    expect(table.size(registry.managers)).toBe(1);
    expect(isManagerInitialized(PsyAntennaManager)).toBe(false);
    expect(getManager(EventsManager).getEventSubscribersCount(EGameEvent.ACTOR_GO_OFFLINE)).toBe(0);
  });
});
