import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_hud, time_global } from "xray16";
import { GameObject, IniFile } from "xray16/alias";
import { AnyObject, NIL, TCount, TName, TSection } from "xray16/lib";
import { $isNotNil } from "xray16/macros";
import { MockFileSystem, MockGameObject, MockIniFile, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { INpcSoundPlayback, NpcSound } from "@/engine/core/managers/sounds/objects/NpcSound";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

/**
 * Emulate engine `sound_prefix` getter/setter pair on the mock object.
 */
function mockObjectSoundPrefix(object: GameObject, initial: string = ""): void {
  let soundPrefix: string = initial;

  replaceFunctionMock(object.sound_prefix, (prefix?: string): string => {
    if ($isNotNil(prefix)) {
      soundPrefix = prefix;
    }

    return soundPrefix;
  });
}

/**
 * Create a sound with a stalker object ready for lazy registration and playback.
 */
function createRegisteredSound(
  section: TSection,
  fields: AnyObject = {},
  soundsCount: TCount = 3
): { sound: NpcSound; object: GameObject } {
  const ini: IniFile = MockIniFile.mock("test.ltx", {
    [section]: { path: `test\\${section}`, ...fields },
  });
  const sound: NpcSound = new NpcSound(ini, section);
  const object: GameObject = MockGameObject.mockStalker();

  registerObject(object);
  mockObjectSoundPrefix(object);
  replaceFunctionMock(object.add_sound, () => soundsCount);
  replaceFunctionMock(object.add_combat_sound, () => soundsCount);

  MockFileSystem.getInstance().setMock(roots.gameSounds, `characters_voice\\test\\${section}_pda.ogg`, false);

  return { sound, object };
}

/**
 * Resolve the playback descriptor used for the object, taking group sounds into account.
 *
 * Per-object playback entries are created lazily on the first playback call, so `reset` is used to
 * materialize one when the test needs to seed its state up front.
 */
function getPlayback(sound: NpcSound, object: GameObject): INpcSoundPlayback {
  if (!sound.isGroupSound && !sound.playback.has(object.id())) {
    sound.reset(object.id());
  }

  return sound.isGroupSound ? sound.groupPlayback : sound.playback.get(object.id());
}

describe("NpcSound playback lifecycle", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("play should be rejected for objects missing from the registry", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_missing_object: { path: "test\\theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_missing_object");

    expect(sound.play(9_999, "faction", null)).toBe(false);
  });

  it("play should wait out the idle interval after the previous sound", () => {
    const { sound, object } = createRegisteredSound("test_idle");

    sound.initializeObject(object);

    replaceFunctionMock(time_global, () => 10_000);
    sound.onSoundPlayEnded(object.id());

    // Idle time is randomized between the configured bounds, so playback is blocked right away.
    expect(sound.play(object.id(), "faction", null)).toBe(false);

    replaceFunctionMock(time_global, () => 10_000_000);

    expect(sound.play(object.id(), "faction", null)).toBe(true);
  });

  it("play should be rejected once the group sound is taken", () => {
    const { sound, object } = createRegisteredSound("test_group_taken", { group_snd: true });

    sound.initializeObject(object);
    sound.canPlayGroupSound = false;

    expect(sound.play(object.id(), "faction", null)).toBe(false);
  });

  it("isPlaying should follow the object voice and pda sound state", () => {
    const { sound, object } = createRegisteredSound("test_is_playing");

    expect(sound.isPlaying(9_999)).toBe(false);

    sound.initializeObject(object);

    replaceFunctionMock(object.active_sound_count, () => 0);
    expect(sound.isPlaying(object.id())).toBe(false);

    replaceFunctionMock(object.active_sound_count, () => 1);
    expect(sound.isPlaying(object.id())).toBe(true);

    replaceFunctionMock(object.active_sound_count, () => 0);
    sound.play(object.id(), "faction", null);

    getPlayback(sound, object).pdaSoundObject = { playing: () => true, stop: jest.fn() } as never;

    expect(sound.isPlaying(object.id())).toBe(true);
  });

  it("stop should reset masks, pda playback and availability", () => {
    const { sound, object } = createRegisteredSound("test_stop");

    sound.initializeObject(object);
    sound.play(object.id(), "faction", null);

    const pdaSound = { playing: () => true, stop: jest.fn() };

    getPlayback(sound, object).pdaSoundObject = pdaSound as never;

    sound.stop(object.id());

    expect(object.set_sound_mask).toHaveBeenCalledWith(-1);
    expect(object.set_sound_mask).toHaveBeenCalledWith(0);
    expect(pdaSound.stop).toHaveBeenCalledTimes(1);
    expect(sound.playback.has(object.id())).toBe(false);
    expect(sound.canPlaySound.get(object.id())).toBe(true);
  });

  it("stop should skip sound masks for dead objects and free group playback", () => {
    const { sound, object } = createRegisteredSound("test_stop_group", { group_snd: true });

    sound.initializeObject(object);
    replaceFunctionMock(object.alive, () => false);

    sound.canPlayGroupSound = false;
    sound.stop(object.id());

    expect(object.set_sound_mask).not.toHaveBeenCalled();
    expect(sound.canPlayGroupSound).toBe(true);
  });

  it("stop should tolerate objects that were never registered", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_unknown_stop: { path: "test\\theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_unknown_stop");

    expect(() => sound.stop(9_999)).not.toThrow();
  });

  it("reset should stop the active pda sound", () => {
    const { sound, object } = createRegisteredSound("test_reset_pda");

    sound.initializeObject(object);
    sound.play(object.id(), "faction", null);

    const playback: INpcSoundPlayback = getPlayback(sound, object);
    const pdaSound = { playing: () => true, stop: jest.fn() };

    playback.pdaSoundObject = pdaSound as never;

    sound.reset(object.id());

    expect(pdaSound.stop).toHaveBeenCalledTimes(1);
    expect(playback.pdaSoundObject).toBeNull();
  });

  it("reset should free group playback for group sounds", () => {
    const { sound, object } = createRegisteredSound("test_reset_group", { group_snd: true });

    sound.initializeObject(object);
    sound.canPlayGroupSound = false;

    sound.reset(object.id());

    expect(sound.canPlayGroupSound).toBe(true);
  });

  it("reset should tolerate objects missing from the registry", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_reset_unknown: { path: "test\\theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_reset_unknown");

    expect(() => sound.reset(9_999)).not.toThrow();
    expect(sound.canPlaySound.get(9_999)).toBe(true);
  });

  it("play should create a pda sound when the actor is far enough", () => {
    const { sound, object } = createRegisteredSound("test_pda");

    // Single non-indexed sound file, so the companion pda track resolves off the base path.
    MockFileSystem.getInstance().setMock(roots.gameSounds, "characters_voice\\test\\test_pda_pda.ogg", true);

    sound.initializeObject(object);

    jest.spyOn(sound, "selectNextSound").mockImplementation(() => 0);
    jest.spyOn(object.position(), "distance_to_sqr").mockImplementation(() => 1_000);

    expect(sound.play(object.id(), "faction", null)).toBe(true);

    const playback: INpcSoundPlayback = getPlayback(sound, object);

    expect(playback.pdaSoundObject).not.toBeNull();
    expect(playback.pdaSoundObject?.volume).toBe(0.8);
  });

  it("onSoundPlayEnded should fire the sound end scheme signal", () => {
    const { sound, object } = createRegisteredSound("test_signals");
    const signals: LuaTable<TName, boolean> = new LuaTable();

    sound.initializeObject(object);

    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    replaceFunctionMock(time_global, () => 5_000);
    sound.onSoundPlayEnded(object.id());

    expect(signals.get("sound_end")).toBe(true);
    expect(signals.get("theme_end")).toBeNull();
    expect(get_hud().RemoveCustomStatic).toHaveBeenCalledWith("cs_subtitles_npc");
  });

  it("onSoundPlayEnded should fire the theme end signal on the last sound", () => {
    const { sound, object } = createRegisteredSound("test_theme_end", { shuffle: "seq" });
    const signals: LuaTable<TName, boolean> = new LuaTable();

    sound.initializeObject(object);

    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    getPlayback(sound, object).playedSoundIndex = sound.objects.get(object.id()).max;
    sound.onSoundPlayEnded(object.id());

    expect(signals.get("theme_end")).toBe(true);
    expect(signals.get("sound_end")).toBe(true);
  });

  it("onSoundPlayEnded should skip signals without an active scheme", () => {
    const { sound, object } = createRegisteredSound("test_no_signals");

    sound.initializeObject(object);

    expect(() => sound.onSoundPlayEnded(object.id())).not.toThrow();
  });

  it("onSoundPlayEnded should free group playback for group sounds", () => {
    const { sound, object } = createRegisteredSound("test_group_ended", { group_snd: true });

    sound.initializeObject(object);
    sound.canPlayGroupSound = false;

    sound.onSoundPlayEnded(object.id());

    expect(sound.canPlayGroupSound).toBe(true);
  });

  it("invalidateObject should drop every per-object registration", () => {
    const { sound, object } = createRegisteredSound("test_invalidate");

    sound.initializeObject(object);
    sound.play(object.id(), "faction", null);

    const pdaSound = { playing: () => true, stop: jest.fn() };

    getPlayback(sound, object).pdaSoundObject = pdaSound as never;

    sound.invalidateObject(object.id());

    expect(pdaSound.stop).toHaveBeenCalledTimes(1);
    expect(sound.objects.has(object.id())).toBe(false);
    expect(sound.soundPaths.has(object.id())).toBe(false);
    expect(sound.playback.has(object.id())).toBe(false);
    expect(sound.canPlaySound.has(object.id())).toBe(false);
  });

  it("selectNextSound should walk the sequence playlist and stop at its end", () => {
    const { sound, object } = createRegisteredSound("test_sequence", { shuffle: "seq" });

    sound.initializeObject(object);

    const playback: INpcSoundPlayback = getPlayback(sound, object);

    expect(sound.selectNextSound(object.id())).toBe(0);

    playback.playedSoundIndex = 0;
    expect(sound.selectNextSound(object.id())).toBe(1);

    playback.playedSoundIndex = sound.objects.get(object.id()).max;
    expect(sound.selectNextSound(object.id())).toBe(-1);

    playback.playedSoundIndex = -1;
    expect(sound.selectNextSound(object.id())).toBe(-1);
  });

  it("selectNextSound should wrap around for looped playlists", () => {
    const { sound, object } = createRegisteredSound("test_loop", { shuffle: "loop" });

    sound.initializeObject(object);

    const playback: INpcSoundPlayback = getPlayback(sound, object);

    expect(sound.selectNextSound(object.id())).toBe(0);

    playback.playedSoundIndex = 0;
    expect(sound.selectNextSound(object.id())).toBe(1);

    playback.playedSoundIndex = sound.objects.get(object.id()).max;
    expect(sound.selectNextSound(object.id())).toBe(0);
  });

  it("selectNextSound should stay on the single sound of a random playlist", () => {
    const { sound, object } = createRegisteredSound("test_single", {}, 1);

    sound.initializeObject(object);

    expect(sound.objects.get(object.id()).max).toBe(0);
    expect(sound.selectNextSound(object.id())).toBe(0);
  });

  it("selectNextSound should abort for an unknown playlist type", () => {
    const { sound, object } = createRegisteredSound("test_bad_shuffle");

    sound.initializeObject(object);
    (sound as AnyObject).shuffle = "unexpected";

    expect(() => sound.selectNextSound(object.id())).toThrow("Unexpected shuffle type provided: 'unexpected'.");
  });

  it("should save and load group playback state", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      test_group_save: { path: "test\\group_save", group_snd: true },
    });
    const sound: NpcSound = new NpcSound(ini, "test_group_save");
    const processor: MockNetProcessor = new MockNetProcessor();

    sound.groupPlayback.playedSoundIndex = 4;
    sound.canPlayGroupSound = false;

    sound.save(processor.asNetPacket());

    expect(processor.dataList).toEqual(["4", false]);

    const loaded: NpcSound = new NpcSound(ini, "test_group_save");

    loaded.load(processor.asNetProcessor());

    expect(loaded.groupPlayback.playedSoundIndex).toBe(4);
    expect(loaded.canPlayGroupSound).toBe(false);
  });

  it("should save nil group playback state for non-group sounds", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_plain_save: { path: "test\\plain_save" } });
    const sound: NpcSound = new NpcSound(ini, "test_plain_save");
    const processor: MockNetProcessor = new MockNetProcessor();

    sound.save(processor.asNetPacket());

    expect(processor.dataList).toEqual([NIL]);

    const loaded: NpcSound = new NpcSound(ini, "test_plain_save");

    loaded.load(processor.asNetProcessor());

    expect(loaded.groupPlayback.playedSoundIndex).toBeNull();
  });
});
