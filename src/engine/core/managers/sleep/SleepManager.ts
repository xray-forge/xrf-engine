import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, Nillable, TDuration, TRate } from "xray16/lib";
import { $filename } from "xray16/macros";

import { animations, postProcessors } from "@/engine/constants/animation";
import { infoPortions } from "@/engine/constants/info_portions";
import { drugs } from "@/engine/constants/items/drugs";
import { getManager, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { sleepConfig } from "@/engine/core/managers/sleep/SleepConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { SleepDialog } from "@/engine/core/ui/game/sleep";
import { forwardGameTime } from "@/engine/core/utils/game";
import { disableInfoPortion, giveInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";
import { getEffectsVolume, getMusicVolume, setEffectsVolume, setMusicVolume } from "@/engine/core/utils/sound";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage actor sleep: in a bed for chosen hours, or on an anabiotic for under an hour.
 */
export class SleepManager extends AbstractManager {
  public nextSleepDuration: TDuration = 0;
  // Created on first use.
  public sleepDialog: Nillable<SleepDialog> = null;
  // Sound volumes muted while the actor sleeps, restored on waking up.
  public musicVolume: TRate = 0;
  public effectsVolume: TRate = 0;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_USE_ITEM, this.onActorUseItem, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_USE_ITEM, this.onActorUseItem);
  }

  /**
   * Show sleep dialog and set current active time for it.
   */
  public showSleepDialog(): void {
    logger.info("Show sleep dialog");

    if (!this.sleepDialog) {
      this.sleepDialog = new SleepDialog(this);
    }

    this.sleepDialog.show();
  }

  /**
   * Mute music and effects while the actor sleeps, remembering their volumes.
   */
  protected muteSound(): void {
    this.musicVolume = getMusicVolume();
    this.effectsVolume = getEffectsVolume();

    setMusicVolume(0);
    setEffectsVolume(0);
  }

  /**
   * Restore music and effects volumes muted for the sleep.
   */
  protected restoreSound(): void {
    setMusicVolume(this.musicVolume);
    setEffectsVolume(this.effectsVolume);

    this.musicVolume = 0;
    this.effectsVolume = 0;
  }

  /**
   * Start sleeping and related animations.
   */
  public startSleep(hours: TDuration): void {
    logger.info("Start sleep for: %s", hours);

    this.nextSleepDuration = hours;

    getManager(ActorInputManager).acquireControl(EActorControlHandle.SLEEP, "sleep", EActorControlPolicy.FULL_UI, true);

    level.add_cam_effector(
      animations.camera_effects_sleep,
      sleepConfig.SLEEP_CAM_EFFECTOR_ID,
      false,
      "engine.on_start_sleeping"
    );
    level.add_pp_effector(postProcessors.sleep_fade, sleepConfig.SLEEP_FADE_PP_EFFECTOR_ID, false);

    giveInfoPortion(infoPortions.actor_is_sleeping);

    this.muteSound();

    getManager(SurgeManager).enableSkipNotification();
  }

  /**
   * Start sleeping animation.
   */
  public onStartSleeping(): void {
    logger.info("On start sleeping");

    level.add_cam_effector(
      animations.camera_effects_sleep,
      sleepConfig.SLEEP_CAM_EFFECTOR_ID,
      false,
      "engine.on_finish_sleeping"
    );

    forwardGameTime(this.nextSleepDuration);

    registry.actor.power = 1;

    EventsManager.emitEvent(EGameEvent.ACTOR_START_SLEEP);
  }

  /**
   * Wake up from sleep and show UI.
   */
  public onFinishSleeping(): void {
    logger.info("On finish sleeping");

    getManager(ActorInputManager).releaseGameUiControl(EActorControlHandle.SLEEP, true);

    this.restoreSound();

    giveInfoPortion(infoPortions.tutorial_sleep);
    disableInfoPortion(infoPortions.actor_is_sleeping);
    disableInfoPortion(infoPortions.sleep_active);

    EventsManager.emitEvent(EGameEvent.ACTOR_FINISH_SLEEP);
  }

  /**
   * Fall asleep on an anabiotic, locking actor UI while its effects play.
   */
  public startAnabioticSleep(): void {
    logger.info("Start anabiotic sleep");

    getManager(ActorInputManager).acquireControl(
      EActorControlHandle.ANABIOTIC,
      "anabiotic",
      EActorControlPolicy.UI_ONLY,
      true
    );

    level.add_cam_effector(
      animations.camera_effects_surge_02,
      sleepConfig.SLEEP_CAM_EFFECTOR_ID,
      false,
      "engine.on_anabiotic_sleep"
    );
    level.add_pp_effector(postProcessors.surge_fade, sleepConfig.SLEEP_FADE_PP_EFFECTOR_ID, false);

    giveInfoPortion(infoPortions.anabiotic_in_process);

    this.muteSound();
  }

  /**
   * Sleep on an anabiotic for up to 45 game minutes, which pass through an active surge.
   */
  public onAnabioticSleep(): void {
    level.add_cam_effector(
      animations.camera_effects_surge_01,
      sleepConfig.SLEEP_CAM_EFFECTOR_ID,
      false,
      "engine.on_anabiotic_wake_up"
    );

    const minutes: TDuration = math.random(35, 45);

    logger.info("On anabiotic sleep: %s", minutes);

    getManager(SurgeManager).forwardSurgeTime(minutes);
    forwardGameTime(0, minutes);
  }

  /**
   * Wake up from an anabiotic sleep and show UI.
   */
  public onAnabioticWakeUp(): void {
    logger.info("On anabiotic wake up");

    getManager(ActorInputManager).releaseGameUiControl(EActorControlHandle.ANABIOTIC, true);

    this.restoreSound();

    disableInfoPortion(infoPortions.anabiotic_in_process);
  }

  /**
   * Handle actor item use, falling asleep on an anabiotic.
   *
   * @param object - Item game object used by the actor.
   */
  public onActorUseItem(object: Nillable<GameObject>): void {
    if (object && registry.simulator.object(object.id())?.section_name() === drugs.drug_anabiotic) {
      this.startAnabioticSleep();
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      sleepConfig: sleepConfig,
      nextSleepDuration: this.nextSleepDuration,
      musicVolume: this.musicVolume,
      effectsVolume: this.effectsVolume,
    };

    return data;
  }
}
