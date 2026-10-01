import { FS, get_hud, getFS, sound_object, time_global } from "xray16";
import { GameObject, IniFile, NetPacket, NetProcessor, SoundObject } from "xray16/alias";
import {
  assert,
  createEmptyVector,
  LuaArray,
  NIL,
  Nillable,
  TCount,
  TDuration,
  TIndex,
  TName,
  TNumberId,
  TPath,
  TSection,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registry } from "@/engine/core/database";
import { parseStringsList, readIniString } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ISoundNotification } from "@/engine/core/managers/notifications/notifications_types";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { getActiveSchemeState, IBaseSchemeState } from "@/engine/core/schemes/state";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

export interface IObjectSoundPlayback {
  canPlay: boolean;
  idleTime: Nillable<TDuration>;
  pdaSoundObject: Nillable<SoundObject>;
  playedSoundIndex: Nillable<TIndex>;
  playingStartedAt: Nillable<TTimestamp>;
  soundObject: Nillable<SoundObject>;
}

/**
 * Playable sound bound to a game object and emitted from its 3D world position.
 */
export class ObjectSound extends AbstractPlayableSound {
  public static readonly type: EPlayableSound = EPlayableSound["3D"];

  public readonly type: EPlayableSound = ObjectSound.type;
  public readonly soundPaths: LuaArray<TPath> = new LuaTable();
  public readonly playback: LuaTable<TNumberId, IObjectSoundPlayback> = new LuaTable();

  public shuffle: ESoundPlaylistType;

  public minIdle: TDuration;
  public maxIdle: TDuration;
  public rnd: number;

  public constructor(ini: IniFile, section: TSection) {
    super(ini, section);

    const interval: LuaArray<string> = parseStringsList(readIniString(ini, section, "idle", false, null, "3,5,100"));

    this.shuffle = readIniString(ini, section, "shuffle", false, null, ESoundPlaylistType.RANDOM) as ESoundPlaylistType;
    this.minIdle = tonumber(interval.get(1))!;
    this.maxIdle = tonumber(interval.get(2))!;
    this.rnd = tonumber(interval.get(3))!;

    const fs: FS = getFS();

    if ($isNotNil(fs.exist(roots.gameSounds, this.path + ".ogg"))) {
      this.soundPaths.set(1, this.path);
    } else {
      let index: TIndex = 1;

      while (fs.exist(roots.gameSounds, this.path + index + ".ogg")) {
        this.soundPaths.set(index, this.path + index);
        index += 1;
      }
    }

    assert(this.soundPaths.length() > 0, "There are no sound collection with path: '%s'.", this.path);
  }

  /**
   * Start playing the next sound from the object position, optionally adding a PDA variant for distant actors.
   *
   * @param objectId - Id of the game object emitting the sound.
   * @param faction - Faction the sound notification shows the speaker of.
   * @param point - Smart terrain ID or translatable label the sound notification shows the speaker at.
   * @returns Whether the sound playback was started.
   */
  public play(objectId: TNumberId, faction?: Nillable<TName>, point?: Nillable<TName | TNumberId>): boolean {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object;

    if (!object) {
      return false; // No object existing.
    }

    const playback: IObjectSoundPlayback = this.getPlayback(objectId);

    if (!playback.canPlay) {
      return false; // Cannot play.
    } else if (
      playback.playingStartedAt &&
      time_global() - playback.playingStartedAt < (playback.idleTime as TDuration)
    ) {
      return false; // Still playing.
    }

    playback.playingStartedAt = null;
    playback.playedSoundIndex = this.selectNextSound(objectId);

    // Nothing to play.
    if (playback.playedSoundIndex === -1) {
      return false;
    }

    logger.info("Play object sound: %s %s %s", object.name(), faction, point);

    const fs: FS = getFS();
    const soundPath: Nillable<TPath> = this.soundPaths.get(playback.playedSoundIndex!);

    // If actor is far from NPC, play pda sounds.
    if (
      soundPath &&
      $isNotNil(fs.exist(roots.gameSounds, soundPath + "_pda.ogg")) &&
      object.position().distance_to_sqr(registry.actor.position()) >= 5
    ) {
      playback.pdaSoundObject = new sound_object(soundPath + "_pda");
      playback.pdaSoundObject.play_at_pos(registry.actor, createEmptyVector(), 0, sound_object.s2d);
      playback.pdaSoundObject.volume = 0.8;
    }

    playback.canPlay = false;
    playback.soundObject = new sound_object(soundPath);
    playback.soundObject.play_at_pos(object, object.position(), 0, sound_object.s3d);

    EventsManager.emitEvent<ISoundNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.SOUND,
      faction,
      point,
      soundPath,
    });

    return true;
  }

  /**
   * Stop the active sound and also stop and release the PDA sound object if it is playing.
   */
  public override stop(objectId: TNumberId): void {
    const playback: Nillable<IObjectSoundPlayback> = this.playback.get(objectId);

    if (!playback) {
      return;
    }

    if (playback.soundObject?.playing()) {
      playback.soundObject.stop();
    }

    if (playback.pdaSoundObject?.playing()) {
      playback.pdaSoundObject.stop();
    }

    this.playback.delete(objectId);
  }

  /**
   * Stop and clear object-specific playback so a forced play request can start immediately.
   *
   * @param objectId - Identifier of the object whose sound state is reset.
   */
  public override reset(objectId: TNumberId): void {
    this.stop(objectId);
  }

  /**
   * Select the index of the next sound to play based on the configured playlist type.
   *
   * @returns Index of the next sound to play, -1 when the sequence is exhausted, or null when type is unknown.
   */
  public selectNextSound(objectId: TNumberId): Nillable<TIndex> {
    const soundsCount: TCount = this.soundPaths.length();
    const playback: IObjectSoundPlayback = this.getPlayback(objectId);

    if (this.shuffle === ESoundPlaylistType.RANDOM) {
      if (soundsCount === 1) {
        return 1;
      } else if ($isNotNil(playback.playedSoundIndex)) {
        const playedId: TNumberId = math.random(1, soundsCount - 1);

        if (playedId >= playback.playedSoundIndex) {
          return playedId + 1;
        }

        return playedId;
      } else {
        return math.random(1, soundsCount);
      }
    }

    if (this.shuffle === ESoundPlaylistType.SEQUENCE) {
      if (playback.playedSoundIndex === -1) {
        return -1;
      } else if ($isNil(playback.playedSoundIndex)) {
        return 1;
      } else if (playback.playedSoundIndex < soundsCount) {
        return playback.playedSoundIndex + 1;
      } else {
        return -1;
      }
    }

    if (this.shuffle === ESoundPlaylistType.LOOP) {
      if ($isNil(playback.playedSoundIndex)) {
        return 1;
      } else if (playback.playedSoundIndex < soundsCount) {
        return playback.playedSoundIndex + 1;
      } else {
        return 1;
      }
    }

    return null;
  }

  /**
   * Handle end of sound playback by resetting state, scheduling idle time and emitting scheme end signals.
   *
   * @param objectId - Id of the game object whose sound finished playing.
   */
  public override onSoundPlayEnded(objectId: TNumberId): void {
    const playback: IObjectSoundPlayback = this.getPlayback(objectId);

    logger.info(
      "Sound play ended: %s %s %s",
      objectId,
      playback.playedSoundIndex,
      this.soundPaths.get(playback.playedSoundIndex as TIndex)
    );

    playback.playingStartedAt = time_global();
    playback.idleTime = math.random(this.minIdle, this.maxIdle) * 1000;
    playback.soundObject = null;
    playback.canPlay = true;

    get_hud().RemoveCustomStatic("cs_subtitles_object");

    const state: Nillable<IRegistryObjectState> = registry.objects.get(objectId);

    if (!state) {
      return;
    }

    const schemeState: Nillable<IBaseSchemeState> = getActiveSchemeState(state);

    if (schemeState?.signals) {
      if (playback.playedSoundIndex === this.soundPaths.length() && this.shuffle !== ESoundPlaylistType.RANDOM) {
        logger.info("Emit sound end signal: %s", state.object.name());

        schemeState.signals.set("theme_end", true);
        schemeState.signals.set("sound_end", true);
      } else {
        logger.info("Emit sound end signal: %s", state.object.name());

        schemeState.signals.set("sound_end", true);
      }
    }
  }

  /**
   * Save the index of the last played sound to the save packet.
   *
   * @param packet - Net packet to write the sound state into.
   */
  public override save(packet: NetPacket): void {
    packet.w_stringZ(NIL);
  }

  /**
   * Load the index of the last played sound from the save reader.
   *
   * @param reader - Net processor to read the sound state from.
   */
  public override load(reader: NetProcessor): void {
    reader.r_stringZ();
  }

  /**
   * Check whether this sound is playing for an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @returns Whether the object has an active 3D or PDA sound.
   */
  public override isPlaying(objectId: TNumberId): boolean {
    const playback: Nillable<IObjectSoundPlayback> = this.playback.get(objectId);

    return playback?.soundObject?.playing() === true || playback?.pdaSoundObject?.playing() === true;
  }

  /**
   * Return the active 3D sound object for an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @returns Active 3D sound object, or null when the object is not playing one.
   */
  public override getSoundObject(objectId: TNumberId): Nillable<SoundObject> {
    return this.playback.get(objectId)?.soundObject;
  }

  private getPlayback(objectId: TNumberId): IObjectSoundPlayback {
    let playback: Nillable<IObjectSoundPlayback> = this.playback.get(objectId);

    if (!playback) {
      playback = {
        canPlay: true,
        idleTime: null,
        pdaSoundObject: null,
        playedSoundIndex: null,
        playingStartedAt: null,
        soundObject: null,
      };
      this.playback.set(objectId, playback);
    }

    return playback;
  }
}
