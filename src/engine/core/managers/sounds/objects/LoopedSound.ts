import { getFS, sound_object } from "xray16";
import { GameObject, IniFile, SoundObject, TSoundObjectType } from "xray16/alias";
import { assert, Nillable, TNumberId, TRate, TSection } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { registry } from "@/engine/core/database";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { EPlayableSound } from "@/engine/core/managers/sounds/sounds_types";

/**
 * Playable sound that loops continuously at the position of a game object.
 */
export class LoopedSound extends AbstractPlayableSound {
  public static readonly type: EPlayableSound = EPlayableSound.LOOPED;

  public readonly type: EPlayableSound = LoopedSound.type;
  public readonly soundObjects: LuaTable<TNumberId, SoundObject> = new LuaTable();

  public constructor(ini: IniFile, section: TSection) {
    super(ini, section);

    assert(getFS().exist(roots.gameSounds, this.path + ".ogg"), "There are no looped sound with path: '%s'", this.path);
  }

  /**
   * Play the looped sound at the position of the target object.
   *
   * @param objectId - Identifier of the object to play the looped sound at.
   * @returns Whether the looped sound started playing successfully.
   */
  public play(objectId: TNumberId): boolean {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object;

    if ($isNil(object)) {
      return false;
    } else {
      const sound: SoundObject = new sound_object(this.path);

      sound.play_at_pos(
        object,
        object.position(),
        0,
        // The engine `s3d` flag is 0, so this plays the sound in 3D and looped.
        (sound_object.s3d + sound_object.looped) as TSoundObjectType
      );

      this.soundObjects.set(objectId, sound);

      return true;
    }
  }

  /**
   * Check whether the looped sound is still playing for an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @returns Whether the object's looped sound is playing.
   */
  public override isPlaying(objectId: TNumberId): boolean {
    return this.soundObjects.get(objectId)?.playing() === true;
  }

  /**
   * Stop and forget the looped sound for an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   */
  public override stop(objectId: TNumberId): void {
    const sound: Nillable<SoundObject> = this.soundObjects.get(objectId);

    if (sound?.playing()) {
      sound.stop();
    }

    this.soundObjects.delete(objectId);
  }

  /**
   * Set the volume of the looped sound playing for an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @param level - Volume level to apply.
   */
  public override setVolumeForObject(objectId: TNumberId, level: TRate): void {
    const sound: Nillable<SoundObject> = this.soundObjects.get(objectId);

    if ($isNotNil(sound)) {
      sound.volume = level;
    }
  }
}
