import { beforeEach, describe, expect, it } from "@jest/globals";
import { get_hud, time_global } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, TName, TSection } from "xray16/lib";
import { MockFileSystem, MockGameObject, MockIniFile } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { ActorSound } from "@/engine/core/managers/sounds/objects/ActorSound";
import { ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

/**
 * Create an actor sound backed by a single resolvable file.
 */
function createSound(section: TSection, fields: AnyObject = {}): ActorSound {
  const path: string = `test\\${section}`;

  MockFileSystem.getInstance().setMock(roots.gameSounds, `${path}.ogg`, true);

  return new ActorSound(MockIniFile.mock("test.ltx", { [section]: { path, ...fields } }), section);
}

describe("ActorSound playback lifecycle", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should resolve indexed sound files when the base one is missing", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\actor_indexed.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\actor_indexed3.ogg", false);

    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { actor_indexed: { path: "test\\actor_indexed" } }),
      "actor_indexed"
    );

    expect(sound.soundPaths).toEqualLuaTables({ 1: "test\\actor_indexed1", 2: "test\\actor_indexed2" });
  });

  it("should abort when no sound files can be resolved", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\actor_absent.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\actor_absent1.ogg", false);

    expect(
      () =>
        new ActorSound(MockIniFile.mock("test.ltx", { actor_absent: { path: "test\\actor_absent" } }), "actor_absent")
    ).toThrow("There are no sound collection with path: 'test\\actor_absent'.");
  });

  it("play should wait out the idle interval after the previous sound", () => {
    const sound: ActorSound = createSound("actor_idle");
    const object: GameObject = MockGameObject.mock();

    // `onSoundPlayEnded` dereferences the registry state directly, unlike the object sound variant.
    registerObject(object);

    replaceFunctionMock(time_global, () => 10_000);

    expect(sound.play(object.id(), "faction", "point")).toBe(true);

    sound.onSoundPlayEnded(object.id());

    expect(sound.play(object.id(), "faction", "point")).toBe(false);

    replaceFunctionMock(time_global, () => 10_000_000);

    expect(sound.play(object.id(), "faction", "point")).toBe(true);
  });

  it("play should stop once the sequence playlist is exhausted", () => {
    const sound: ActorSound = createSound("actor_exhausted", { shuffle: "seq" });
    const object: GameObject = MockGameObject.mock();

    sound.playedSoundIndex = -1;

    expect(sound.play(object.id(), "faction", "point")).toBe(false);
  });

  it("onSoundPlayEnded should emit the theme end signal on the last sound", () => {
    const sound: ActorSound = createSound("actor_theme_signal", { shuffle: "seq" });
    const object: GameObject = MockGameObject.mock();
    const signals: LuaTable<TName, boolean> = new LuaTable();

    registerObject(object);

    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    sound.play(object.id(), "faction", "point");
    sound.onSoundPlayEnded(object.id());

    expect(signals.get("theme_end")).toBe(true);
    expect(signals.get("sound_end")).toBe(true);
    expect(get_hud().RemoveCustomStatic).toHaveBeenCalledWith("cs_subtitles_actor");
  });

  it("onSoundPlayEnded should emit only the sound end signal mid-playlist", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\actor_mid.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\actor_mid3.ogg", false);

    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { actor_mid: { path: "test\\actor_mid", shuffle: "seq" } }),
      "actor_mid"
    );
    const object: GameObject = MockGameObject.mock();
    const signals: LuaTable<TName, boolean> = new LuaTable();

    registerObject(object);

    const state: IRegistryObjectState = registry.objects.get(object.id());

    state.activeScheme = EScheme.ANIMPOINT;
    state[EScheme.ANIMPOINT] = { signals } as never;

    sound.play(object.id(), "faction", "point");

    expect(sound.playedSoundIndex).toBe(1);

    sound.onSoundPlayEnded(object.id());

    expect(signals.get("sound_end")).toBe(true);
    expect(signals.get("theme_end")).toBeNull();
  });

  it("onSoundPlayEnded should be inert without an active scheme", () => {
    const sound: ActorSound = createSound("actor_no_scheme");
    const object: GameObject = MockGameObject.mock();

    registerObject(object);

    expect(() => sound.onSoundPlayEnded(object.id())).not.toThrow();
    expect(sound.canPlaySound).toBe(true);
  });

  it("selectNextSound should walk the sequence playlist and stop at its end", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\actor_seq.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\actor_seq3.ogg", false);

    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { actor_seq: { path: "test\\actor_seq", shuffle: "seq" } }),
      "actor_seq"
    );

    expect(sound.selectNextSound()).toBe(1);

    sound.playedSoundIndex = 1;
    expect(sound.selectNextSound()).toBe(2);

    sound.playedSoundIndex = 2;
    expect(sound.selectNextSound()).toBe(-1);

    sound.playedSoundIndex = -1;
    expect(sound.selectNextSound()).toBe(-1);
  });

  it("selectNextSound should wrap around for looped playlists", () => {
    const fileSystem: MockFileSystem = MockFileSystem.getInstance();

    fileSystem.setMock(roots.gameSounds, "test\\actor_loop.ogg", false);
    fileSystem.setMock(roots.gameSounds, "test\\actor_loop3.ogg", false);

    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { actor_loop: { path: "test\\actor_loop", shuffle: "loop" } }),
      "actor_loop"
    );

    expect(sound.selectNextSound()).toBe(1);

    sound.playedSoundIndex = 1;
    expect(sound.selectNextSound()).toBe(2);

    sound.playedSoundIndex = 2;
    expect(sound.selectNextSound()).toBe(1);
  });

  it("selectNextSound should be null for an unknown playlist type", () => {
    const sound: ActorSound = createSound("actor_unknown_shuffle");

    sound.shuffle = "unexpected" as ESoundPlaylistType;

    expect(sound.selectNextSound()).toBeNull();
  });
});
