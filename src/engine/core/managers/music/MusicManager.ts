import { IsDynamicMusic, level, time_global } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import {
  abort,
  AnyObject,
  clamp,
  LuaArray,
  Nillable,
  TDistance,
  TDuration,
  TIndex,
  TName,
  TNumberId,
  TRate,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent } from "@/engine/core/managers/events/events_types";
import { EventsManager } from "@/engine/core/managers/events/EventsManager";
import { musicConfig } from "@/engine/core/managers/music/MusicConfig";
import { StereoSound } from "@/engine/core/managers/sounds/objects";
import { EDynamicMusicState } from "@/engine/core/managers/sounds/sounds_types";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { LuaLogger } from "@/engine/core/utils/logging";
import { isObjectInSilenceZone } from "@/engine/core/utils/position";
import { getMusicVolume, setMusicVolume } from "@/engine/core/utils/sound";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager handling dynamic game music: combat themes while stalkers fight the actor, fading the game music around them.
 */
export class MusicManager extends AbstractManager {
  public themes: LuaArray<LuaArray<TName>> = new LuaTable();
  public theme: Nillable<StereoSound> = null;
  public updateDelta: TDuration = 0;

  public themeAmbientVolume: TRate = 0;
  public dynamicThemeVolume: TRate = 0;
  public gameAmbientVolume: TRate = getMusicVolume();
  public fadeToAmbientVolume: TRate = 0;
  public fadeToThemeVolume: TRate = 0;
  public volumeChangeStep: TRate = 0;

  public currentThemeIndex: TIndex = 0;
  public currentTrackIndex: TIndex = 0;

  public areThemesInitialized: boolean = false;
  public isThemeInitializationFailed: boolean = false;
  public forceFade: boolean = false;
  public wasInSilence: boolean = false;
  public nextTrackStartAt: TTimestamp = 0;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.onActorUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_OFFLINE, this.onActorNetworkDestroy, this);
    eventsManager.registerCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn, this);
    eventsManager.registerCallback(EGameEvent.MAIN_MENU_OFF, this.onMainMenuOff, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.onActorUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_OFFLINE, this.onActorNetworkDestroy);
    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn);
    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_OFF, this.onMainMenuOff);
  }

  /**
   * @returns Whether theme volume is fading right now.
   */
  public isThemeFading(): boolean {
    return this.dynamicThemeVolume !== this.fadeToThemeVolume;
  }

  /**
   * @returns Whether ambient volume is fading right now.
   */
  public isAmbientFading(): boolean {
    return this.themeAmbientVolume !== this.fadeToAmbientVolume;
  }

  /**
   * Initialize list of themes based on current level.
   */
  public initializeThemes(): void {
    this.areThemesInitialized = false;
    this.isThemeInitializationFailed = false;
    this.themes = new LuaTable();
    this.theme = null;
    this.currentThemeIndex = 0;
    this.currentTrackIndex = 0;
    this.nextTrackStartAt = 0;

    this.themeAmbientVolume = this.gameAmbientVolume;
    this.dynamicThemeVolume = this.gameAmbientVolume;
    this.fadeToThemeVolume = this.gameAmbientVolume;
    this.fadeToAmbientVolume = this.gameAmbientVolume;
    this.volumeChangeStep = this.themeAmbientVolume / 50;

    const levelName: TName = level.name();

    logger.info("Initialize level themes: %s", levelName);

    // Filter themes that are not level specific or expected to work with current level.
    for (const [, themeDescriptor] of musicConfig.dynamicMusicThemes) {
      if (!themeDescriptor.maps || themeDescriptor.maps === "" || string.find(themeDescriptor.maps, levelName)[0]) {
        table.insert(this.themes, themeDescriptor.files);
      }
    }

    if (this.themes.length() === 0) {
      this.isThemeInitializationFailed = true;

      return;
    }

    this.areThemesInitialized = true;
  }

  /**
   * Start one of initialized themes tracks randomly.
   */
  public startTheme(): void {
    if (this.themes.length() === 0) {
      return;
    }

    this.themeAmbientVolume = 0;
    this.dynamicThemeVolume = this.gameAmbientVolume;
    this.currentThemeIndex = math.random(1, this.themes.length());
    this.currentTrackIndex = math.random(1, this.themes.get(this.currentThemeIndex).length());

    setMusicVolume(this.themeAmbientVolume);

    logger.info("Start theme: %s %s %s", this.currentThemeIndex, this.currentTrackIndex, this.dynamicThemeVolume);

    if (!this.theme) {
      this.theme = new StereoSound();
    }

    this.theme.initialize(this.themes.get(this.currentThemeIndex).get(this.currentTrackIndex), this.dynamicThemeVolume);
    this.nextTrackStartAt = this.theme.play() - musicConfig.TRACK_SWITCH_DELTA;
    this.theme.update(this.dynamicThemeVolume);
  }

  /**
   * Proceed with next track in theme list.
   * Switch to next track smoothly and play from defined track seek position.
   */
  public selectNextTrack(): void {
    logger.info("Select next track for dynamic music");

    if ($isNil(this.themes.get(this.currentThemeIndex))) {
      abort("Wrong theme index, no file with '%s' index listed.", this.currentThemeIndex);
    }

    if (this.currentTrackIndex < this.themes.get(this.currentThemeIndex).length()) {
      this.currentTrackIndex += 1;
    } else {
      this.currentTrackIndex = 1;
    }

    if (this.theme) {
      this.nextTrackStartAt =
        this.theme.playAtTime(
          this.nextTrackStartAt + musicConfig.TRACK_SWITCH_DELTA,
          this.themes.get(this.currentThemeIndex).get(this.currentTrackIndex),
          this.dynamicThemeVolume
        ) - musicConfig.TRACK_SWITCH_DELTA;
    }
  }

  /**
   * Compute current dynamic music state based on actor state, silence zones and nearest enemy distance.
   *
   * @returns Current dynamic music state, or null when no state change is required.
   */
  public getThemeState(): Nillable<EDynamicMusicState> {
    const actor: GameObject = registry.actor;

    this.forceFade = false;

    if (actor.alive()) {
      if (!isObjectInSilenceZone(actor)) {
        const nearestEnemyDistanceSqr: Nillable<TDistance> = this.getNearestEnemyDistanceSqr(actor);

        // Enemies farther than `MAX_DIST` count as none, so the theme fades out and finishes below.
        if ($isNotNil(nearestEnemyDistanceSqr)) {
          if (nearestEnemyDistanceSqr < musicConfig.MIN_DIST * musicConfig.MIN_DIST) {
            this.forceFade = true;
            this.fadeToThemeVolume = this.gameAmbientVolume;
            this.fadeToAmbientVolume = 0;

            return this.theme ? EDynamicMusicState.IDLE : EDynamicMusicState.START;
          }

          if (this.theme) {
            if (this.wasInSilence) {
              this.wasInSilence = false;
              this.fadeToAmbientVolume = this.gameAmbientVolume;
            }

            return EDynamicMusicState.IDLE;
          }
        }
      } else if (this.theme) {
        this.wasInSilence = true;
        this.fadeToThemeVolume = 0;
        this.fadeToAmbientVolume = 0;

        return EDynamicMusicState.IDLE;
      }
    }

    if (this.theme) {
      this.fadeToThemeVolume = 0;
      this.fadeToAmbientVolume = this.gameAmbientVolume;

      if (this.isThemeFading() || this.isAmbientFading()) {
        return EDynamicMusicState.IDLE;
      } else {
        setMusicVolume(this.gameAmbientVolume);

        return EDynamicMusicState.FINISH;
      }
    }

    return null;
  }

  /**
   * Fade dynamic theme volume towards the target theme volume for the elapsed time.
   *
   * @param elapsed - Milliseconds passed since the previous music update.
   */
  public fadeTheme(elapsed: TDuration): void {
    this.fadeToThemeVolume = clamp(this.fadeToThemeVolume, 0, this.gameAmbientVolume);
    this.dynamicThemeVolume = this.getNextFadeVolume(
      this.dynamicThemeVolume,
      this.fadeToThemeVolume,
      elapsed,
      musicConfig.THEME_FADE_STEP_DURATION
    );
  }

  /**
   * Fade game music volume towards the target ambient volume for the elapsed time and apply it.
   *
   * @param elapsed - Milliseconds passed since the previous music update.
   */
  public fadeAmbient(elapsed: TDuration): void {
    this.fadeToAmbientVolume = clamp(this.fadeToAmbientVolume, 0, this.gameAmbientVolume);
    this.themeAmbientVolume = this.getNextFadeVolume(
      this.themeAmbientVolume,
      this.fadeToAmbientVolume,
      elapsed,
      musicConfig.AMBIENT_FADE_STEP_DURATION
    );

    setMusicVolume(this.themeAmbientVolume);
  }

  /**
   * @param current - Current volume.
   * @param target - Volume to fade to.
   * @param elapsed - Milliseconds passed since the previous music update.
   * @param stepDuration - Milliseconds one volume change step takes.
   * @returns Volume moved towards the target for the elapsed time, or the target at once when the fade is forced.
   */
  protected getNextFadeVolume(current: TRate, target: TRate, elapsed: TDuration, stepDuration: TDuration): TRate {
    if (this.forceFade) {
      return target;
    }

    const change: TRate = (this.volumeChangeStep * elapsed) / stepDuration;

    return current > target ? math.max(current - change, target) : math.min(current + change, target);
  }

  /**
   * @param actor - Actor game object.
   * @returns Squared distance to the nearest stalker fighting the actor within `MAX_DIST`, or null when none is.
   */
  protected getNearestEnemyDistanceSqr(actor: GameObject): Nillable<TDistance> {
    const actorPosition: Vector = actor.position();
    const actorId: TNumberId = actor.id();
    const combatDistanceSqr: TDistance = musicConfig.MIN_DIST * musicConfig.MIN_DIST;

    let nearestDistanceSqr: Nillable<TDistance> = null;

    for (const [objectId] of registry.stalkers) {
      const object: GameObject = registry.objects.get(objectId).object;
      const enemy: Nillable<GameObject> = object.best_enemy();

      if (enemy && enemy.id() === actorId) {
        const distanceSqr: TDistance = actorPosition.distance_to_sqr(object.position());

        if (distanceSqr < (nearestDistanceSqr ?? musicConfig.MAX_DIST * musicConfig.MAX_DIST)) {
          nearestDistanceSqr = distanceSqr;

          // Any enemy this close starts combat music alike, so the rest are not checked.
          if (distanceSqr < combatDistanceSqr) {
            return distanceSqr;
          }
        }
      }
    }

    return nearestDistanceSqr;
  }

  /**
   * Handle actor update tick, update surge ambient fading and dynamic music themes and track switching.
   *
   * @param delta - Time passed since the previous update, in milliseconds.
   */
  public onActorUpdate(delta: TDuration): void {
    this.updateDelta += delta;

    if (this.updateDelta <= musicConfig.LOGIC_UPDATE_STEP) {
      return;
    }

    const elapsed: TDuration = this.updateDelta;

    this.updateDelta = 0;

    const surgeManager: SurgeManager = getManager(SurgeManager);

    if (surgeManager.isBlowoutSoundPlaying()) {
      if (surgeManager.isKillingAll()) {
        this.forceFade = true;
        this.fadeToAmbientVolume = this.gameAmbientVolume;
        this.fadeAmbient(elapsed);
        this.forceFade = false;
      } else {
        this.fadeToAmbientVolume = 0;
        this.fadeAmbient(elapsed);
      }
    }

    if (IsDynamicMusic()) {
      if (this.isThemeInitializationFailed) {
        return;
      }

      if (!this.areThemesInitialized) {
        this.initializeThemes();
      }

      if (this.theme) {
        this.theme.update(this.dynamicThemeVolume);
      }

      const state: Nillable<EDynamicMusicState> = this.getThemeState();

      if (state === EDynamicMusicState.START) {
        this.startTheme();
      } else if (state === EDynamicMusicState.IDLE) {
        if (this.isThemeFading()) {
          this.fadeTheme(elapsed);
        } else if (this.isAmbientFading()) {
          this.fadeAmbient(elapsed);
        }

        if (time_global() > this.nextTrackStartAt) {
          this.selectNextTrack();
        }
      } else if (state === EDynamicMusicState.FINISH) {
        this.theme?.stop();
        this.areThemesInitialized = false;
      }
    }
  }

  /**
   * Handle actor going offline.
   */
  public onActorNetworkDestroy(): void {
    this.theme?.stop();
    setMusicVolume(this.gameAmbientVolume);
  }

  /**
   * Handle display main menu event.
   */
  public onMainMenuOn(): void {
    setMusicVolume(this.gameAmbientVolume);
  }

  /**
   * Handle hide main menu event.
   */
  public onMainMenuOff(): void {
    this.gameAmbientVolume = getMusicVolume();

    if (this.theme?.isPlaying()) {
      if (IsDynamicMusic()) {
        setMusicVolume(this.themeAmbientVolume);
      } else {
        this.areThemesInitialized = false;
        this.theme.stop();
      }
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      musicConfig: musicConfig,
      themes: this.themes,
      theme: this.theme,
      updateDelta: this.updateDelta,
      themeAmbientVolume: this.themeAmbientVolume,
      dynamicThemeVolume: this.dynamicThemeVolume,
      gameAmbientVolume: this.gameAmbientVolume,
      fadeToAmbientVolume: this.fadeToAmbientVolume,
      fadeToThemeVolume: this.fadeToThemeVolume,
      volumeChangeStep: this.volumeChangeStep,
      currentThemeIndex: this.currentThemeIndex,
      currentTrackIndex: this.currentTrackIndex,
      areThemesInitialized: this.areThemesInitialized,
      isThemeInitializationFailed: this.isThemeInitializationFailed,
      forceFade: this.forceFade,
      wasInSilence: this.wasInSilence,
      nextTrackStartAt: this.nextTrackStartAt,
    };

    return data;
  }
}
