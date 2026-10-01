import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { IniFile } from "xray16/alias";
import { EMockPacketDataType, MockIniFile, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { ActorSound } from "@/engine/core/managers/sounds/objects/ActorSound";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("ActorSound", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should initialize its playlist and configured metadata", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      test_actor_sound: {
        actor_stereo: true,
        npc_prefix: true,
        shuffle: "seq",
        play_always: true,
        idle: "4,6,75",
        faction: "stalker",
        point: "camp",
        message: "hello",
        path: "voice/theme",
      },
    });
    const sound: ActorSound = new ActorSound(ini, "test_actor_sound");

    expect(sound.type).toBe(EPlayableSound.ACTOR);
    expect(sound.path).toBe("characters_voice\\voice/theme");
    expect(sound.soundPaths).toEqualLuaTables({ 1: "characters_voice\\voice/theme" });
    expect(sound.isStereo).toBe(true);
    expect(sound.shouldPlayAlways).toBe(true);
    expect(sound.shuffle).toBe(ESoundPlaylistType.SEQUENCE);
    expect(sound.minIdle).toBe(4);
    expect(sound.maxIdle).toBe(6);
    expect(sound.random).toBe(75);
  });

  it("should start one actor sound and prevent a concurrent replay", () => {
    const actor = mockRegisteredActor().actorGameObject;
    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { test_actor_sound: { path: "some/path" } }),
      "test_actor_sound"
    );

    expect(sound.play(actor.id(), "stalker", "camp")).toBe(true);
    expect(sound.soundObject?.play_at_pos).toHaveBeenCalledWith(actor, expect.anything(), 0, undefined);
    expect(sound.soundObject?.volume).toBe(0.8);
    expect(sound.canPlaySound).toBe(false);
    expect(sound.play(actor.id(), "stalker", "camp")).toBe(false);
  });

  it("should restore availability and schedule its idle interval when playback ends", () => {
    const actor = mockRegisteredActor().actorGameObject;
    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { test_actor_sound: { path: "some/path", idle: "3,3,100" } }),
      "test_actor_sound"
    );

    replaceFunctionMock(time_global, () => 250);
    sound.play(actor.id(), "stalker", "camp");

    sound.onSoundPlayEnded(actor.id());

    expect(sound.soundObject).toBeNull();
    expect(sound.playingStartedAt).toBe(250);
    expect(sound.idleTime).toBe(3000);
    expect(sound.canPlaySound).toBe(true);
  });

  it("should reset playback selection and cooldown", () => {
    const sound: ActorSound = new ActorSound(
      MockIniFile.mock("test.ltx", { test_actor_sound: { path: "some/path" } }),
      "test_actor_sound"
    );

    sound.playedSoundIndex = 1;
    sound.playingStartedAt = 50;

    sound.reset();

    expect(sound.playedSoundIndex).toBeNull();
    expect(sound.playingStartedAt).toBeNull();
  });

  it("should correctly select next random sound excluding the previously played index", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_actor_sound: { path: "some/path" } });
    const sound: ActorSound = new ActorSound(ini, "test_actor_sound");

    // Constructor sets soundPaths = { 1 }; extend to a 1-based collection of 5.
    sound.soundPaths.set(2, "some/path2");
    sound.soundPaths.set(3, "some/path3");
    sound.soundPaths.set(4, "some/path4");
    sound.soundPaths.set(5, "some/path5");

    const randomSpy = jest.spyOn(math, "random");

    sound.playedSoundIndex = null;
    randomSpy.mockReturnValueOnce(5);
    expect(sound.selectNextSound()).toBe(5);

    // Subsequent plays draw over 1..count-1 and shift up when the draw is >= the previous index.
    sound.playedSoundIndex = 2;

    randomSpy.mockReturnValueOnce(1);
    expect(sound.selectNextSound()).toBe(1); // 1 < 2 -> unchanged

    randomSpy.mockReturnValueOnce(2);
    expect(sound.selectNextSound()).toBe(3); // draw == previous -> shifted up (never repeats)

    randomSpy.mockReturnValueOnce(4);
    expect(sound.selectNextSound()).toBe(5);

    randomSpy.mockRestore();
  });

  it("should save and restore the selected playlist index", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_actor_sound: { path: "some/path" } });
    const sound: ActorSound = new ActorSound(ini, "test_actor_sound");
    const processor: MockNetProcessor = new MockNetProcessor();

    sound.playedSoundIndex = 1;
    sound.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.STRING]);
    expect(processor.dataList).toEqual(["1"]);

    const loaded: ActorSound = new ActorSound(ini, "test_actor_sound");

    loaded.load(processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toEqual([]);
    expect(loaded.playedSoundIndex).toBe(1);
  });
});
