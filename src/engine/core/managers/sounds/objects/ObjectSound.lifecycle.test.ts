import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_hud, time_global } from "xray16";
import { GameObject, IniFile, SoundObject } from "xray16/alias";
import { AnyObject, TIndex, TName, TSection } from "xray16/lib";
import { MockFileSystem, MockGameObject, MockIniFile } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { ObjectSound } from "@/engine/core/managers/sounds/objects/ObjectSound";
import { ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

/**
 * Create an object sound with a single resolvable file and a registered emitter object.
 */
function createSound(section: TSection, fields: AnyObject = {}): { sound: ObjectSound; object: GameObject } {
  const path: string = `test\\${section}`;

  MockFileSystem.getInstance().setMock(roots.gameSounds, `${path}.ogg`, true);
  MockFileSystem.getInstance().setMock(roots.gameSounds, `${path}_pda.ogg`, false);

  const ini: IniFile = MockIniFile.mock("test.ltx", { [section]: { path, ...fields } });
  const sound: ObjectSound = new ObjectSound(ini, section);
  const object: GameObject = MockGameObject.mock();

  registerObject(object);

  return { sound, object };
}

describe("ObjectSound playback lifecycle", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should resolve indexed sound files when the base one is missing", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\indexed.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\indexed3.ogg", false);

    const ini: IniFile = MockIniFile.mock("test.ltx", { indexed: { path: "test\\indexed" } });
    const sound: ObjectSound = new ObjectSound(ini, "indexed");

    expect(sound.soundPaths).toEqualLuaTables({ 1: "test\\indexed1", 2: "test\\indexed2" });
  });

  it("should abort when no sound files can be resolved", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\absent.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\absent1.ogg", false);

    const ini: IniFile = MockIniFile.mock("test.ltx", { absent: { path: "test\\absent" } });

    expect(() => new ObjectSound(ini, "absent")).toThrow("There are no sound collection with path: 'test\\absent'.");
  });

  it("play should be rejected for objects missing from the registry", () => {
    const { sound } = createSound("test_no_object");

    expect(sound.play(9_999, "faction", "point")).toBe(false);
  });

  it("play should wait for the previous sound to finish", () => {
    const { sound, object } = createSound("test_wait");

    replaceFunctionMock(time_global, () => 10_000);

    expect(sound.play(object.id(), "faction", "point")).toBe(true);

    sound.onSoundPlayEnded(object.id());

    expect(sound.play(object.id(), "faction", "point")).toBe(false);

    replaceFunctionMock(time_global, () => 10_000_000);

    expect(sound.play(object.id(), "faction", "point")).toBe(true);
  });

  it("play should be rejected while the object sound is still busy", () => {
    const { sound, object } = createSound("test_busy");

    expect(sound.play(object.id(), "faction", "point")).toBe(true);
    expect(sound.play(object.id(), "faction", "point")).toBe(false);
  });

  it("play should stop when the sequence playlist is exhausted", () => {
    const { sound, object } = createSound("test_exhausted", { shuffle: "seq" });

    sound.play(object.id(), "faction", "point");
    sound.playback.get(object.id()).playedSoundIndex = -1;
    sound.playback.get(object.id()).canPlay = true;

    expect(sound.play(object.id(), "faction", "point")).toBe(false);
  });

  it("play should add a pda sound for a distant actor", () => {
    const { sound, object } = createSound("test_pda_object");

    MockFileSystem.getInstance().setMock(roots.gameSounds, "test\\test_pda_object_pda.ogg", true);

    jest.spyOn(object.position(), "distance_to_sqr").mockImplementation(() => 500);

    expect(sound.play(object.id(), "faction", "point")).toBe(true);
    expect(sound.playback.get(object.id()).pdaSoundObject?.volume).toBe(0.8);
  });

  it("isPlaying should follow both the 3d and the pda sound objects", () => {
    const { sound, object } = createSound("test_playing");

    expect(sound.isPlaying(object.id())).toBe(false);

    sound.play(object.id(), "faction", "point");

    const soundObject: SoundObject = sound.getSoundObject(object.id()) as SoundObject;

    jest.spyOn(soundObject, "playing").mockImplementation(() => true);
    expect(sound.isPlaying(object.id())).toBe(true);

    jest.spyOn(soundObject, "playing").mockImplementation(() => false);
    expect(sound.isPlaying(object.id())).toBe(false);

    sound.playback.get(object.id()).pdaSoundObject = { playing: () => true, stop: jest.fn() } as never;
    expect(sound.isPlaying(object.id())).toBe(true);
  });

  it("getSoundObject should be null for objects without playback", () => {
    const { sound } = createSound("test_no_playback");

    expect(sound.getSoundObject(9_999)).toBeUndefined();
  });

  it("stop should be inert for objects without playback", () => {
    const { sound } = createSound("test_stop_unknown");

    expect(() => sound.stop(9_999)).not.toThrow();
  });

  it("stop should stop both the 3d and the pda sound objects", () => {
    const { sound, object } = createSound("test_stop_both");

    sound.play(object.id(), "faction", "point");

    const soundObject: SoundObject = sound.getSoundObject(object.id()) as SoundObject;
    const pdaSound = { playing: () => true, stop: jest.fn() };

    jest.spyOn(soundObject, "playing").mockImplementation(() => true);
    sound.playback.get(object.id()).pdaSoundObject = pdaSound as never;

    sound.stop(object.id());

    expect(soundObject.stop).toHaveBeenCalledTimes(1);
    expect(pdaSound.stop).toHaveBeenCalledTimes(1);
    expect(sound.playback.has(object.id())).toBe(false);
  });

  it("selectNextSound should walk the sequence playlist and stop at its end", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\seq.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\seq3.ogg", false);

    const ini: IniFile = MockIniFile.mock("test.ltx", { seq: { path: "test\\seq", shuffle: "seq" } });
    const sound: ObjectSound = new ObjectSound(ini, "seq");

    expect(sound.selectNextSound(1)).toBe(1);

    sound.playback.get(1).playedSoundIndex = 1;
    expect(sound.selectNextSound(1)).toBe(2);

    sound.playback.get(1).playedSoundIndex = 2;
    expect(sound.selectNextSound(1)).toBe(-1);

    sound.playback.get(1).playedSoundIndex = -1;
    expect(sound.selectNextSound(1)).toBe(-1);
  });

  it("selectNextSound should wrap around for looped playlists", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\loop.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\loop3.ogg", false);

    const ini: IniFile = MockIniFile.mock("test.ltx", { loop: { path: "test\\loop", shuffle: "loop" } });
    const sound: ObjectSound = new ObjectSound(ini, "loop");

    expect(sound.selectNextSound(1)).toBe(1);

    sound.playback.get(1).playedSoundIndex = 1;
    expect(sound.selectNextSound(1)).toBe(2);

    sound.playback.get(1).playedSoundIndex = 2;
    expect(sound.selectNextSound(1)).toBe(1);
  });

  it("selectNextSound should stay on a single random sound", () => {
    const { sound } = createSound("test_single_random");

    expect(sound.selectNextSound(1)).toBe(1);
  });

  it("selectNextSound should be null for an unknown playlist type", () => {
    const { sound } = createSound("test_unknown_shuffle");

    sound.shuffle = "unexpected" as ESoundPlaylistType;

    expect(sound.selectNextSound(1)).toBeNull();
  });

  it("onSoundPlayEnded should emit the sound end scheme signal", () => {
    const { sound, object } = createSound("test_signal");
    const signals: LuaTable<TName, boolean> = new LuaTable();
    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    sound.play(object.id(), "faction", "point");
    sound.playback.get(object.id()).playedSoundIndex = 0 as TIndex;
    sound.onSoundPlayEnded(object.id());

    expect(signals.get("sound_end")).toBe(true);
    expect(signals.get("theme_end")).toBeNull();
    expect(get_hud().RemoveCustomStatic).toHaveBeenCalledWith("cs_subtitles_object");
  });

  it("onSoundPlayEnded should emit the theme end signal on the last sound", () => {
    const { sound, object } = createSound("test_theme_signal", { shuffle: "seq" });
    const signals: LuaTable<TName, boolean> = new LuaTable();
    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    sound.play(object.id(), "faction", "point");
    sound.playback.get(object.id()).playedSoundIndex = sound.soundPaths.length();
    sound.onSoundPlayEnded(object.id());

    expect(signals.get("theme_end")).toBe(true);
    expect(signals.get("sound_end")).toBe(true);
  });

  it("onSoundPlayEnded should be inert for unregistered objects", () => {
    const { sound } = createSound("test_ended_unknown");

    expect(() => sound.onSoundPlayEnded(9_999)).not.toThrow();
  });

  it("onSoundPlayEnded should be inert without an active scheme", () => {
    const { sound, object } = createSound("test_ended_no_scheme");

    sound.play(object.id(), "faction", "point");

    expect(() => sound.onSoundPlayEnded(object.id())).not.toThrow();
    expect(sound.playback.get(object.id()).canPlay).toBe(true);
  });
});
