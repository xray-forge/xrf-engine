import { GameObject } from "xray16/alias";

import { getManager, IRegistryObjectState, registry } from "@/engine/core/database";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { EDeimosBound, ISchemeDeimosState } from "@/engine/core/schemes/restrictor/sr_deimos/sr_deimos_types";
import { getSchemeStateOptimistic } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";

/**
 * Check Deimos intensity direction and bound, as vanilla `check_deimos_phase` does.
 * Increasing intensity is active at the bound and above it, decreasing intensity is active below the bound.
 *
 * @param object - Restrictor object to check phase for.
 * @param bound - Intensity bound to check.
 * @param isIncreasing - Whether deimos intensity is expected to increase or decrease.
 * @returns Whether deimos phase is active in restrictor game object.
 */
export function isDeimosPhaseActive(object: GameObject, bound: EDeimosBound, isIncreasing: boolean): boolean {
  const state: IRegistryObjectState = registry.objects.get(object.id());

  // Deimos is not activated, phase is disabled.
  if (state.activeScheme !== EScheme.SR_DEIMOS) {
    return false;
  }

  const deimosState: ISchemeDeimosState = getSchemeStateOptimistic(state, EScheme.SR_DEIMOS);

  // Intensity grows while the actor is not faster than the zone movement speed, rates only scale the change.
  const isGrowing: boolean = getManager(DeimosManager).getActorMovementSpeed() <= deimosState.movementSpeed;

  if (isGrowing !== isIncreasing) {
    return false;
  }

  switch (bound) {
    case EDeimosBound.DISABLE:
      return isIncreasing
        ? deimosState.intensity >= deimosState.disableBound
        : deimosState.intensity < deimosState.disableBound;

    case EDeimosBound.LOWER:
      return isIncreasing
        ? deimosState.intensity >= deimosState.switchLowerBound
        : deimosState.intensity < deimosState.switchLowerBound;

    case EDeimosBound.UPPER:
      return isIncreasing
        ? deimosState.intensity >= deimosState.switchUpperBound
        : deimosState.intensity < deimosState.switchUpperBound;
  }

  return false;
}
