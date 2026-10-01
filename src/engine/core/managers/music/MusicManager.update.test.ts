import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_console, IsDynamicMusic, time_global } from "xray16";
import { Console, GameObject } from "xray16/alias";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager, registerObject, registry } from "@/engine/core/database";
import { musicConfig } from "@/engine/core/managers/music/MusicConfig";
import { MusicManager } from "@/engine/core/managers/music/MusicManager";
import { IDynamicMusicDescriptor } from "@/engine/core/managers/sounds";
import { StereoSound } from "@/engine/core/managers/sounds/objects";
import { EDynamicMusicState } from "@/engine/core/managers/sounds/sounds_types";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("MusicManager dynamic theme state", () => {
  const console: Console = get_console();
  const defaultThemes: LuaArray<IDynamicMusicDescriptor> = musicConfig.dynamicMusicThemes;
  const defaultDistance: number = MockVector.DEFAULT_DISTANCE;

  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(console.execute);
    replaceFunctionMock(IsDynamicMusic, () => true);
    replaceFunctionMock(time_global, () => 10_000);

    musicConfig.dynamicMusicThemes = defaultThemes;
    MockVector.DEFAULT_DISTANCE = defaultDistance;

    surgeConfig.IS_STARTED = false;
  });

  /**
   * Register a stalker that considers the actor its best enemy at the requested squared distance.
   */
  function registerEnemyAt(actor: GameObject, distanceSqr: number): GameObject {
    const enemy: GameObject = MockGameObject.mock();

    jest.spyOn(enemy, "best_enemy").mockReturnValue(actor);
    registerObject(enemy);
    registry.stalkers.set(enemy.id(), true);

    jest.spyOn(actor.position(), "distance_to_sqr").mockImplementation(() => distanceSqr);

    return enemy;
  }

  it("getThemeState should be null for a dead actor", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);

    jest.spyOn(actorGameObject, "alive").mockReturnValue(false);

    expect(manager.getThemeState()).toBeNull();
    expect(manager.forceFade).toBe(false);
  });

  it("getThemeState should fade out a distant enemy theme", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);

    registerEnemyAt(actorGameObject, (musicConfig.MAX_DIST + 10) * (musicConfig.MAX_DIST + 10));

    manager.theme = new StereoSound();
    manager.gameAmbientVolume = 0.6;

    expect(manager.getThemeState()).toBe(EDynamicMusicState.IDLE);
    expect(manager.fadeToThemeVolume).toBe(0);
    expect(manager.fadeToAmbientVolume).toBe(0.6);
  });

  it("getThemeState should keep the theme running at intermediate distance", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);
    const between: number = (musicConfig.MIN_DIST + musicConfig.MAX_DIST) / 2;

    registerEnemyAt(actorGameObject, between * between);

    manager.theme = new StereoSound();
    manager.gameAmbientVolume = 0.6;
    manager.wasInSilence = true;

    expect(manager.getThemeState()).toBe(EDynamicMusicState.IDLE);
    expect(manager.wasInSilence).toBe(false);
    expect(manager.fadeToAmbientVolume).toBe(0.6);
  });

  it("getThemeState should stay idle at intermediate distance when not coming from silence", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);
    const between: number = (musicConfig.MIN_DIST + musicConfig.MAX_DIST) / 2;

    registerEnemyAt(actorGameObject, between * between);

    manager.theme = new StereoSound();
    manager.wasInSilence = false;

    expect(manager.getThemeState()).toBe(EDynamicMusicState.IDLE);
    expect(manager.wasInSilence).toBe(false);
  });

  it("getThemeState should keep the closest enemy of several", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);
    const near: GameObject = MockGameObject.mock();
    const far: GameObject = MockGameObject.mock();

    jest.spyOn(near, "best_enemy").mockReturnValue(actorGameObject);
    jest.spyOn(far, "best_enemy").mockReturnValue(actorGameObject);

    registerObject(near);
    registerObject(far);
    registry.stalkers.set(near.id(), true);
    registry.stalkers.set(far.id(), true);

    jest
      .spyOn(actorGameObject.position(), "distance_to_sqr")
      .mockImplementationOnce(() => 5_000)
      .mockImplementationOnce(() => 1);

    expect(manager.getThemeState()).toBe(EDynamicMusicState.START);
    expect(manager.forceFade).toBe(true);
  });

  it("getThemeState should stop looking once an enemy is close enough for combat music", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);
    const first: GameObject = MockGameObject.mock();
    const second: GameObject = MockGameObject.mock();

    jest.spyOn(first, "best_enemy").mockReturnValue(actorGameObject);
    jest.spyOn(second, "best_enemy").mockReturnValue(actorGameObject);

    registerObject(first);
    registerObject(second);
    registry.stalkers.set(first.id(), true);
    registry.stalkers.set(second.id(), true);

    jest.spyOn(actorGameObject.position(), "distance_to_sqr").mockImplementation(() => 1);

    expect(manager.getThemeState()).toBe(EDynamicMusicState.START);
    expect(actorGameObject.position().distance_to_sqr).toHaveBeenCalledTimes(1);
  });

  it("getThemeState should ignore stalkers fighting someone else", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: MusicManager = getManager(MusicManager);
    const other: GameObject = MockGameObject.mock();
    const stalker: GameObject = MockGameObject.mock();

    jest.spyOn(stalker, "best_enemy").mockReturnValue(other);
    registerObject(stalker);
    registry.stalkers.set(stalker.id(), true);

    expect(manager.getThemeState()).toBeNull();
    expect(actorGameObject.alive).toHaveBeenCalled();
  });

  it("getThemeState should stay idle while volumes are still fading out", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    manager.theme = new StereoSound();
    manager.gameAmbientVolume = 0.6;
    manager.dynamicThemeVolume = 0.4;
    manager.fadeToThemeVolume = 0.4;
    manager.themeAmbientVolume = 0;

    expect(manager.getThemeState()).toBe(EDynamicMusicState.IDLE);
  });
});

describe("MusicManager fading", () => {
  beforeEach(() => {
    resetRegistry();
    replaceFunctionMock(time_global, () => 1_000_000);
  });

  it("fadeTheme should move the volume by the steps the elapsed time covers", () => {
    const manager: MusicManager = getManager(MusicManager);

    manager.gameAmbientVolume = 1;
    manager.volumeChangeStep = 0.1;
    manager.forceFade = false;

    manager.dynamicThemeVolume = 0.5;
    manager.fadeToThemeVolume = 1;
    manager.fadeTheme(musicConfig.THEME_FADE_STEP_DURATION);

    expect(manager.dynamicThemeVolume).toBeCloseTo(0.6, 5);

    manager.fadeTheme(musicConfig.THEME_FADE_STEP_DURATION * 2);

    expect(manager.dynamicThemeVolume).toBeCloseTo(0.8, 5);

    manager.fadeToThemeVolume = 0;
    manager.fadeTheme(musicConfig.THEME_FADE_STEP_DURATION);

    expect(manager.dynamicThemeVolume).toBeCloseTo(0.7, 5);
  });

  it("fadeTheme should stop at the target volume", () => {
    const manager: MusicManager = getManager(MusicManager);

    manager.gameAmbientVolume = 1;
    manager.volumeChangeStep = 0.1;
    manager.forceFade = false;

    manager.dynamicThemeVolume = 0.95;
    manager.fadeToThemeVolume = 1;
    manager.fadeTheme(musicConfig.THEME_FADE_STEP_DURATION * 10);

    expect(manager.dynamicThemeVolume).toBe(1);

    manager.fadeToThemeVolume = 0.9;
    manager.fadeTheme(musicConfig.THEME_FADE_STEP_DURATION * 10);

    expect(manager.dynamicThemeVolume).toBe(0.9);
  });

  it("fadeTheme should jump straight to the target when forced", () => {
    const manager: MusicManager = getManager(MusicManager);

    manager.gameAmbientVolume = 1;
    manager.forceFade = true;

    manager.dynamicThemeVolume = 0.9;
    manager.fadeToThemeVolume = 0.1;
    manager.fadeTheme(1);

    expect(manager.dynamicThemeVolume).toBe(0.1);

    manager.fadeToThemeVolume = 0.8;
    manager.fadeTheme(1);

    expect(manager.dynamicThemeVolume).toBe(0.8);
  });

  it("fadeAmbient should move the volume by the elapsed time and apply it", () => {
    const manager: MusicManager = getManager(MusicManager);
    const console: Console = get_console();

    manager.gameAmbientVolume = 1;
    manager.volumeChangeStep = 0.1;
    manager.forceFade = false;

    manager.themeAmbientVolume = 0.5;
    manager.fadeToAmbientVolume = 1;
    manager.fadeAmbient(musicConfig.AMBIENT_FADE_STEP_DURATION);

    expect(manager.themeAmbientVolume).toBeCloseTo(0.6, 5);
    expect(console.execute).toHaveBeenCalled();

    // The game music fades slower than the theme for the same time.
    manager.fadeToAmbientVolume = 0;
    manager.fadeAmbient(musicConfig.THEME_FADE_STEP_DURATION);

    expect(manager.themeAmbientVolume).toBeCloseTo(0.55, 5);
  });

  it("fadeAmbient should jump straight to the target when forced", () => {
    const manager: MusicManager = getManager(MusicManager);

    manager.gameAmbientVolume = 1;
    manager.forceFade = true;

    manager.themeAmbientVolume = 0.9;
    manager.fadeToAmbientVolume = 0.2;
    manager.fadeAmbient(1);

    expect(manager.themeAmbientVolume).toBe(0.2);

    manager.fadeToAmbientVolume = 0.7;
    manager.fadeAmbient(1);

    expect(manager.themeAmbientVolume).toBe(0.7);
  });

  it("should fade by the time elapsed between music updates", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    manager.areThemesInitialized = true;
    manager.nextTrackStartAt = 2_000_000;

    jest.spyOn(manager, "getThemeState").mockReturnValue(EDynamicMusicState.IDLE);
    jest.spyOn(manager, "isThemeFading").mockReturnValue(true);
    jest.spyOn(manager, "fadeTheme").mockImplementation(jest.fn());

    manager.onActorUpdate(200);
    manager.onActorUpdate(150);

    expect(manager.fadeTheme).toHaveBeenCalledWith(350);
  });
});

describe("MusicManager actor update", () => {
  beforeEach(() => {
    resetRegistry();
    replaceFunctionMock(IsDynamicMusic, () => true);
    replaceFunctionMock(time_global, () => 10_000);

    surgeConfig.IS_STARTED = false;
  });

  it("should restore ambient volume while the surge is killing everyone", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);

    surgeConfig.IS_STARTED = true;
    surgeManager.isBlowoutSoundStarted = true;

    jest.spyOn(surgeManager, "isKillingAll").mockImplementation(() => true);
    jest.spyOn(manager, "fadeAmbient").mockImplementation(jest.fn());

    manager.gameAmbientVolume = 0.6;
    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.fadeAmbient).toHaveBeenCalledTimes(1);
    expect(manager.fadeToAmbientVolume).toBe(0.6);
    expect(manager.forceFade).toBe(false);
  });

  it("should mute ambient while the surge blowout is ongoing", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);

    surgeConfig.IS_STARTED = true;
    surgeManager.isBlowoutSoundStarted = true;

    let fadeTargetAtCall: number = -1;

    jest.spyOn(surgeManager, "isKillingAll").mockImplementation(() => false);
    // The dynamic music pass runs afterwards and re-targets the volume, so it is captured at call time.
    jest.spyOn(manager, "fadeAmbient").mockImplementation(() => {
      fadeTargetAtCall = manager.fadeToAmbientVolume;
    });

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.fadeAmbient).toHaveBeenCalledTimes(1);
    expect(fadeTargetAtCall).toBe(0);
  });

  it("should skip dynamic music handling when it is disabled", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    replaceFunctionMock(IsDynamicMusic, () => false);
    jest.spyOn(manager, "getThemeState").mockReturnValue(EDynamicMusicState.START);
    jest.spyOn(manager, "startTheme").mockImplementation(jest.fn());

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.startTheme).not.toHaveBeenCalled();
  });

  it("should fade the theme and advance tracks while idle", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    manager.areThemesInitialized = true;
    manager.theme = new StereoSound();
    manager.nextTrackStartAt = 0;

    jest.spyOn(manager.theme, "update").mockImplementation(jest.fn());
    jest.spyOn(manager, "getThemeState").mockReturnValue(EDynamicMusicState.IDLE);
    jest.spyOn(manager, "isThemeFading").mockReturnValue(true);
    jest.spyOn(manager, "fadeTheme").mockImplementation(jest.fn());
    jest.spyOn(manager, "fadeAmbient").mockImplementation(jest.fn());
    jest.spyOn(manager, "selectNextTrack").mockImplementation(jest.fn());

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.theme.update).toHaveBeenCalledWith(manager.dynamicThemeVolume);
    expect(manager.fadeTheme).toHaveBeenCalledTimes(1);
    expect(manager.fadeAmbient).toHaveBeenCalledTimes(0);
    expect(manager.selectNextTrack).toHaveBeenCalledTimes(1);
  });

  it("should fade ambient while idle when the theme is settled", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    manager.areThemesInitialized = true;
    manager.nextTrackStartAt = 1_000_000;

    jest.spyOn(manager, "getThemeState").mockReturnValue(EDynamicMusicState.IDLE);
    jest.spyOn(manager, "isThemeFading").mockReturnValue(false);
    jest.spyOn(manager, "isAmbientFading").mockReturnValue(true);
    jest.spyOn(manager, "fadeTheme").mockImplementation(jest.fn());
    jest.spyOn(manager, "fadeAmbient").mockImplementation(jest.fn());
    jest.spyOn(manager, "selectNextTrack").mockImplementation(jest.fn());

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.fadeTheme).toHaveBeenCalledTimes(0);
    expect(manager.fadeAmbient).toHaveBeenCalledTimes(1);
    expect(manager.selectNextTrack).toHaveBeenCalledTimes(0);
  });

  it("should stop the theme when the dynamic music finishes", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    manager.areThemesInitialized = true;
    manager.theme = new StereoSound();

    jest.spyOn(manager.theme, "update").mockImplementation(jest.fn());
    jest.spyOn(manager.theme, "stop").mockImplementation(jest.fn());
    jest.spyOn(manager, "getThemeState").mockReturnValue(EDynamicMusicState.FINISH);

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.theme.stop).toHaveBeenCalledTimes(1);
    expect(manager.areThemesInitialized).toBe(false);
  });

  it("should lazily initialize themes on the first dynamic update", () => {
    mockRegisteredActor();

    const manager: MusicManager = getManager(MusicManager);

    musicConfig.dynamicMusicThemes = $fromArray<IDynamicMusicDescriptor>([]);

    jest.spyOn(manager, "initializeThemes");
    jest.spyOn(manager, "getThemeState").mockReturnValue(null);

    manager.onActorUpdate(musicConfig.LOGIC_UPDATE_STEP + 1);

    expect(manager.initializeThemes).toHaveBeenCalledTimes(1);
  });
});
