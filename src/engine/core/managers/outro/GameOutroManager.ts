import { game, get_hud, sound_object } from "xray16";
import { ESoundObjectType, SoundObject } from "xray16/alias";
import { AnyObject, Nillable } from "xray16/lib";
import { $filename } from "xray16/macros";

import { gameTutorials } from "@/engine/constants/game_tutorials";
import { getManager } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { gameOutroConfig } from "@/engine/core/managers/outro/GameOutroConfig";
import { calculateSoundFade } from "@/engine/core/managers/outro/utils/outro_sound_utils";
import { disconnectFromGame } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Play the end of the game: the outro scenes with their music, then the credits.
 */
export class GameOutroManager extends AbstractManager {
  public sound: Nillable<SoundObject> = null;
  // Whether the credits rolled after the outro, kept after the game disconnects for the main menu to return.
  public isGameoverCreditsStarted: boolean = false;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  /**
   * Start game outro tutorial (scenes shown to summarize game plot).
   */
  public startOutro(): void {
    logger.info("Starting game outro");

    game.start_tutorial(gameTutorials.outro_game);
  }

  /**
   * Start sound playback when game end tutorial is displayed.
   */
  public startSound(): void {
    logger.info("Start outro sound");

    this.sound = new sound_object(gameOutroConfig.MUSIC);
    this.sound.play(null, 0.0, ESoundObjectType.S2D);

    this.setSoundVolume(1.0);
  }

  /**
   * Stop game end tutorial music.
   */
  public stopSound(): void {
    logger.info("Stop outro sound");

    if (this.sound) {
      this.sound.stop();
      this.sound = null;
    }
  }

  /**
   * Set volume of current end game sound.
   *
   * @param volume - Target music volume.
   */
  public setSoundVolume(volume: number): void {
    if (this.sound) {
      this.sound.volume = volume;
    }
  }

  /**
   * Start black screen display and game outro music.
   */
  public startBlackScreenAndSound(): void {
    this.startSound();

    get_hud().AddCustomStatic("blackscreen", true);

    getManager(ActorInputManager).acquireControl(EActorControlHandle.OUTRO, "outro", EActorControlPolicy.UI_ONLY, true);
  }

  /**
   * Stop game outro music, disconnect from the game and roll the game credits.
   */
  public stopBlackScreenAndSound(): void {
    this.stopSound();

    getManager(ActorInputManager).releaseControl(EActorControlHandle.OUTRO);

    disconnectFromGame();
    this.startCredits();
  }

  /**
   * Roll the game credits once the game has ended.
   */
  public startCredits(): void {
    logger.info("Start game credits");

    this.isGameoverCreditsStarted = true;

    game.start_tutorial(gameTutorials.credits_seq);
  }

  /**
   * Update outro sound volume during the fade-in phase based on the provided progress factor.
   *
   * @param factor - Current fade progress factor.
   */
  public updateBlackScreenAndSoundFadeStart(factor: number): void {
    this.setSoundVolume(calculateSoundFade(factor, 0.6, 1.0, gameOutroConfig.VOLUME_MAX, gameOutroConfig.VOLUME_MIN));
  }

  /**
   * Update outro sound volume during the fade-out phase based on the provided progress factor.
   *
   * @param factor - Current fade progress factor.
   */
  public updateBlackScreenAndSoundFadeStop(factor: number): void {
    this.setSoundVolume(
      factor < 0.5
        ? calculateSoundFade(factor, 0, 0.12, gameOutroConfig.VOLUME_MIN, gameOutroConfig.VOLUME_MAX)
        : calculateSoundFade(factor, 0.7, 0.95, gameOutroConfig.VOLUME_MAX, 0.0)
    );
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      gameOutroConfig: gameOutroConfig,
      sound: this.sound,
      isGameoverCreditsStarted: this.isGameoverCreditsStarted,
    };

    return data;
  }
}
