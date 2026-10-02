import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, get_console, sound_object } from "xray16";
import { ESoundObjectType, SoundObject } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockSoundObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager } from "@/engine/core/database";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { gameOutroConfig } from "@/engine/core/managers/outro/GameOutroConfig";
import { GameOutroManager } from "@/engine/core/managers/outro/GameOutroManager";
import { calculateSoundFade } from "@/engine/core/managers/outro/utils";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("GameOutroManager", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(game.start_tutorial);
  });

  it("should correctly initialize and destroy", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);

    const manager: GameOutroManager = getManager(GameOutroManager);

    expect(manager.sound).toBeNull();
    expect(manager.isGameoverCreditsStarted).toBe(false);

    expect(eventsManager.getSubscribersCount()).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);

    disposeManager(GameOutroManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly start ending tutorial", () => {
    const gameOutroManager: GameOutroManager = getManager(GameOutroManager);

    gameOutroManager.startOutro();

    expect(game.start_tutorial).toHaveBeenCalledWith("outro_game");
  });

  it("should correctly start outro sound", () => {
    const gameOutroManager: GameOutroManager = getManager(GameOutroManager);

    expect(gameOutroManager.sound).toBeNull();

    gameOutroManager.startSound();

    expect(gameOutroManager.sound).toBeInstanceOf(sound_object);
    expect(gameOutroManager.sound?.play).toHaveBeenCalledTimes(1);
    expect(gameOutroManager.sound?.play).toHaveBeenCalledWith(null, 0.0, ESoundObjectType.S2D);
    expect(gameOutroManager.sound?.volume).toBe(1);
    expect((gameOutroManager.sound as unknown as MockSoundObject).path).toBe("music\\outro");
  });

  it("should correctly stop outro sound", () => {
    const gameOutroManager: GameOutroManager = getManager(GameOutroManager);

    expect(gameOutroManager.sound).toBeNull();

    gameOutroManager.startSound();

    const sound: SoundObject = gameOutroManager.sound as SoundObject;

    gameOutroManager.stopSound();

    expect(gameOutroManager.sound).toBeNull();
    expect(sound.stop).toHaveBeenCalledTimes(1);
  });

  it("should start the black screen, sound, and outro input control", () => {
    const outro: GameOutroManager = getManager(GameOutroManager);
    const input: ActorInputManager = getManager(ActorInputManager);

    mockRegisteredActor();
    jest.spyOn(input, "acquireControl");

    outro.startBlackScreenAndSound();

    expect(outro.sound).toBeInstanceOf(sound_object);
    expect(input.acquireControl).toHaveBeenCalledWith(
      EActorControlHandle.OUTRO,
      "outro",
      EActorControlPolicy.UI_ONLY,
      true
    );
  });

  it("should release outro input control and roll the credits when stopping the black screen sequence", () => {
    const outro: GameOutroManager = getManager(GameOutroManager);
    const input: ActorInputManager = getManager(ActorInputManager);

    mockRegisteredActor();

    jest.spyOn(input, "releaseControl");
    outro.startBlackScreenAndSound();

    const sound: SoundObject = outro.sound as SoundObject;

    outro.stopBlackScreenAndSound();

    expect(sound.stop).toHaveBeenCalledTimes(1);
    expect(input.releaseControl).toHaveBeenCalledWith(EActorControlHandle.OUTRO);
    expect(get_console().execute).toHaveBeenCalledWith("disconnect");
    expect(game.start_tutorial).toHaveBeenCalledWith("credits_seq");
    expect(outro.isGameoverCreditsStarted).toBe(true);
  });

  it("should roll the game credits and remember they started", () => {
    const outro: GameOutroManager = getManager(GameOutroManager);

    outro.startCredits();

    expect(game.start_tutorial).toHaveBeenCalledTimes(1);
    expect(game.start_tutorial).toHaveBeenCalledWith("credits_seq");
    expect(outro.isGameoverCreditsStarted).toBe(true);
  });

  it("should apply the configured fade-in volume to the outro sound", () => {
    const outro: GameOutroManager = getManager(GameOutroManager);

    outro.startSound();
    outro.updateBlackScreenAndSoundFadeStart(0.8);

    expect(outro.sound?.volume).toBe(
      calculateSoundFade(0.8, 0.6, 1.0, gameOutroConfig.VOLUME_MAX, gameOutroConfig.VOLUME_MIN)
    );
  });

  it("should apply both fade-out phases to the outro sound", () => {
    const outro: GameOutroManager = getManager(GameOutroManager);

    outro.startSound();
    outro.updateBlackScreenAndSoundFadeStop(0.1);

    expect(outro.sound?.volume).toBe(
      calculateSoundFade(0.1, 0, 0.12, gameOutroConfig.VOLUME_MIN, gameOutroConfig.VOLUME_MAX)
    );

    outro.updateBlackScreenAndSoundFadeStop(0.8);

    expect(outro.sound?.volume).toBe(calculateSoundFade(0.8, 0.7, 0.95, gameOutroConfig.VOLUME_MAX, 0));
  });

  it("should correctly handle debug dump event", () => {
    const manager: GameOutroManager = getManager(GameOutroManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ GameOutroManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ GameOutroManager: expect.any(Object) });
  });
});
