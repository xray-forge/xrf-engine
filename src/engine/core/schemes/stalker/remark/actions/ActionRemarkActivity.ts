import { action_base, level, LuabindClass, patrol } from "xray16";
import { GameObject, SoundObject, Vector } from "xray16/alias";
import { abort, NIL, Nillable, TIndex, TNumberId, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import {
  EStalkerState,
  ILookTargetDescriptor,
  IStateControllerCallbackDescriptor,
} from "@/engine/core/animation/types";
import { getManager, getObjectIdByStoryId, registry, setStalkerState } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { getSimulationTerrainByName } from "@/engine/core/managers/simulation/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { getTerrainObjectIdByJobSection } from "@/engine/core/objects/smart_terrain/job";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { ISchemeRemarkState } from "@/engine/core/schemes/stalker/remark";
import { ISchemeEventHandler } from "@/engine/core/schemes/types";
import { getObjectTerrain } from "@/engine/core/utils/position";

const STATE_INITIAL: number = 0;
const STATE_ANIMATION: number = 1;
const STATE_SOUND: number = 2;
const _STATE_FINISH: number = 3;

/**
 * Action playing the remark scheme activity for a stalker: an animation followed by an optional sound,
 * emitting completion signals once both the animation and sound have finished.
 */
@LuabindClass()
export class ActionRemarkActivity extends action_base implements ISchemeEventHandler {
  public st: ISchemeRemarkState;
  public state: number = STATE_INITIAL;

  public soundEndSignalled: boolean = false;
  public actionEndSignalled: boolean = false;
  public animEndSignalled: boolean = false;
  public animScheduled: boolean = false;
  public sndScheduled: boolean = false;
  public sndStarted: boolean = false;
  public tipsSound: Nillable<SoundObject> = null;

  public constructor(state: ISchemeRemarkState) {
    super(null, ActionRemarkActivity.__name);
    this.st = state;
  }

  /**
   * Initialize the action when the planner selects it, fixing the object position and direction.
   */
  public override initialize(): void {
    super.initialize();

    this.object.set_desired_position();
    this.object.set_desired_direction();
  }

  /**
   * Execute the action logic on planner update by advancing the remark state machine.
   */
  public override execute(): void {
    super.execute();
    this.update();
  }

  /**
   * Finalize the action when the planner switches away, stopping any playing tips sound.
   */
  public override finalize(): void {
    if (this.tipsSound) {
      this.tipsSound.stop();
    }

    super.finalize();
  }

  /**
   * Reset the remark state machine and scheduling flags so the activity restarts from the beginning.
   */
  public activate(): void {
    this.st.signals = new LuaTable();
    this.soundEndSignalled = false;
    this.actionEndSignalled = false;
    this.animEndSignalled = false;
    this.animScheduled = true;

    this.sndScheduled = !this.st.sndAnimSync && $isNotNil(this.st.snd);
    this.sndStarted = false;

    this.state = STATE_INITIAL;
    this.tipsSound = null;
  }

  /**
   * Resolve the configured target into a look descriptor for the remark animation.
   *
   * @returns Look target descriptor with object id and/or position, or null when the target is not initialized.
   */
  public getTarget(): Nillable<ILookTargetDescriptor> {
    const lookTargetDescriptor: ILookTargetDescriptor = {
      lookObjectId: null,
      lookPosition: null,
    };

    const [targetPosition, targetId, targetInit] = initTarget(this.object, this.st.target);

    this.st.targetPosition = targetPosition;
    this.st.targetId = targetId;
    this.st.targetInit = targetInit;

    if (this.st.targetInit === false) {
      // --printf("target_is_ni!!!l")
      return null;
    }

    if (this.st.targetId) {
      lookTargetDescriptor.lookObjectId = level.object_by_id(this.st.targetId)?.id() as Nillable<TNumberId>;
    }

    if (this.st.targetPosition) {
      lookTargetDescriptor.lookPosition = this.st.targetPosition;
    }

    return lookTargetDescriptor;
  }

  /**
   * Handle the animation completion callback by advancing the state machine to the sound stage.
   */
  public onAnimationUpdate(): void {
    this.state = STATE_SOUND;
    this.update();
  }

  /**
   * Advance the remark state machine, playing the animation, then the sound, and emitting completion signals.
   */
  public update(): void {
    if (this.state === STATE_INITIAL) {
      const callbackDescriptor: IStateControllerCallbackDescriptor = {
        context: this,
        callback: this.onAnimationUpdate,
      };
      const target = this.getTarget();

      if (!target) {
        const anim: EStalkerState = pickSectionFromCondList(registry.actor, this.object, this.st.anim)!;

        setStalkerState(this.object, anim, callbackDescriptor, 0);
        this.state = STATE_ANIMATION;

        return;
      }

      const anim: EStalkerState = pickSectionFromCondList(registry.actor, this.object, this.st.anim)!;

      setStalkerState(this.object, anim, callbackDescriptor, 0, target);
      this.state = STATE_ANIMATION;
    } else if (this.state === STATE_ANIMATION) {
      // Empty.
    } else if (this.state === STATE_SOUND) {
      if (this.sndScheduled === true) {
        this.sndStarted = true;

        if ($isNotNil(this.st.snd)) {
          getManager(SoundManager).play(this.object.id(), this.st.snd);
        }
      }

      if (this.animEndSignalled === false) {
        this.animEndSignalled = true;
        this.st.signals!.set("anim_end", true);
      }

      if (this.st.signals!.get("sound_end") || this.st.signals!.get("theme_end")) {
        if (this.soundEndSignalled === false) {
          this.soundEndSignalled = true;
        }
      }

      if (this.soundEndSignalled && this.animEndSignalled) {
        if (this.actionEndSignalled === false) {
          this.st.signals!.set("action_end", true);
          this.actionEndSignalled = true;
        }
      }
    }
  }
}

/**
 * Parse a remark target descriptor string into a position, object id and initialization flag.
 *
 * @param object - Game object the target is resolved for.
 * @param targetString - Raw target field value, e.g. "story|story_id", "path|patrol,point" or "job|section,smart".
 * @returns Resolved target position, target object id and whether the target was initialized.
 */
export function initTarget(
  object: GameObject,
  targetString: string
): LuaMultiReturn<[Nillable<Vector>, Nillable<number>, Nillable<boolean>]> {
  // todo: Simplify.

  /**
   * Split a target value into its two comma-separated parts.
   *
   * @param targetStr - Target value to split on the first comma.
   * @returns The part before the comma and the part after it, or the whole string and null when absent.
   */
  function parseTarget(targetStr: string): LuaMultiReturn<[Nillable<string>, Nillable<string>]> {
    const [pos] = string.find(targetStr, ",");

    if ($isNotNil(pos)) {
      return $multi(string.sub(targetStr, 1, pos - 1), string.sub(targetStr, pos + 1));
    } else {
      return $multi(targetStr, null);
    }
  }

  // todo: Simplify.

  /**
   * Split a target value into its type and value parts around the pipe separator, aborting on malformed input.
   *
   * @param targetStr - Target value to split on the pipe character.
   * @returns The target type and the target value.
   */
  function parseType(targetStr: string): LuaMultiReturn<[string, string]> {
    const [pos] = string.find(targetStr, "|");

    if ($isNil(pos)) {
      instruction(object, targetStr);
    }

    const targetType = string.sub(targetStr, 1, pos - 1);
    const target = string.sub(targetStr, pos + 1);

    if ($isNil(target) || target === "" || $isNil(targetType) || targetType === "") {
      instruction(object, targetStr);
    }

    return $multi(targetType, target);
  }

  let targetPosition: Nillable<Vector> = null;
  let targetId: Nillable<TNumberId> = null;
  let isTargetInitialized: boolean = false;

  if (targetString === NIL) {
    return $multi(targetPosition, targetId, isTargetInitialized);
  } else if ($isNil(targetString)) {
    instruction(object, "");
  }

  const [targetType, target] = parseType(targetString);

  if (targetType === "story") {
    const [storyId] = parseTarget(target);

    targetId = getObjectIdByStoryId(storyId!);
    isTargetInitialized = true;
  } else if (targetType === "path") {
    const [path, point] = parseTarget(target);

    const pointIndex: Nillable<TIndex> = tonumber(point);

    if ($isNotNil(pointIndex)) {
      targetPosition = new patrol(path!).point(pointIndex);
      isTargetInitialized = true;
    }
  } else if (targetType === "job") {
    const [job, terrainName] = parseTarget(target);
    const terrain: Nillable<SmartTerrain> = $isNotNil(terrainName)
      ? getSimulationTerrainByName(terrainName)
      : getObjectTerrain(object);

    targetId = getTerrainObjectIdByJobSection(terrain as SmartTerrain, job as TStringId);
    isTargetInitialized = $isNotNil(targetId);
  } else {
    instruction(object, targetString);
  }

  return $multi(targetPosition, targetId, isTargetInitialized);
}

/**
 * Abort with a descriptive error explaining the supported remark target field formats.
 *
 * @param object - Game object whose target field is invalid.
 * @param data - Offending target field value to include in the error message.
 */
function instruction(object: GameObject, data: string): never {
  abort(
    "\nWrong target field for object [%s] in section [%s]!!!\n" +
      "Field [target] supports following:\n" +
      "   target = story | actor or story_id\n" +
      "   target = path  | patrol_path, point_id\n" +
      "   target = job   | job_section, smart_name\n" +
      "Your target field:\n" +
      "   target = %s",
    object.name(),
    registry.objects.get(object.id()).activeSection,
    data
  );
}
