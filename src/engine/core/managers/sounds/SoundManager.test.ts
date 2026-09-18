import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { ACTOR_ID, AnyObject, NIL } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockIniFile, MockNetProcessor } from "xray16/mocks";

import { disposeManager, getManager } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { AbstractPlayableSound, ObjectSound } from "@/engine/core/managers/sounds/objects";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { SCRIPT_SOUND_LTX, soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { readIniThemesList } from "@/engine/core/managers/sounds/utils";
import { resetRegistry } from "@/fixtures/engine";

describe("SoundManager", () => {
  beforeEach(() => {
    resetRegistry();

    soundsConfig.themes = readIniThemesList(SCRIPT_SOUND_LTX);
    soundsConfig.playing = new LuaTable();
    soundsConfig.looped = new LuaTable();
  });

  it("should create independent random spatial sounds without starting theme playback", () => {
    const theme = new ObjectSound(MockIniFile.mock("spatial.ltx", { spatial: { path: "some/path" } }), "spatial");

    theme.soundPaths.set(1, "sounds/first");
    theme.soundPaths.set(2, "sounds/second");
    soundsConfig.themes.set("spatial", theme);

    const random = jest.spyOn(math, "random").mockReturnValueOnce(2).mockReturnValueOnce(1);
    const manager = getManager(SoundManager);
    const first = manager.createSpatialSound("spatial");
    const second = manager.createSpatialSound("spatial");

    expect(first).toEqual(expect.objectContaining({ path: "sounds/second" }));
    expect(second).toEqual(expect.objectContaining({ path: "sounds/first" }));
    expect(first).not.toBe(second);
    expect(first.play_at_pos).not.toHaveBeenCalled();
    expect(second.play_at_pos).not.toHaveBeenCalled();
    expect(random).toHaveBeenCalledWith(1, 2);
    expect(theme.playback.length()).toBe(0);
    expect(soundsConfig.playing.length()).toBe(0);
    expect(soundsConfig.looped.length()).toBe(0);

    random.mockRestore();
  });

  it("should reject unknown and non-spatial themes before creating spatial sounds", () => {
    const manager = getManager(SoundManager);

    expect(() => manager.createSpatialSound("missing-spatial-theme")).toThrow(
      "Expected a registered 3D sound theme, got 'missing-spatial-theme'."
    );
    expect(() => manager.createSpatialSound("attack_begin")).toThrow("Expected a registered 3D sound theme");
  });

  it("should correctly initialize and destroy", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    getManager(SoundManager);

    expect(eventsManager.getSubscribersCount()).toBe(3);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_OFFLINE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);

    disposeManager(SoundManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle object updates with no sounds", () => {
    const object: GameObject = MockGameObject.mock();

    expect(() => getManager(SoundManager).update(object.id())).not.toThrow();
  });

  it("should correctly handle object updates with playing sounds", () => {
    const object: GameObject = MockGameObject.mock();
    const sound = {
      isPlaying: jest.fn(() => true),
      onSoundPlayEnded: jest.fn(),
    };

    soundsConfig.playing.set(object.id(), sound as unknown as AbstractPlayableSound);

    getManager(SoundManager).update(object.id());

    expect(sound.isPlaying).toHaveBeenCalledTimes(1);
    expect(sound.onSoundPlayEnded).toHaveBeenCalledTimes(0);
    expect(soundsConfig.playing.length()).toBe(1);
  });

  it("should correctly handle object updates with playing sounds", () => {
    const object: GameObject = MockGameObject.mock();
    const sound = {
      isPlaying: jest.fn(() => false),
      onSoundPlayEnded: jest.fn(),
    };

    soundsConfig.playing.set(object.id(), sound as unknown as AbstractPlayableSound);

    getManager(SoundManager).update(object.id());

    expect(sound.isPlaying).toHaveBeenCalledTimes(1);
    expect(sound.onSoundPlayEnded).toHaveBeenCalledTimes(1);
    expect(soundsConfig.playing.length()).toBe(0);
  });

  it("should correctly save/load data with default state", () => {
    const manager: SoundManager = getManager(SoundManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([NIL, NIL, NIL, NIL, 4]);

    disposeManager(SoundManager);

    const another: SoundManager = getManager(SoundManager);

    another.load(processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toEqual([]);
  });

  it("should not serialize active runtime playback and clear it on load", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const processor: MockNetProcessor = new MockNetProcessor();
    const playing: AbstractPlayableSound = soundsConfig.themes.get("attack_begin");
    const looped: AbstractPlayableSound = soundsConfig.themes.get("looped_example");
    const loopedThemes: LuaTable<string, AbstractPlayableSound> = new LuaTable();

    soundsConfig.playing.set(object.id(), playing);
    loopedThemes.set("looped_example", looped);
    soundsConfig.looped.set(object.id(), loopedThemes);

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([NIL, NIL, NIL, NIL, 4]);

    manager.load(processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toEqual([]);
    expect(soundsConfig.playing.length()).toBe(0);
    expect(soundsConfig.looped.length()).toBe(0);
  });

  it("should correctly save/load data for objects", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.saveObject(object, processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([false, false, false, 3]);

    disposeManager(SoundManager);

    const another: SoundManager = getManager(SoundManager);

    another.loadObject(object, processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toEqual([]);
  });

  it("should correctly play sound for objects once", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    expect(() => manager.play(object.id(), "attack_end")).toThrow(
      `Not existing sound theme 'attack_end' provided for playing with object '${object.id()}'.`
    );
    expect(() => manager.play(object.id(), "looped_example")).toThrow(
      "Trying to start sound 'looped_example' with incorrect play method."
    );

    expect(soundsConfig.playing.length()).toBe(0);

    const theme: AbstractPlayableSound = soundsConfig.themes.get("attack_begin");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "reset").mockImplementation(jest.fn());

    expect(manager.play(object.id(), "attack_begin", "faction", 1)).toBe(theme.soundObject);

    expect(soundsConfig.playing.length()).toBe(1);
    expect(theme.reset).toHaveBeenCalledTimes(0);
    expect(theme.play).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledWith(object.id(), "faction", 1);

    expect(manager.play(object.id(), "attack_begin", "faction", 1)).toBe(theme.soundObject);

    expect(soundsConfig.playing.length()).toBe(1);
    expect(theme.reset).toHaveBeenCalledTimes(0);
    expect(theme.play).toHaveBeenCalledTimes(1);
  });

  it("should correctly play sound for objects with forced play and reset", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    expect(soundsConfig.playing.length()).toBe(0);

    const theme: AbstractPlayableSound = soundsConfig.themes.get("play_always_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "reset").mockImplementation(jest.fn());

    expect(manager.play(object.id(), "play_always_example", "faction", 1)).toBe(theme.soundObject);

    expect(soundsConfig.playing.length()).toBe(1);
    expect(theme.reset).toHaveBeenCalledTimes(0);
    expect(theme.play).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledWith(object.id(), "faction", 1);

    expect(manager.play(object.id(), "play_always_example", "faction", 1)).toBe(theme.soundObject);

    expect(soundsConfig.playing.length()).toBe(1);
    expect(theme.reset).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledTimes(2);
  });

  it("should correctly start looped sounds for objects", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    expect(() => manager.playLooped(object.id(), "attack_end")).toThrow(
      `Not existing sound theme 'attack_end' provided for loop playing with object '${object.id()}'.`
    );
    expect(() => manager.playLooped(object.id(), "play_always_example")).toThrow(
      "Trying to start sound 'play_always_example' with incorrect play looped method."
    );

    expect(soundsConfig.looped.length()).toBe(0);

    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledWith(object.id());

    jest.spyOn(theme, "isPlaying").mockImplementation(() => true);

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(1);
  });

  it("should correctly stop looped sounds for objects", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "stop").mockImplementation(jest.fn(() => true));

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledWith(object.id());

    manager.stopLooped(object.id(), "looped_example");

    expect(theme.stop).toHaveBeenCalledTimes(0);
    expect(soundsConfig.looped.length()).toBe(0);

    jest.spyOn(theme, "isPlaying").mockImplementation(() => true);

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(2);

    manager.stopLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(0);
    expect(theme.stop).toHaveBeenCalledTimes(1);
  });

  it("should correctly stop all looped sounds for objects", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "stop").mockImplementation(jest.fn(() => true));

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(1);
    expect(theme.play).toHaveBeenCalledWith(object.id());

    manager.stopAllLooped(object.id());

    expect(theme.stop).toHaveBeenCalledTimes(0);
    expect(soundsConfig.looped.length()).toBe(0);

    jest.spyOn(theme, "isPlaying").mockImplementation(() => true);

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.play).toHaveBeenCalledTimes(2);

    manager.stopAllLooped(object.id());

    expect(soundsConfig.looped.length()).toBe(0);
    expect(theme.stop).toHaveBeenCalledTimes(1);
  });

  it("should correctly set looped sound volume", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "stop").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "setVolumeForObject").mockImplementation(jest.fn());

    expect(() => manager.setLoopedSoundVolume(object.id(), "looped_example", 10)).not.toThrow();

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(1);
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
    expect(theme.setVolumeForObject).toHaveBeenCalledTimes(0);

    manager.setLoopedSoundVolume(object.id(), "looped_example", 10);

    expect(theme.setVolumeForObject).toHaveBeenCalledTimes(0);

    jest.spyOn(theme, "isPlaying").mockImplementation(() => true);

    manager.setLoopedSoundVolume(object.id(), "looped_example", 10);

    expect(theme.setVolumeForObject).toHaveBeenCalledTimes(1);
    expect(theme.setVolumeForObject).toHaveBeenCalledWith(object.id(), 10);
  });

  it("should correctly handle update event for actor", () => {
    const manager: SoundManager = getManager(SoundManager);

    jest.spyOn(manager, "update").mockImplementation(jest.fn());

    manager.onActorUpdate();

    expect(manager.update).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(ACTOR_ID);
  });

  it("should correctly handle actor going offline", () => {
    const manager: SoundManager = getManager(SoundManager);

    jest.spyOn(manager, "stop").mockImplementation(jest.fn());

    manager.onActorNetworkDestroy();

    expect(manager.stop).toHaveBeenCalledTimes(1);
    expect(manager.stop).toHaveBeenCalledWith(ACTOR_ID);
  });

  it("should correctly handle debug dump event", () => {
    const manager: SoundManager = getManager(SoundManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ SoundManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ SoundManager: expect.any(Object) });
  });

  it("play should ignore requests without a theme name", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();

    expect(manager.play(object.id(), null)).toBeNull();
    expect(soundsConfig.playing.length()).toBe(0);
  });

  it("play should not register the theme when playback did not start", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const theme: AbstractPlayableSound = soundsConfig.themes.get("attack_begin");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => false));

    expect(manager.play(object.id(), "attack_begin", "faction", 1)).toBe(theme.getSoundObject(object.id()));
    expect(soundsConfig.playing.length()).toBe(0);
  });

  it("stop should clear both the active and the looped sounds", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const theme: AbstractPlayableSound = soundsConfig.themes.get("attack_begin");
    const looped: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(theme, "stop").mockImplementation(jest.fn());
    jest.spyOn(looped, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(looped, "stop").mockImplementation(jest.fn());
    jest.spyOn(looped, "isPlaying").mockImplementation(() => true);

    manager.play(object.id(), "attack_begin");
    manager.playLooped(object.id(), "looped_example");

    manager.stop(object.id());

    expect(theme.stop).toHaveBeenCalledWith(object.id());
    expect(looped.stop).toHaveBeenCalledWith(object.id());
    expect(soundsConfig.playing.length()).toBe(0);
    expect(soundsConfig.looped.length()).toBe(0);
  });

  it("stop should skip looped sounds that already finished", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const looped: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(looped, "play").mockImplementation(jest.fn(() => true));
    jest.spyOn(looped, "stop").mockImplementation(jest.fn());
    jest.spyOn(looped, "isPlaying").mockImplementation(() => false);

    manager.playLooped(object.id(), "looped_example");
    manager.stop(object.id());

    expect(looped.stop).toHaveBeenCalledTimes(0);
    expect(soundsConfig.looped.length()).toBe(0);
  });

  it("stop should be inert for objects without any sounds", () => {
    const manager: SoundManager = getManager(SoundManager);

    expect(() => manager.stop(9_999)).not.toThrow();
  });

  it("playLooped should not register the theme when playback did not start", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => false));

    manager.playLooped(object.id(), "looped_example");

    expect(soundsConfig.looped.length()).toBe(0);
  });

  it("stopLooped should be inert for unknown objects and themes", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const theme: AbstractPlayableSound = soundsConfig.themes.get("looped_example");

    expect(() => manager.stopLooped(9_999, "looped_example")).not.toThrow();

    jest.spyOn(theme, "play").mockImplementation(jest.fn(() => true));
    manager.playLooped(object.id(), "looped_example");

    expect(() => manager.stopLooped(object.id(), "unknown_theme")).not.toThrow();
    expect(soundsConfig.looped.get(object.id()).length()).toBe(1);
  });

  it("stopAllLooped should be inert for objects without looped sounds", () => {
    const manager: SoundManager = getManager(SoundManager);

    expect(() => manager.stopAllLooped(9_999)).not.toThrow();
  });
});
