import { action_base, hit, LuabindClass, object, time_global } from "xray16";
import { GameObject, Hit } from "xray16/alias";
import { abort, NIL, TName, TNumberId, TRUE, TSection, TTimestamp } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { EStalkerState } from "@/engine/core/animation/types";
import {
  getManager,
  getPortableStoreValue,
  IRegistryObjectState,
  registry,
  setPortableStoreValue,
  setStalkerState,
} from "@/engine/core/database";
import { registerWoundedObject, unRegisterWoundedObject } from "@/engine/core/database/wounded";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { initializeObjectCanSelectWeaponState } from "@/engine/core/schemes/runtime/scheme_object_initialization";
import { schemeWoundedConfig } from "@/engine/core/schemes/stalker/wounded/SchemeWoundedConfig";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import {
  ISchemeWoundedState,
  PS_BEGIN_WOUNDED,
  PS_WOUNDED_SOUND,
  PS_WOUNDED_STATE,
} from "@/engine/core/schemes/stalker/wounded/wounded_types";
import { EScheme } from "@/engine/core/schemes/types";
import { LuaLogger } from "@/engine/core/utils/logging";
import { giveWoundedObjectMedkit } from "@/engine/core/utils/object";

const logger: LuaLogger = new LuaLogger($filename);

const OBJECT_IDLE = object.idle;

/**
 * Action to handle stalkers wounded state.
 * If stalkers are wounded, they lay on ground and call for help.
 */
@LuabindClass()
export class ActionWounded extends action_base {
  public readonly state: ISchemeWoundedState;
  public nextSoundPlayAt: TTimestamp = 0;

  public constructor(state: ISchemeWoundedState) {
    super(null, ActionWounded.__name);
    this.state = state;
  }

  public override initialize(): void {
    super.initialize();

    const object: GameObject = this.object;

    logger.info("Become wounded: %s", object.name());

    object.set_desired_position();
    object.set_desired_direction();

    if (this.state.helpStartDialog) {
      object.set_start_dialog(this.state.helpStartDialog);
    }

    object.movement_enabled(false);
    object.disable_trade();
    object.wounded(true);

    // Settle weapon before laying animation starts.
    // Wounded states expect no active weapon, and every weapon action requires no animation to be played, so
    // weapon change happening later interrupts laying animation - object stands up and lays down again.
    object.set_item(OBJECT_IDLE, null);
    object.can_select_weapon(false);

    // Give some time to fall before calling for help.
    this.nextSoundPlayAt = time_global() + schemeWoundedConfig.CALL_FOR_HELP_DELAY;

    registerWoundedObject(object);
  }

  public override finalize(): void {
    super.finalize();

    const object: GameObject = this.object;

    logger.info("Free from wounded state: %s", object.name());

    object.enable_trade();
    object.disable_talk();
    object.wounded(false);
    object.movement_enabled(true);

    // Restore weapon selection based on active logics configuration.
    const state: IRegistryObjectState = registry.objects.get(object.id());

    initializeObjectCanSelectWeaponState(object, state.activeScheme as EScheme, state, state.activeSection as TSection);

    unRegisterWoundedObject(object);
  }

  /**
   * Execute current action as being wounded.
   */
  public override execute(): void {
    super.execute();

    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const woundController: WoundController = this.state.woundController;
    const now: TTimestamp = time_global();

    // Handle healing up by objects after some timeout.
    if (this.state.isAutoHealing && !woundController.canUseMedkit) {
      const woundedAt: TTimestamp = getPortableStoreValue(objectId, PS_BEGIN_WOUNDED)!;

      if ($isNil(woundedAt)) {
        setPortableStoreValue(objectId, PS_BEGIN_WOUNDED, now);
      } else if (now - woundedAt > schemeWoundedConfig.WOUNDED_TIMEOUT) {
        giveWoundedObjectMedkit(object);
        woundController.unlockMedkit();
      }
    }

    const woundControllerState: EStalkerState = getPortableStoreValue<EStalkerState>(objectId, PS_WOUNDED_STATE)!;
    const woundControllerSound: TName = getPortableStoreValue(objectId, PS_WOUNDED_SOUND)!;

    if (woundControllerState === TRUE) {
      const hitObject: Hit = new hit();

      hitObject.power = 0;
      hitObject.direction = object.direction();
      hitObject.bone("bip01_spine");
      hitObject.draftsman = registry.actor;
      hitObject.impulse = 0;
      hitObject.type = hit.wound;

      object.hit(hitObject);
    } else {
      if (this.state.canUseMedkit === true) {
        woundController.useMedkit();
      }

      if (tostring(woundControllerState) === NIL) {
        abort("Wrong wounded animation '%s'.", object.name());
      }

      setStalkerState(object, woundControllerState, null, null, null, { isForced: true });
    }

    // Play call for help not more often than once per 5 seconds.
    if (now > this.nextSoundPlayAt) {
      if ($isNotNil(woundControllerSound) && woundControllerSound !== NIL) {
        getManager(SoundManager).play(objectId, woundControllerSound);
      }

      this.nextSoundPlayAt = now + schemeWoundedConfig.CALL_FOR_HELP_PERIOD;
    }
  }
}
