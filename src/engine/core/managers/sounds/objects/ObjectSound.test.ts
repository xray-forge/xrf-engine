import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { IniFile } from "xray16/alias";
import { NIL, TNumberId } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockIniFile, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { registerObject } from "@/engine/core/database";
import { ObjectSound } from "@/engine/core/managers/sounds/objects/ObjectSound";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("ObjectSound", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should initialize its configured playlist and metadata", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      test_object_sound: {
        path: "some/path",
        shuffle: "loop",
        idle: "2,4,80",
        faction: "dolg",
        point: "base",
        message: "warning",
      },
    });
    const sound: ObjectSound = new ObjectSound(ini, "test_object_sound");

    expect(sound.type).toBe(EPlayableSound["3D"]);
    expect(sound.section).toBe("test_object_sound");
    expect(sound.path).toBe("some/path");
    expect(sound.soundPaths).toEqualLuaTables({ 1: "some/path" });
    expect(sound.playback).toEqualLuaTables({});
    expect(sound.shuffle).toBe(ESoundPlaylistType.LOOP);
    expect(sound.minIdle).toBe(2);
    expect(sound.maxIdle).toBe(4);
    expect(sound.rnd).toBe(80);
  });

  it("should lazily initialize independent playback state for each object", () => {
    const sound: ObjectSound = new ObjectSound(
      MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path" } }),
      "test_object_sound"
    );

    expect(sound.playback.has(10)).toBe(false);
    expect(sound.selectNextSound(10)).toBe(1);

    expect(sound.playback.get(10)).toEqual({
      canPlay: true,
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
      soundObject: null,
    });
    expect(sound.playback.has(11)).toBe(false);
  });

  it("should correctly select next random sound excluding the previously played index", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path" } });
    const sound: ObjectSound = new ObjectSound(ini, "test_object_sound");
    const objectId: TNumberId = 10;

    sound.soundPaths.set(2, "some/path2");
    sound.soundPaths.set(3, "some/path3");
    sound.soundPaths.set(4, "some/path4");
    sound.soundPaths.set(5, "some/path5");

    const randomSpy = jest.spyOn(math, "random");

    sound.playback.set(objectId, {
      canPlay: true,
      idleTime: null,
      pdaSoundObject: null,
      playedSoundIndex: null,
      playingStartedAt: null,
      soundObject: null,
    });
    randomSpy.mockReturnValueOnce(5);
    expect(sound.selectNextSound(objectId)).toBe(5);

    sound.playback.get(objectId).playedSoundIndex = 2;

    randomSpy.mockReturnValueOnce(1);
    expect(sound.selectNextSound(objectId)).toBe(1); // 1 < 2 -> unchanged

    randomSpy.mockReturnValueOnce(2);
    expect(sound.selectNextSound(objectId)).toBe(3); // draw == previous -> shifted up (never repeats)

    randomSpy.mockReturnValueOnce(4);
    expect(sound.selectNextSound(objectId)).toBe(5);

    const anotherObjectId: TNumberId = 11;

    randomSpy.mockReturnValueOnce(2);
    expect(sound.selectNextSound(anotherObjectId)).toBe(2);
    expect(sound.playback.get(anotherObjectId).playedSoundIndex).toBeNull();

    randomSpy.mockRestore();
  });

  it("should restore an object's playback availability after the sound ends", () => {
    const actor = mockRegisteredActor().actorGameObject;
    const object = MockGameObject.mock();
    const sound: ObjectSound = new ObjectSound(
      MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path", idle: "3,3,100" } }),
      "test_object_sound"
    );

    registerObject(object);
    replaceFunctionMock(time_global, () => 250);
    expect(sound.play(object.id(), "dolg", "base")).toBe(true);

    sound.onSoundPlayEnded(object.id());

    expect(actor).toBeDefined();
    expect(sound.playback.get(object.id())).toEqual({
      canPlay: true,
      idleTime: 3000,
      pdaSoundObject: expect.anything(),
      playedSoundIndex: 1,
      playingStartedAt: 250,
      soundObject: null,
    });
  });

  it("should play and stop only the requested object's sound", () => {
    mockRegisteredActor();

    const first = MockGameObject.mock();
    const second = MockGameObject.mock();
    const sound: ObjectSound = new ObjectSound(
      MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path" } }),
      "test_object_sound"
    );

    registerObject(first);
    registerObject(second);

    expect(sound.play(first.id(), "dolg", "base")).toBe(true);
    expect(sound.play(second.id(), "dolg", "base")).toBe(true);

    const firstPlayback = sound.playback.get(first.id());
    const secondPlayback = sound.playback.get(second.id());

    replaceFunctionMock(firstPlayback.soundObject!.playing, () => true);
    replaceFunctionMock(secondPlayback.soundObject!.playing, () => true);

    sound.stop(first.id());

    expect(firstPlayback.soundObject?.stop).toHaveBeenCalledTimes(1);
    expect(sound.playback.has(first.id())).toBe(false);
    expect(secondPlayback.soundObject?.stop).not.toHaveBeenCalled();
    expect(sound.isPlaying(second.id())).toBe(true);
  });

  it("should reset only the requested object's playback state", () => {
    const sound: ObjectSound = new ObjectSound(
      MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path" } }),
      "test_object_sound"
    );

    sound.selectNextSound(10);
    sound.selectNextSound(11);

    sound.reset(10);

    expect(sound.playback.has(10)).toBe(false);
    expect(sound.playback.has(11)).toBe(true);
  });

  it("should save and consume the obsolete global playback slot without restoring object state", () => {
    const ini: IniFile = MockIniFile.mock("test.ltx", { test_object_sound: { path: "some/path" } });
    const sound: ObjectSound = new ObjectSound(ini, "test_object_sound");
    const processor: MockNetProcessor = new MockNetProcessor();

    sound.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.STRING]);
    expect(processor.dataList).toEqual([NIL]);

    const loaded: ObjectSound = new ObjectSound(ini, "test_object_sound");

    loaded.load(processor.asNetProcessor());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toEqual([]);
    expect(loaded.playback).toEqualLuaTables({});
  });
});
