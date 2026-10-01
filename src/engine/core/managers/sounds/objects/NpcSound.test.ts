import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { GameObject, IniFile } from "xray16/alias";
import { TNumberId } from "xray16/lib";
import { $isNotNil } from "xray16/macros";
import { EMockPacketDataType, MockFileSystem, MockGameObject, MockIniFile, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { roots } from "@/engine/constants/roots";
import { registerObject } from "@/engine/core/database";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds";
import { INpcSoundDescriptor, NpcSound } from "@/engine/core/managers/sounds/objects/NpcSound";
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

describe("NpcSound", () => {
  it("should fail init on missing data", () => {
    expect(() => new NpcSound(MockIniFile.mock("test.ltx"), "test_npc_sound")).toThrow(
      "Attempt to read a non-existent string field 'path' in section 'test_npc_sound'."
    );
  });

  it("should correctly initialize with minimal data", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      test_npc_sound: {
        path: "some/sound/path.ogg",
      },
    });
    const sound: NpcSound = new NpcSound(ini, "test_npc_sound");

    expect(sound.type).toBe(EPlayableSound.NPC);
    expect(sound.section).toBe("test_npc_sound");
    expect(sound.path).toBe("some/sound/path.ogg");
    expect(sound.prefix).toBe(false);
    expect(sound.isCombatSound).toBe(false);
    expect(sound.isGroupSound).toBe(false);
    expect(sound.canPlaySound).toEqualLuaTables({});
    expect(sound.objects).toEqualLuaTables({});
    expect(sound.availableCommunities).toEqualLuaTables({
      army: true,
      bandit: true,
      dolg: true,
      ecolog: true,
      freedom: true,
      killer: true,
      monolith: true,
      stalker: true,
      zombied: true,
    });
    expect(sound.soundPaths).toEqualLuaTables({});
    expect(sound.playback).toEqualLuaTables({});
    expect(sound.resolvedSoundPaths).toEqualLuaTables({});
    expect(sound.shuffle).toBe(ESoundPlaylistType.RANDOM);
    expect(sound.canPlayGroupSound).toBe(true);
    expect(sound.groupPlayback).toEqual({
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
    });
    expect(sound.minIdle).toBe(3);
    expect(sound.maxIdle).toBe(5);
    expect(sound.random).toBe(100);
    expect(sound.delay).toBe(0);
  });

  it("should correctly initialize object with provided ini fields", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      pri_a15_army_hide_weapon: {
        type: "npc",
        path: "scenario\\pripyat\\pri_a15_army_hide_weapon",
        shuffle: "seq",
        faction: "army",
        point: "test_point",
        message: "test_message",
        idle: "0,45,525",
        delay_sound: 400,
        npc_prefix: true,
        group_snd: true,
        avail_communities: "army, dolg",
        is_combat_sound: true,
        play_always: true,
      },
    });
    const sound: NpcSound = new NpcSound(ini, "pri_a15_army_hide_weapon");

    expect(sound.type).toBe(EPlayableSound.NPC);
    expect(sound.section).toBe("pri_a15_army_hide_weapon");
    expect(sound.path).toBe("scenario\\pripyat\\pri_a15_army_hide_weapon");
    expect(sound.prefix).toBe(true);
    expect(sound.isCombatSound).toBe(true);
    expect(sound.isGroupSound).toBe(true);
    expect(sound.canPlaySound).toEqualLuaTables({});
    expect(sound.objects).toEqualLuaTables({});
    expect(sound.availableCommunities).toEqualLuaTables({
      army: true,
      dolg: true,
    });
    expect(sound.soundPaths).toEqualLuaTables({});
    expect(sound.playback).toEqualLuaTables({});
    expect(sound.resolvedSoundPaths).toEqualLuaTables({});
    expect(sound.shuffle).toBe(ESoundPlaylistType.SEQUENCE);
    expect(sound.canPlayGroupSound).toBe(true);
    expect(sound.groupPlayback).toEqual({
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
    });
    expect(sound.minIdle).toBe(0);
    expect(sound.maxIdle).toBe(45);
    expect(sound.random).toBe(525);
    expect(sound.delay).toBe(400);
  });

  it("should correctly select next random sound excluding the previously played index", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_npc_sound: { path: "some/path" } });
    const sound: NpcSound = new NpcSound(ini, "test_npc_sound");
    const objectId: TNumberId = 10;

    sound.objects.set(objectId, { id: objectId, max: 5 });

    const randomSpy = jest.spyOn(math, "random");

    // First play (no previous index): uniform over the full inclusive range 0..max.
    sound.playback.set(objectId, {
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
    });
    randomSpy.mockReturnValueOnce(4);
    expect(sound.selectNextSound(objectId)).toBe(4);

    sound.playback.get(objectId).playedSoundIndex = 2;

    randomSpy.mockReturnValueOnce(0);
    expect(sound.selectNextSound(objectId)).toBe(0); // 0 < 2 -> unchanged
    randomSpy.mockReturnValueOnce(2);
    expect(sound.selectNextSound(objectId)).toBe(3); // draw == previous -> shifted up (never repeats)

    randomSpy.mockReturnValueOnce(3);
    expect(sound.selectNextSound(objectId)).toBe(4);

    randomSpy.mockReturnValueOnce(4);
    expect(sound.selectNextSound(objectId)).toBe(5);

    const anotherObjectId: TNumberId = 11;

    sound.objects.set(anotherObjectId, { id: anotherObjectId, max: 5 });
    randomSpy.mockReturnValueOnce(2);

    expect(sound.selectNextSound(anotherObjectId)).toBe(2);
    expect(sound.playback.get(anotherObjectId).playedSoundIndex).toBeNull();

    randomSpy.mockRestore();
  });

  it("should restore object availability and schedule its idle interval when playback ends", () => {
    resetRegistry();

    const object: GameObject = MockGameObject.mockStalker();
    const sound: NpcSound = new NpcSound(
      MockIniFile.mock("test.ltx", { test_npc_sound: { path: "some/path", idle: "3,3,100" } }),
      "test_npc_sound"
    );

    registerObject(object);
    sound.objects.set(object.id(), { id: 1, max: 0 });
    sound.canPlaySound.set(object.id(), false);
    sound.playback.set(object.id(), {
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: 0,
      playingStartedAt: null,
    });
    replaceFunctionMock(time_global, () => 250);

    sound.onSoundPlayEnded(object.id());

    expect(sound.canPlaySound.get(object.id())).toBe(true);
    expect(sound.playback.get(object.id())).toEqual({
      idleTime: 3000,
      pdaSoundObject: null,
      playedSoundIndex: 0,
      playingStartedAt: 250,
    });
  });

  it("should reset only the target object's playback and sound masks", () => {
    resetRegistry();

    const object: GameObject = MockGameObject.mockStalker();
    const sound: NpcSound = new NpcSound(
      MockIniFile.mock("test.ltx", { test_npc_sound: { path: "some/path" } }),
      "test_npc_sound"
    );

    registerObject(object);
    sound.canPlaySound.set(object.id(), false);
    sound.playback.set(object.id(), {
      idleTime: 1000,
      pdaSoundObject: null,
      playedSoundIndex: 1,
      playingStartedAt: 50,
    });

    sound.reset(object.id());

    expect(sound.canPlaySound.get(object.id())).toBe(true);
    expect(sound.playback.get(object.id())).toEqual({
      idleTime: 1000,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
    });
    expect(object.set_sound_mask).toHaveBeenCalledWith(-1);
    expect(object.set_sound_mask).toHaveBeenCalledWith(0);
  });
});

describe("NpcSound lazy initialization", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should lazily initialize object on first play and reuse the registration", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_lazy: { path: "test\\lazy_theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_lazy");
    const object: GameObject = MockGameObject.mockStalker();
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    registerObject(object);
    mockObjectSoundPrefix(object);
    replaceFunctionMock(object.add_sound, () => 1);

    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\lazy_theme_pda.ogg", false);

    expect(sound.play(object.id(), "faction", null)).toBe(true);

    expect(object.add_sound).toHaveBeenCalledTimes(1);
    expect(object.play_sound).toHaveBeenCalledTimes(1);
    expect(sound.objects.get(object.id())).toEqual({ id: expect.any(Number), max: 0 });
    expect(sound.soundPaths.get(object.id())).toEqualLuaTables({ 1: "characters_voice\\test\\lazy_theme" });
    expect(sound.canPlaySound.get(object.id())).toBe(false);

    // Play availability consumed -> no replay, no re-initialization.
    expect(sound.play(object.id(), "faction", null)).toBe(false);
    expect(object.add_sound).toHaveBeenCalledTimes(1);

    // After reset the same registration is reused without engine re-registration.
    sound.reset(object.id());

    expect(sound.play(object.id(), "faction", null)).toBe(true);
    expect(object.add_sound).toHaveBeenCalledTimes(1);
    expect(object.play_sound).toHaveBeenCalledTimes(2);
  });

  it("should not initialize objects with mismatched communities", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      test_gated: { path: "test\\gated_theme", avail_communities: "dolg" },
    });
    const sound: NpcSound = new NpcSound(ini, "test_gated");
    const stalkerObject: GameObject = MockGameObject.mockStalker();
    const monsterObject: GameObject = MockGameObject.mock();

    registerObject(stalkerObject);
    registerObject(monsterObject);

    expect(sound.play(stalkerObject.id(), "faction", null)).toBe(false);
    expect(sound.play(monsterObject.id(), "faction", null)).toBe(false);

    expect(stalkerObject.add_sound).not.toHaveBeenCalled();
    expect(monsterObject.add_sound).not.toHaveBeenCalled();
    expect(sound.objects.length()).toBe(0);
  });

  it("should resolve sound paths once per prefix key and share them by reference", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_cached: { path: "test\\cached_theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_cached");
    const first: GameObject = MockGameObject.mockStalker();
    const second: GameObject = MockGameObject.mockStalker();
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    mockObjectSoundPrefix(first);
    mockObjectSoundPrefix(second);
    replaceFunctionMock(first.add_sound, () => 3);
    replaceFunctionMock(second.add_sound, () => 3);

    // Indexed variants: base path does not exist, indexes 1-3 resolve through the permissive root.
    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\cached_theme.ogg", false);
    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\cached_theme4.ogg", false);

    sound.initializeObject(first);

    const scansCount: number = fileSystem.exist.mock.calls.length;

    sound.initializeObject(second);

    expect(fileSystem.exist.mock.calls).toHaveLength(scansCount);
    expect(sound.soundPaths.get(second.id())).toBe(sound.soundPaths.get(first.id()));
    expect(sound.soundPaths.get(first.id())).toEqualLuaTables({
      1: "characters_voice\\test\\cached_theme1",
      2: "characters_voice\\test\\cached_theme2",
      3: "characters_voice\\test\\cached_theme3",
    });
  });

  it("should cache empty resolution results and still abort when engine finds no sounds", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_missing: { path: "test\\missing_theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_missing");
    const first: GameObject = MockGameObject.mockStalker();
    const second: GameObject = MockGameObject.mockStalker();
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    mockObjectSoundPrefix(first);
    mockObjectSoundPrefix(second);
    replaceFunctionMock(first.add_sound, () => 0);
    replaceFunctionMock(second.add_sound, () => 0);

    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\missing_theme.ogg", false);
    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\missing_theme1.ogg", false);

    expect(() => sound.initializeObject(first)).toThrow("Could not find sounds");

    const scansCount: number = fileSystem.exist.mock.calls.length;

    expect(() => sound.initializeObject(second)).toThrow("Could not find sounds");

    expect(fileSystem.exist.mock.calls).toHaveLength(scansCount);
    expect(sound.resolvedSoundPaths.get("characters_voice\\test\\missing_theme")).toEqualLuaTables({});
  });

  it("should resolve prefixed themes per object voice prefix", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_prefixed: { path: "attack_theme", npc_prefix: true } });
    const sound: NpcSound = new NpcSound(ini, "test_prefixed");
    const first: GameObject = MockGameObject.mockStalker();
    const second: GameObject = MockGameObject.mockStalker();

    replaceFunctionMock(first.sound_prefix, () => "voice_a\\");
    replaceFunctionMock(second.sound_prefix, () => "voice_b\\");
    replaceFunctionMock(first.add_sound, () => 1);
    replaceFunctionMock(second.add_sound, () => 1);

    sound.initializeObject(first);
    sound.initializeObject(second);

    expect(sound.soundPaths.get(first.id())).toEqualLuaTables({ 1: "voice_a\\attack_theme" });
    expect(sound.soundPaths.get(second.id())).toEqualLuaTables({ 1: "voice_b\\attack_theme" });
    expect(sound.soundPaths.get(first.id())).not.toBe(sound.soundPaths.get(second.id()));
  });

  it("should preserve group sound restrictions through lazy play", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_group: { path: "test\\group_theme", group_snd: true } });
    const sound: NpcSound = new NpcSound(ini, "test_group");
    const object: GameObject = MockGameObject.mockStalker();
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    registerObject(object);
    mockObjectSoundPrefix(object);
    replaceFunctionMock(object.add_sound, () => 1);

    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\group_theme_pda.ogg", false);

    expect(sound.play(object.id(), "faction", null)).toBe(true);
    expect(sound.canPlayGroupSound).toBe(false);
    expect(sound.canPlaySound.has(object.id())).toBe(false);

    // Group availability consumed -> no replay, no re-initialization.
    expect(sound.play(object.id(), "faction", null)).toBe(false);
    expect(object.add_sound).toHaveBeenCalledTimes(1);
  });

  it("should invalidate all object playback state before re-registration", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_invalidate: { path: "test\\invalidate_theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_invalidate");
    const object: GameObject = MockGameObject.mockStalker();
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    registerObject(object);
    mockObjectSoundPrefix(object);
    replaceFunctionMock(object.add_sound, () => 1);

    fileSystem.setMock(roots.gameSounds, "characters_voice\\test\\invalidate_theme_pda.ogg", false);

    expect(sound.play(object.id(), "faction", null)).toBe(true);

    const firstId: TNumberId = (sound.objects.get(object.id()) as INpcSoundDescriptor).id;

    sound.invalidateObject(object.id());

    expect(sound.objects.has(object.id())).toBe(false);
    expect(sound.soundPaths.has(object.id())).toBe(false);
    expect(sound.canPlaySound.get(object.id())).toBeNull();

    // Next initialization registers again with a new id and restores normal playback availability.
    sound.initializeObject(object);

    expect(sound.objects.get(object.id()).id).toBeGreaterThan(firstId);
    expect(sound.canPlaySound.get(object.id())).toBe(true);
    expect(sound.soundPaths.get(object.id())).toEqualLuaTables({ 1: "characters_voice\\test\\invalidate_theme" });
  });

  it("should keep per-object save layout independent of initialization", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_saved: { path: "test\\save_theme" } });
    const sound: NpcSound = new NpcSound(ini, "test_saved");
    const object: GameObject = MockGameObject.mockStalker();
    const processor: MockNetProcessor = new MockNetProcessor();

    // Never initialized object still writes the availability flag keeping the save layout stable.
    sound.saveObject(processor.asNetPacket(), object);

    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.BOOLEAN]);
    expect(processor.dataList).toEqual([false]);

    const loaded: NpcSound = new NpcSound(ini, "test_saved");

    loaded.loadObject(processor.asNetProcessor(), object);

    expect(processor.dataList).toEqual([]);
    expect(loaded.canPlaySound.get(object.id())).toBe(false);

    // Loaded availability flag survives later lazy initialization.
    mockObjectSoundPrefix(object);
    replaceFunctionMock(object.add_sound, () => 1);

    loaded.initializeObject(object);

    expect(loaded.canPlaySound.get(object.id())).toBe(false);
  });
});
