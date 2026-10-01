import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, IniFile, SoundObject } from "xray16/alias";
import { AnyArgs, TSection } from "xray16/lib";
import { MockGameObject, MockIniFile, MockNetProcessor, MockSoundObject } from "xray16/mocks";

import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { EPlayableSound } from "@/engine/core/managers/sounds/sounds_types";
import { resetRegistry } from "@/fixtures/engine";

/**
 * Minimal concrete sound, exposing the base class behaviour without any subclass overrides.
 */
class TestPlayableSound extends AbstractPlayableSound {
  public override readonly type: EPlayableSound = EPlayableSound.LOOPED;

  public constructor(ini: IniFile, section: TSection) {
    super(ini, section);
  }

  public override play(...args: AnyArgs): boolean {
    return true;
  }
}

describe("AbstractPlayableSound", () => {
  const ini: IniFile = MockIniFile.mock("test.ltx", {
    test_sound: { path: "test\\sound.ogg" },
  });

  beforeEach(() => {
    resetRegistry();
  });

  it("should read its path from the provided ini section", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");

    expect(sound.section).toBe("test_sound");
    expect(sound.path).toBe("test\\sound.ogg");
    expect(sound.soundObject).toBeNull();
    expect(sound.shouldPlayAlways).toBe(false);
    expect(sound.type).toBe(EPlayableSound.LOOPED);
  });

  it("should report playing state based on the sound object", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");

    expect(sound.isPlaying(1)).toBe(false);

    const soundObject: SoundObject = MockSoundObject.mock("test\\sound.ogg");

    sound.soundObject = soundObject;

    jest.spyOn(soundObject, "playing").mockImplementation(() => true);
    expect(sound.isPlaying(1)).toBe(true);

    jest.spyOn(soundObject, "playing").mockImplementation(() => false);
    expect(sound.isPlaying(1)).toBe(false);
  });

  it("should expose the shared sound object for any object id", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");
    const soundObject: SoundObject = MockSoundObject.mock("test\\sound.ogg");

    expect(sound.getSoundObject(1)).toBeNull();

    sound.soundObject = soundObject;

    expect(sound.getSoundObject(1)).toBe(soundObject);
    expect(sound.getSoundObject(2)).toBe(soundObject);
  });

  it("should stop the sound object only when it exists", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");
    const soundObject: SoundObject = MockSoundObject.mock("test\\sound.ogg");

    expect(() => sound.stop(1)).not.toThrow();

    sound.soundObject = soundObject;
    sound.stop(1);

    expect(soundObject.stop).toHaveBeenCalledTimes(1);
  });

  it("should set volume on the sound object only when it exists", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");
    const soundObject: SoundObject = MockSoundObject.mock("test\\sound.ogg");

    expect(() => sound.setVolume(0.5)).not.toThrow();

    sound.soundObject = soundObject;

    sound.setVolume(0.5);
    expect(soundObject.volume).toBe(0.5);

    sound.setVolumeForObject(1, 0.75);
    expect(soundObject.volume).toBe(0.75);
  });

  it("should provide inert defaults for the optional hooks", () => {
    const sound: TestPlayableSound = new TestPlayableSound(ini, "test_sound");
    const object: GameObject = MockGameObject.mock();
    const processor: MockNetProcessor = new MockNetProcessor();

    expect(() => sound.reset(1)).not.toThrow();
    expect(() => sound.onSoundPlayEnded(1)).not.toThrow();
    expect(() => sound.save(processor.asNetPacket())).not.toThrow();
    expect(() => sound.load(processor.asNetProcessor())).not.toThrow();
    expect(() => sound.saveObject(processor.asNetPacket(), object)).not.toThrow();
    expect(() => sound.loadObject(processor.asNetProcessor(), object)).not.toThrow();

    expect(processor.dataList).toHaveLength(0);
  });
});
