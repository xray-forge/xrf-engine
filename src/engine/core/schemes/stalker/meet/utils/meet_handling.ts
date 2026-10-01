import { EGameObjectRelation, GameObject } from "xray16/alias";
import { FALSE, NIL, Nillable, TCount, TName, TRUE } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { getManager, IRegistryObjectState, registry } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { ISchemeAbuseState } from "@/engine/core/schemes/stalker/abuse";
import { ISchemeMeetState } from "@/engine/core/schemes/stalker/meet";
import { MeetController } from "@/engine/core/schemes/stalker/meet/MeetController";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded";
import { getSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { LuaLogger } from "@/engine/core/utils/logging";
import { isObjectHelpingWounded, isObjectSearchingCorpse } from "@/engine/core/utils/planner";
import { getObjectsRelationSafe } from "@/engine/core/utils/relation";

const logger: LuaLogger = new LuaLogger($filename, { file: "meet" });

/**
 * Enable or disable talking with the object based on its wounded state, relation to the actor and meet use flag.
 *
 * @param object - Game object whose talk availability is updated.
 * @param state - Registry state containing the object's wounded and meet scheme state.
 */
export function updateObjectMeetAvailability(object: GameObject, state: IRegistryObjectState): void {
  const woundedState: Nillable<ISchemeWoundedState> = getSchemeState(state, EScheme.WOUNDED);

  if (woundedState && tostring(woundedState.woundController.woundState) !== NIL) {
    if (object.relation(registry.actor) === EGameObjectRelation.ENEMY) {
      object.disable_talk();
    } else if (woundedState.isTalkEnabled) {
      object.enable_talk();
    } else {
      object.disable_talk();
    }

    return;
  }

  const use: Nillable<string> = getSchemeState(state, EScheme.MEET)?.meetController.use;

  if (use === TRUE) {
    if (isObjectSearchingCorpse(object) || isObjectHelpingWounded(object)) {
      object.disable_talk();
    } else {
      object.enable_talk();
    }
  } else if (use === FALSE) {
    object.disable_talk();

    if (object.is_talking()) {
      object.stop_talk();
    }
  }
}

/**
 * Handle meet interaction with object.
 *
 * @param object - Game object the actor is interacting with.
 */
export function activateMeetWithObject(object: GameObject): void {
  if (!object.alive()) {
    return;
  }

  const state: Nillable<ISchemeMeetState> = getSchemeState(registry.objects.get(object.id()), EScheme.MEET);

  if (!state) {
    return;
  }

  logger.info("Activate meet interaction: '%s'", object.name());

  const actor: GameObject = registry.actor;
  const sound: Nillable<TName> = pickSectionFromCondList(actor, object, state.useSound);

  if ($isNotNil(sound) && sound !== NIL) {
    logger.info("Play meet sound: '%s' - '%s'", object.name(), sound);
    getManager(SoundManager).play(object.id(), sound);
  }

  const meetController: MeetController = state.meetController;

  if (
    meetController.use === FALSE &&
    meetController.isAbuseModeEnabled === TRUE &&
    getObjectsRelationSafe(object, actor) === EGameObjectRelation.FRIEND
  ) {
    addObjectAbuse(object, 1);
  }
}

/**
 * Increment abuse for object.
 *
 * @param object - Game object.
 * @param value - Count of abuse to add.
 */
export function addObjectAbuse(object: GameObject, value: TCount): void {
  const abuseState: Nillable<ISchemeAbuseState> = getSchemeState(registry.objects.get(object.id()), EScheme.ABUSE);

  abuseState?.abuseController.addAbuse(value);
}

/**
 * Clear abuse state for object.
 *
 * @param object - Game object.
 */
export function clearObjectAbuse(object: GameObject): void {
  const state: Nillable<ISchemeAbuseState> = getSchemeState(registry.objects.get(object.id()), EScheme.ABUSE);

  state?.abuseController.clearAbuse();
}

/**
 * Set object abuse state.
 *
 * @param object - Game object.
 * @param isEnabled - Whether object abuse state should be enabled.
 */
export function setObjectAbuseState(object: GameObject, isEnabled: boolean): void {
  const state: Nillable<ISchemeAbuseState> = getSchemeState(registry.objects.get(object.id()), EScheme.ABUSE);

  if (isEnabled) {
    state?.abuseController.enableAbuse();
  } else {
    state?.abuseController.disableAbuse();
  }
}
