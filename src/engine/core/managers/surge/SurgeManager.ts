import { CArtefact, game, hit, level } from "xray16";
import { GameObject, Hit, NetPacket, NetProcessor, Time } from "xray16/alias";
import {
  ACTOR_ID,
  AnyObject,
  createTime,
  createVector,
  Nillable,
  readTimeFromPacket,
  TCount,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TRUE,
  TSection,
  writeTimeToPacket,
  Z_VECTOR,
} from "xray16/lib";
import { $filename } from "xray16/macros";

import { animations, postProcessors } from "@/engine/constants/animation";
import { infoPortions } from "@/engine/constants/info_portions";
import { TLevel } from "@/engine/constants/levels";
import { taskIds } from "@/engine/constants/task_ids";
import type { AnomalyZoneBinder } from "@/engine/core/binders/zones";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateAnomalyZonesDisplay } from "@/engine/core/managers/map/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import {
  getNearestAvailableSurgeCover,
  initializeSurgeCovers,
  isSurgeEnabledOnLevel,
  killAllSurgeUnhidden,
  launchSurgeSignalRockets,
  playSurgeEndedSound,
  playSurgeStartingSound,
  playSurgeWillHappenSoonSound,
} from "@/engine/core/managers/surge/utils";
import { TaskManager } from "@/engine/core/managers/tasks";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { isArtefact } from "@/engine/core/utils/class_ids";
import { isBlackScreen } from "@/engine/core/utils/game";
import { createGameAutoSave } from "@/engine/core/utils/game_save";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Schedule surges and run their stages: warnings, effects, damage and the kill of everyone left outside a cover.
 *
 * Todo: Separate manager to handle artefacts spawn / ownership etc in parallel, do not mix logic.
 */
export class SurgeManager extends AbstractManager {
  // Whether manager should respawn artefacts for specific level.
  public respawnArtefactsForLevel: LuaTable<TName, boolean> = new LuaTable();
  // Surge time of the last stage update, see `getElapsedSurgeTime`.
  public currentDuration: TDuration = 0;

  public isEffectorSet: boolean = false;
  // Whether the surge was loaded running, so its looped effects are restored on its next stage update.
  public isAfterGameLoad: boolean = false;
  public isUiDisabled: boolean = false;
  public isTaskGiven: boolean = false;
  public isSecondMessageGiven: boolean = false;
  public isBlowoutSoundStarted: boolean = false;
  // Whether the next surge skipped while time is forwarded is reported to the actor.
  public shouldNotifySkip: boolean = true;

  public initializedAt: Time = game.get_game_time();
  public lastSurgeAt: Time = game.get_game_time();

  public surgeMessage: TLabel = "";
  public surgeTaskSection: TSection = "";

  /**
   * Delay of next surge happening.
   * Next surge is timestamp is `lastTimestamp + delay`.
   */
  public nextScheduledSurgeDelay: TDuration = math.random(
    surgeConfig.INTERVAL_MIN_FIRST_TIME,
    surgeConfig.INTERVAL_MAX_FIRST_TIME
  );

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorGoOnline, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorGoOnline);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, SurgeManager.name);

    packet.w_bool(surgeConfig.IS_FINISHED);
    packet.w_bool(surgeConfig.IS_STARTED);

    writeTimeToPacket(packet, this.lastSurgeAt);

    if (surgeConfig.IS_STARTED) {
      writeTimeToPacket(packet, this.initializedAt);

      packet.w_bool(this.isTaskGiven);
      packet.w_bool(this.isEffectorSet);
      packet.w_bool(this.isSecondMessageGiven);
      packet.w_bool(this.isUiDisabled);
      packet.w_bool(this.isBlowoutSoundStarted);

      packet.w_stringZ(this.surgeMessage);
      packet.w_stringZ(this.surgeTaskSection);
    }

    packet.w_u32(this.nextScheduledSurgeDelay);

    packet.w_u16(table.size(this.respawnArtefactsForLevel));

    for (const [level] of this.respawnArtefactsForLevel) {
      packet.w_stringZ(level);
    }

    closeSaveMarker(packet, SurgeManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, SurgeManager.name);

    this.resetSurgeState();
    this.shouldNotifySkip = true;
    this.respawnArtefactsForLevel = new LuaTable();

    surgeConfig.IS_FINISHED = reader.r_bool();
    surgeConfig.IS_STARTED = reader.r_bool();

    this.lastSurgeAt = readTimeFromPacket(reader)!;

    if (surgeConfig.IS_STARTED) {
      this.initializedAt = readTimeFromPacket(reader)!;

      this.isTaskGiven = reader.r_bool();
      this.isEffectorSet = reader.r_bool();
      this.isSecondMessageGiven = reader.r_bool();
      this.isUiDisabled = reader.r_bool();
      this.isBlowoutSoundStarted = reader.r_bool();

      this.surgeMessage = reader.r_stringZ();
      this.surgeTaskSection = reader.r_stringZ();
    }

    this.nextScheduledSurgeDelay = reader.r_u32();
    this.isAfterGameLoad = surgeConfig.IS_STARTED;

    const count: TCount = reader.r_u16();

    for (const _ of $range(1, count)) {
      this.respawnArtefactsForLevel.set(reader.r_stringZ(), true);
    }

    closeLoadMarker(reader, SurgeManager.name);
  }

  /**
   * Report the next surge skipped while time is forwarded, as one slept through.
   */
  public enableSkipNotification(): void {
    this.shouldNotifySkip = true;
  }

  /**
   * Set the task section given to the actor when the surge starts.
   *
   * @param task - Task section to assign for the next surge.
   */
  public setSurgeTask(task: TSection): void {
    this.surgeTaskSection = task;
  }

  /**
   * Set the message label displayed to the actor during the surge.
   *
   * @param message - Message label to display for the next surge.
   */
  public setSurgeMessage(message: TLabel): void {
    this.surgeMessage = message;
  }

  /**
   * Check whether the surge is in its lethal phase killing unhidden objects.
   *
   * @returns Whether the surge is started and currently killing all unhidden objects.
   */
  public isKillingAll(): boolean {
    return surgeConfig.IS_STARTED && this.isUiDisabled;
  }

  /**
   * @param now - Current game time.
   * @returns Game seconds until the next surge is due, negative once it is overdue.
   */
  public getTimeToNextSurge(now: Time = game.get_game_time()): TDuration {
    return this.nextScheduledSurgeDelay - now.diffSec(this.lastSurgeAt);
  }

  /**
   * @param now - Current game time.
   * @returns Real seconds at the current time factor since the surge started, the unit of its duration and stages.
   */
  public getElapsedSurgeTime(now: Time = game.get_game_time()): TDuration {
    return math.ceil(now.diffSec(this.initializedAt) / level.get_time_factor());
  }

  /**
   * Let game minutes pass at once through an active surge, killing and ending it when they outlast its time left.
   *
   * @param minutes - Game minutes about to pass, as while the actor sleeps on an anabiotic.
   */
  public forwardSurgeTime(minutes: TDuration): void {
    if (!surgeConfig.IS_STARTED) {
      return;
    }

    const remainingMinutes: TDuration =
      ((surgeConfig.DURATION - this.getElapsedSurgeTime()) * level.get_time_factor()) / 60;

    if (minutes > remainingMinutes) {
      logger.info("Surge passed while time is forwarded: %s", minutes);

      surgeConfig.IS_TIME_FORWARDED = true;
      this.isUiDisabled = true;

      killAllSurgeUnhidden();
      this.endSurge();
    }
  }

  /**
   * Give the actor the task to hide from the surge unless the task section is disabled.
   */
  protected giveSurgeHideTask(): void {
    if (this.surgeTaskSection !== "empty") {
      getManager(TaskManager).giveTask(this.surgeTaskSection === "" ? taskIds.hide_from_surge : this.surgeTaskSection);
    }

    // Mark as given regardless of the task section.
    // Prevents doubled alarms / sounds / weather effects etc.
    this.isTaskGiven = true;
  }

  /**
   * Request a forced surge start if surge covers are available on the current level.
   */
  public requestSurgeStart(): void {
    logger.info("Request surge start");

    if (getNearestAvailableSurgeCover(registry.actor)) {
      this.start(true);
    } else {
      logger.info("Surge covers are not set, cannot start surge");
    }
  }

  /**
   * Request manual stop of the currently active surge.
   */
  public requestSurgeStop(): void {
    logger.info("Request surge stop");

    if (surgeConfig.IS_STARTED) {
      this.endSurge(true);
    }
  }

  /**
   * Start surge.
   */
  public start(isForced?: boolean): void {
    logger.info("Surge start");

    if (isForced) {
      this.initializedAt = game.get_game_time();
    } else {
      const [Y, M, D, h, m, s, ms] = this.lastSurgeAt.get(0, 0, 0, 0, 0, 0, 0);

      // A due surge starts when it was scheduled, which is long past once time was forwarded over it.
      this.initializedAt = createTime(Y, M, D, h, m, s + this.nextScheduledSurgeDelay, ms);
    }

    if (!isSurgeEnabledOnLevel(level.name())) {
      logger.info("Surge is not enabled on level");

      this.shouldNotifySkip = false;
      this.skipSurge();

      return;
    }

    const elapsed: TDuration = this.getElapsedSurgeTime();

    if (elapsed + 6 > surgeConfig.DURATION) {
      logger.info("Surge can be considered skipped: %s", elapsed + 6);

      this.skipSurge();
    } else {
      surgeConfig.IS_STARTED = true;
      surgeConfig.IS_FINISHED = false;

      if (
        !hasInfoPortion(infoPortions.pri_b305_fifth_cam_end) ||
        hasInfoPortion(infoPortions.pri_a28_actor_in_zone_stay)
      ) {
        createGameAutoSave("st_save_uni_surge_start");
      }
    }
  }

  /**
   * Skip the current surge, reset its state, schedule the next one and respawn artefacts.
   */
  public skipSurge(): void {
    logger.info("Skipped surge");

    const [Y, M, D, h, m, s, ms] = this.initializedAt.get(0, 0, 0, 0, 0, 0, 0);

    this.finishSurge(createTime(Y, M, D, h, m, s + surgeConfig.DURATION, ms));
    this.respawnArtefactsAndReplaceAnomalyZones();

    EventsManager.emitEvent(EGameEvent.SURGE_SKIPPED, this.shouldNotifySkip);

    this.shouldNotifySkip = false;
  }

  /**
   * End the active surge, reset state, stop effects and sounds, kill unhidden objects and respawn artefacts.
   *
   * @param manual - Whether the surge is ended manually, forcing weather change.
   */
  public endSurge(manual?: boolean): void {
    logger.info("Ending surge: %s", manual);

    this.finishSurge(game.get_game_time());

    const soundManager: SoundManager = getManager(SoundManager);

    // Both loops are stopped whatever stage the surge reached, stopping one that is not playing does nothing.
    soundManager.stopLooped(ACTOR_ID, "blowout_rumble");
    soundManager.stopLooped(ACTOR_ID, "surge_earthquake_sound_looped");

    level.remove_pp_effector(surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID);
    level.remove_cam_effector(surgeConfig.EARTHQUAKE_CAM_EFFECTOR_ID);

    // The surge weather effect runs its course unless the surge is cut short.
    if ((manual || surgeConfig.IS_TIME_FORWARDED) && level.is_wfx_playing()) {
      level.stop_weather_fx();
      getManager(WeatherManager).forceWeatherChange();
    }

    for (const [, signalLight] of registry.signalLights) {
      signalLight.stopFly();
    }

    // A surge loaded running that ends before its next stage update still kills.
    if (this.isAfterGameLoad) {
      this.isAfterGameLoad = false;
      killAllSurgeUnhidden();
    }

    this.respawnArtefactsAndReplaceAnomalyZones();

    EventsManager.emitEvent(EGameEvent.SURGE_ENDED);
  }

  /**
   * Mark the surge finished and schedule the next one.
   *
   * @param finishedAt - Game time the surge finished at, counted from for the next one.
   */
  protected finishSurge(finishedAt: Time): void {
    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_FINISHED = true;

    for (const [level] of surgeConfig.RESPAWN_ARTEFACTS_LEVELS) {
      this.respawnArtefactsForLevel.set(level, true);
    }

    this.lastSurgeAt = finishedAt;
    this.nextScheduledSurgeDelay = math.random(surgeConfig.INTERVAL_MIN, surgeConfig.INTERVAL_MAX);

    this.resetSurgeState();
  }

  /**
   * Reset the state a single surge runs with: its stages, message and task.
   */
  protected resetSurgeState(): void {
    this.currentDuration = 0;
    this.isTaskGiven = false;
    this.isBlowoutSoundStarted = false;
    this.isEffectorSet = false;
    this.isSecondMessageGiven = false;
    this.isUiDisabled = false;
    this.surgeMessage = "";
    this.surgeTaskSection = "";
  }

  /**
   * Respawn artefacts and change layers in all anomaly zones, then refresh the map display.
   */
  public respawnArtefactsAndReplaceAnomalyZones(): void {
    const levelName: TLevel = level.name();

    if (this.respawnArtefactsForLevel.get(levelName)) {
      this.respawnArtefactsForLevel.delete(levelName);
    }

    for (const [, anomalyZone] of registry.anomalyZones) {
      anomalyZone.respawnArtefactsAndChangeLayers();
    }

    updateAnomalyZonesDisplay();
  }

  public override update(): void {
    if (isBlackScreen()) {
      return;
    }

    if (this.respawnArtefactsForLevel.get(level.name())) {
      this.respawnArtefactsAndReplaceAnomalyZones();
    }

    if (!surgeConfig.IS_STARTED) {
      const currentGameTime: Time = game.get_game_time();

      if (surgeConfig.IS_TIME_FORWARDED) {
        const diff: TCount = math.abs(this.getTimeToNextSurge(currentGameTime));

        if (diff < surgeConfig.INTERVAL_MIN_AFTER_TIME_FORWARD) {
          logger.info("Time forward, reschedule from: %s", this.nextScheduledSurgeDelay);

          this.nextScheduledSurgeDelay =
            surgeConfig.INTERVAL_MAX_AFTER_TIME_FORWARD + currentGameTime.diffSec(this.lastSurgeAt);

          logger.info("Time forward, reschedule to: %s", this.nextScheduledSurgeDelay);
        }

        surgeConfig.IS_TIME_FORWARDED = false;
      }

      if (
        this.getTimeToNextSurge(currentGameTime) > 0 ||
        pickSectionFromCondList(registry.actor, null, surgeConfig.CAN_START_SURGE) !== TRUE ||
        !getNearestAvailableSurgeCover(registry.actor)
      ) {
        return;
      }

      return this.start();
    }

    const surgeDuration: TDuration = this.getElapsedSurgeTime();

    if (this.currentDuration !== surgeDuration) {
      this.currentDuration = surgeDuration;

      if (!isSurgeEnabledOnLevel(level.name())) {
        this.endSurge();

        return;
      }

      const soundManager: SoundManager = getManager(SoundManager);

      if (surgeDuration >= surgeConfig.DURATION) {
        playSurgeEndedSound();
        this.endSurge();
      } else {
        launchSurgeSignalRockets();

        if (this.isAfterGameLoad) {
          if (this.isBlowoutSoundStarted) {
            soundManager.playLooped(ACTOR_ID, "blowout_rumble");
          }

          if (this.isEffectorSet) {
            level.add_pp_effector(postProcessors.surge_shock, surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID, true);
          }

          if (this.isSecondMessageGiven) {
            soundManager.playLooped(ACTOR_ID, "surge_earthquake_sound_looped");
            level.add_cam_effector(
              animations.camera_effects_earthquake,
              surgeConfig.EARTHQUAKE_CAM_EFFECTOR_ID,
              true,
              ""
            );
          }

          this.isAfterGameLoad = false;
        }

        if (this.isEffectorSet) {
          level.set_pp_effector_factor(surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID, surgeDuration / 90, 0.1);
        }

        if (this.isBlowoutSoundStarted) {
          soundManager.setLoopedSoundVolume(ACTOR_ID, "blowout_rumble", surgeDuration / 180);
        }

        const coverObject: Nillable<GameObject> = getNearestAvailableSurgeCover(registry.actor);

        if (
          surgeDuration >= 140 &&
          !this.isUiDisabled &&
          (!coverObject || !coverObject.inside(registry.actor.position()))
        ) {
          let att: number = 1 - (185 - surgeDuration) / (185 - 140);

          att = att * att * att * 0.3;

          const surgeHit: Hit = new hit();

          surgeHit.type = hit.telepatic;
          surgeHit.power = att;
          surgeHit.impulse = 0.0;
          surgeHit.direction = Z_VECTOR;
          surgeHit.draftsman = registry.actor;

          if (pickSectionFromCondList(registry.actor, null, surgeConfig.CAN_SURVIVE_SURGE) === TRUE) {
            if (registry.actor.health <= surgeHit.power) {
              surgeHit.power = registry.actor.health - 0.05;
              if (surgeHit.power < 0) {
                surgeHit.power = 0;
              }
            }
          }

          registry.actor.hit(surgeHit);
        }

        if (surgeDuration >= 185 && !this.isUiDisabled) {
          killAllSurgeUnhidden();
          this.isUiDisabled = true;
        } else if (surgeDuration >= 140 && !this.isSecondMessageGiven) {
          playSurgeWillHappenSoonSound();

          soundManager.playLooped(ACTOR_ID, "surge_earthquake_sound_looped");
          level.add_cam_effector(
            animations.camera_effects_earthquake,
            surgeConfig.EARTHQUAKE_CAM_EFFECTOR_ID,
            true,
            ""
          );
          this.isSecondMessageGiven = true;
        } else if (surgeDuration >= 100 && !this.isEffectorSet) {
          level.add_pp_effector(postProcessors.surge_shock, surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID, true);
          // --                level.set_pp_effector_factor(surge_shock_pp_eff, 0, 10)
          this.isEffectorSet = true;
        } else if (surgeDuration >= 35 && !this.isBlowoutSoundStarted) {
          soundManager.play(ACTOR_ID, "blowout_begin");
          soundManager.playLooped(ACTOR_ID, "blowout_rumble");
          soundManager.setLoopedSoundVolume(ACTOR_ID, "blowout_rumble", 0.25);

          this.isBlowoutSoundStarted = true;
        } else if (surgeDuration >= 0 && !this.isTaskGiven) {
          playSurgeStartingSound();
          level.set_weather_fx("fx_surge_day_3");
          this.giveSurgeHideTask();
        }
      }
    }
  }

  /**
   * Handle actor taking artefacts.
   *
   * @param object - Taken by actor game object.
   */
  public onActorItemTake(object: GameObject): void {
    if (isArtefact(object)) {
      logger.info("On artefact take: %s", object.name());

      const id: TNumberId = object.id();
      const zone: Nillable<AnomalyZoneBinder> = registry.artefacts.parentZones.get(id) as Nillable<AnomalyZoneBinder>;

      if (zone) {
        zone.onArtefactTaken(id);
      } else {
        registry.artefacts.ways.delete(id);
      }

      (object.get_artefact() as CArtefact).FollowByPath("NULL", 0, createVector(500, 500, 500));
    }
  }

  /**
   * On actor network spawn initialize covers for related location.
   */
  public onActorGoOnline(): void {
    initializeSurgeCovers();
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      surgeConfig: surgeConfig,
      respawnArtefactsForLevel: this.respawnArtefactsForLevel,
      currentDuration: this.currentDuration,
      isEffectorSet: this.isEffectorSet,
      isAfterGameLoad: this.isAfterGameLoad,
      isUiDisabled: this.isUiDisabled,
      isTaskGiven: this.isTaskGiven,
      isSecondMessageGiven: this.isSecondMessageGiven,
      isBlowoutSoundStarted: this.isBlowoutSoundStarted,
      shouldNotifySkip: this.shouldNotifySkip,
      initializedAt: this.initializedAt,
      lastSurgeAt: this.lastSurgeAt,
      nextScheduledSurgeDelay: this.nextScheduledSurgeDelay,
      surgeMessage: this.surgeMessage,
      surgeTaskSection: this.surgeTaskSection,
    };

    return data;
  }
}
