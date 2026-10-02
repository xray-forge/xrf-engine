import { sound_object } from "xray16";
import { GameObject, NetPacket, NetProcessor, SoundObject } from "xray16/alias";
import { ACTOR_ID, AnyObject, assert, Nillable, TName, TNumberId, TRate, TStringId } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { closeLoadMarker, closeSaveMarker, getManager, openLoadMarker, openSaveMarker } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { LoopedSound } from "@/engine/core/managers/sounds/objects/LoopedSound";
import { ObjectSound } from "@/engine/core/managers/sounds/objects/ObjectSound";
import { soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { LuaLogger } from "@/engine/core/utils/logging";
import { isEmpty } from "@/engine/core/utils/table";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager of game effects/sounds/voices triggered from script engine, played from `script_sound.ltx` themes.
 *
 * An object plays one theme at a time with `play`, replaced only by themes that play always,
 * and any number of looped themes by name with `playLooped`, which run until stopped.
 */
export class SoundManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_OFFLINE, this.onActorNetworkDestroy, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.onActorUpdate, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_OFFLINE, this.onActorNetworkDestroy);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.onActorUpdate);
  }

  /**
   * Finish the theme an object plays once it stopped playing, letting it play the next one.
   * Called from the update of objects that play themes.
   *
   * @param objectId - Target object ID to update sound for.
   */
  public updateObject(objectId: TNumberId): void {
    const sound: Nillable<AbstractPlayableSound> = soundsConfig.playing.get(objectId);

    if (sound && !sound.isPlaying(objectId)) {
      sound.onSoundPlayEnded(objectId);
      soundsConfig.playing.delete(objectId);
    }
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, SoundManager.name + "Actor");

    for (const [, sound] of soundsConfig.themes) {
      sound.save(packet);
    }

    closeSaveMarker(packet, SoundManager.name + "Actor");
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, SoundManager.name + "Actor");

    for (const [, theme] of soundsConfig.themes) {
      theme.load(reader);
    }

    soundsConfig.playing = new LuaTable();
    soundsConfig.looped = new LuaTable();

    closeLoadMarker(reader, SoundManager.name + "Actor");
  }

  /**
   * Perform sound state saving for provided object.
   *
   * @param object - Game object to save.
   * @param packet - Net packet to save data into.
   */
  public saveObject(object: GameObject, packet: NetPacket): void {
    openSaveMarker(packet, SoundManager.name + "Object");

    for (const [, sound] of soundsConfig.themes) {
      sound.saveObject(packet, object);
    }

    closeSaveMarker(packet, SoundManager.name + "Object");
  }

  /**
   * Perform sound state saving for provided object.
   *
   * @param object - Game object to save.
   * @param reader - Net reader to read data from.
   */
  public loadObject(object: GameObject, reader: NetProcessor): void {
    openLoadMarker(reader, SoundManager.name + "Object");

    for (const [, sound] of soundsConfig.themes) {
      sound.loadObject(reader, object);
    }

    closeLoadMarker(reader, SoundManager.name + "Object");
  }

  /**
   * Create an unplayed, independently owned sound from a random entry of a registered 3D theme.
   * The caller controls its position, playback and cleanup; object-bound theme playback is unaffected.
   *
   * @param name - Theme registered in script_sound.ltx with type `3d`.
   */
  public createSpatialSound(name: TName): SoundObject {
    const theme = soundsConfig.themes.get(name);

    assert(theme instanceof ObjectSound, "Expected a registered 3D sound theme, got '%s'.", name);

    return new sound_object(theme.soundPaths.get(math.random(1, theme.soundPaths.length())));
  }

  /**
   * Play a theme for provided object, unless it plays another one that the theme does not replace.
   * Based on parsed themes library defined with `script_sound.ltx`.
   *
   * @param objectId - Target object ID to play sound for.
   * @param name - Name of the theme.
   * @param faction - Faction the sound notification shows the speaker of, no notification when missing.
   * @param point - Smart terrain ID or translatable label the sound notification shows the speaker at.
   * @returns Sound object of the theme the object plays.
   */
  public play(
    objectId: TNumberId,
    name: TStringId,
    faction: Nillable<TName> = null,
    point: Nillable<TName | TNumberId> = null
  ): Nillable<SoundObject> {
    const theme: Nillable<AbstractPlayableSound> = soundsConfig.themes.get(name);
    const sound: Nillable<AbstractPlayableSound> = soundsConfig.playing.get(objectId);

    assert(theme, "Not existing sound theme '%s' provided for playing with object '%s'.", name, objectId);
    assert(theme.type !== LoopedSound.type, "Trying to start sound '%s' with incorrect play method.", name);

    if ($isNotNil(sound) && !theme.shouldPlayAlways) {
      return sound.getSoundObject(objectId);
    }

    if ($isNotNil(sound)) {
      logger.info("Reset sound before forced play: %s %s %s %s", objectId, name, faction, point);
      sound.reset(objectId);
    }

    if (theme.play(objectId, faction, point)) {
      logger.info("Start sound play: %s %s %s %s", objectId, name, faction, point);

      soundsConfig.playing.set(objectId, theme);
    }

    return theme.getSoundObject(objectId);
  }

  /**
   * Stops all sounds for provided object ID.
   *
   * @param objectId - Target object ID to stop all sounds for.
   */
  public stop(objectId: TNumberId): void {
    const sound: Nillable<AbstractPlayableSound> = soundsConfig.playing.get(objectId);

    if ($isNotNil(sound)) {
      logger.info("Stop sound play: %s %s", objectId, sound.section);
      sound.stop(objectId);
      soundsConfig.playing.delete(objectId);
    }

    this.stopAllLooped(objectId);
  }

  /**
   * Start looped sound playing for provided object ID.
   *
   * @param objectId - Target object ID to play sound for.
   * @param name - Name of the looped sound to start.
   */
  public playLooped(objectId: TNumberId, name: TName): void {
    const looped: Nillable<LuaTable<TStringId, AbstractPlayableSound>> = soundsConfig.looped.get(objectId);

    if (looped && looped.get(name)?.isPlaying(objectId)) {
      return;
    }

    const theme: Nillable<AbstractPlayableSound> = soundsConfig.themes.get(name);

    assert(theme, "Not existing sound theme '%s' provided for loop playing with object '%s'.", name, objectId);
    assert(theme.type === LoopedSound.type, "Trying to start sound '%s' with incorrect play looped method.", name);

    if (theme.play(objectId)) {
      let collection: Nillable<LuaTable<TStringId, AbstractPlayableSound>> = looped;

      if (!collection) {
        collection = new LuaTable();
        soundsConfig.looped.set(objectId, collection);
      }

      collection.set(name, theme);
    }
  }

  /**
   * Stop looped sound by object ID and name.
   *
   * @param objectId - Target object ID to stop sound for.
   * @param name - Name of the looped sound to stop.
   */
  public stopLooped(objectId: TNumberId, name: TName): void {
    const collection: LuaTable<TStringId, AbstractPlayableSound> = soundsConfig.looped.get(objectId);
    const sound: Nillable<AbstractPlayableSound> = collection?.get(name);

    if (!sound) {
      return;
    }

    // Stopped even when it ended on its own, so the sound releases what it keeps for the object.
    sound.stop(objectId);
    collection.delete(name);

    // Keyed by theme names, so its Lua length is 0 whatever it holds.
    if (isEmpty(collection)) {
      soundsConfig.looped.delete(objectId);
    }
  }

  /**
   * Stop all looped sounds for object.
   *
   * @param objectId - Target object ID to stop sounds for.
   */
  public stopAllLooped(objectId: TNumberId): void {
    const collection: Nillable<LuaTable<TStringId, AbstractPlayableSound>> = soundsConfig.looped.get(objectId);

    if (!collection) {
      return;
    }

    for (const [, sound] of collection) {
      logger.info("Stop looped sound play: %s %s", objectId, sound.section);
      sound.stop(objectId);
    }

    soundsConfig.looped.delete(objectId);
  }

  /**
   * @param objectId - Target object ID to set sound volume for.
   * @param name - Name of the sound to set volume for.
   * @param volume - Value of volume to set.
   */
  public setLoopedSoundVolume(objectId: TNumberId, name: TName, volume: TRate): void {
    const sound: Nillable<AbstractPlayableSound> = soundsConfig.looped.get(objectId)?.get(name);

    if (sound && sound.isPlaying(objectId)) {
      sound.setVolumeForObject(objectId, volume);
    }
  }

  /**
   * Handle actor destroy and mute all sounds.
   */
  public onActorNetworkDestroy(): void {
    this.stop(ACTOR_ID);
  }

  /**
   * Handle actor generic update.
   */
  public onActorUpdate(): void {
    this.updateObject(ACTOR_ID);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      soundsConfig: soundsConfig,
    };

    return data;
  }
}
