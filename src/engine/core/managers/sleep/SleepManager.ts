import { level } from "xray16";
import { AnyObject, executeConsoleCommand, getConsoleFloatCommand, TDuration } from "xray16/lib";
import { $filename } from "xray16/macros";

import { animations, postProcessors } from "@/engine/constants/animation";
import { consoleCommands } from "@/engine/constants/console_commands";
import { infoPortions } from "@/engine/constants/info_portions";
import { getManager, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { sleepConfig } from "@/engine/core/managers/sleep/SleepConfig";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { SleepDialog } from "@/engine/core/ui/game/sleep";
import { disableInfoPortion, giveInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage sleep process of the actor.
 */
export class SleepManager extends AbstractManager {
  public nextSleepDuration: TDuration = 0;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  /**
   * Show sleep dialog and set current active time for it.
   */
  public showSleepDialog(): void {
    logger.info("Show sleep dialog");

    if (!sleepConfig.SLEEP_DIALOG) {
      sleepConfig.SLEEP_DIALOG = new SleepDialog(this);
    }

    sleepConfig.SLEEP_DIALOG.uiTimeTrack.SetCurrentValue();
    sleepConfig.SLEEP_DIALOG.show();
  }

  /**
   * Start sleeping and related animations.
   */
  public startSleep(hours: TDuration): void {
    logger.info("Start sleep for: %s", hours);

    this.nextSleepDuration = hours;

    getManager(ActorInputManager).acquireControl(EActorControlHandle.SLEEP, "sleep", EActorControlPolicy.FULL_UI);

    level.add_cam_effector(animations.camera_effects_sleep, 10, false, "engine.on_start_sleeping");
    level.add_pp_effector(postProcessors.sleep_fade, 11, false);

    giveInfoPortion(infoPortions.actor_is_sleeping);

    registry.musicVolume = getConsoleFloatCommand(consoleCommands.snd_volume_music);
    registry.effectsVolume = getConsoleFloatCommand(consoleCommands.snd_volume_eff);

    executeConsoleCommand(consoleCommands.snd_volume_music, 0);
    executeConsoleCommand(consoleCommands.snd_volume_eff, 0);

    getManager(SurgeManager).setSkipResurrectMessage();
  }

  /**
   * Start sleeping animation.
   */
  public onStartSleeping(): void {
    logger.info("On start sleeping");

    level.add_cam_effector(animations.camera_effects_sleep, 10, false, "engine.on_finish_sleeping");
    level.change_game_time(0, this.nextSleepDuration, 0);

    getManager(WeatherManager).forceWeatherChange();
    surgeConfig.IS_TIME_FORWARDED = true;

    if (surgeConfig.IS_STARTED && level.is_wfx_playing()) {
      level.stop_weather_fx();
    }

    registry.actor.power = 1;

    EventsManager.emitEvent(EGameEvent.ACTOR_START_SLEEP);
  }

  /**
   * Wake up from sleep and show UI.
   */
  public onFinishSleeping(): void {
    logger.info("On finish sleeping");

    getManager(ActorInputManager).releaseGameUiControl(EActorControlHandle.SLEEP);

    executeConsoleCommand(consoleCommands.snd_volume_music, registry.musicVolume);
    executeConsoleCommand(consoleCommands.snd_volume_eff, registry.effectsVolume);

    registry.musicVolume = 0;
    registry.effectsVolume = 0;

    giveInfoPortion(infoPortions.tutorial_sleep);
    disableInfoPortion(infoPortions.actor_is_sleeping);
    disableInfoPortion(infoPortions.sleep_active);

    EventsManager.emitEvent(EGameEvent.ACTOR_FINISH_SLEEP);
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
    };

    return data;
  }
}
