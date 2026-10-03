import { LuabindClass, property_evaluator } from "xray16";
import { GameObject } from "xray16/alias";
import { NIL, TRUE } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { getPortableStoreValue } from "@/engine/core/database/portable_store";
import {
  ISchemeWoundedState,
  PS_WOUNDED_FIGHT,
  PS_WOUNDED_STATE,
} from "@/engine/core/schemes/stalker/wounded/wounded_types";

/**
 * Evaluator to check if object is wounded critically.
 */
@LuabindClass()
export class EvaluatorWounded extends property_evaluator {
  public readonly state: ISchemeWoundedState;

  public constructor(state: ISchemeWoundedState) {
    super(null, EvaluatorWounded.__name);
    this.state = state;
  }

  /**
   * Check the wound state, which `updateObjectWound` recalculates before the planners run.
   */
  public override evaluate(): boolean {
    const object: GameObject = this.object;

    // If scheme is not activated or object is in smart cover (animation state is captured).
    if (!this.state.isWoundedInitialized || object.in_smart_cover()) {
      return false;
    }

    if (object.critically_wounded()) {
      return false;
    }

    // If fighting and wounded_fight is set to 'true' still fight.
    if ($isNotNil(object.best_enemy()) && getPortableStoreValue(object.id(), PS_WOUNDED_FIGHT) === TRUE) {
      return false;
    }

    // Wounded state is set for an object, consider it wounded.
    return tostring(getPortableStoreValue(object.id(), PS_WOUNDED_STATE)) !== NIL;
  }
}
