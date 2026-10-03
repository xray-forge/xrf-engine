import { GameObject } from "xray16/alias";
import { Nillable } from "xray16/lib";

import { IRegistryObjectState } from "@/engine/core/database";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded/wounded_types";
import { getSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";

/**
 * Recalculate the wound state of an object before its planners run, so all their evaluators read the same one.
 *
 * @param object - Game object whose wound state is recalculated.
 * @param state - Registry state containing the object's wounded scheme state.
 */
export function updateObjectWound(object: GameObject, state: IRegistryObjectState): void {
  const woundedState: Nillable<ISchemeWoundedState> = getSchemeState(state, EScheme.WOUNDED);

  // Not configured yet, or in a smart cover, which captures the animation state.
  if (!woundedState?.isWoundedInitialized || object.in_smart_cover()) {
    return;
  }

  woundedState.woundController.update();
}
