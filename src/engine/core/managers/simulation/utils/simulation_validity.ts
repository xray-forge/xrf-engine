import { Nillable, TLabel } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { getGameGuardHookRejection } from "@/engine/core/hooks/hooks";
import { EGameHook } from "@/engine/core/hooks/hooks_types";
import type { TSimulationObject } from "@/engine/core/managers/simulation/types";
import type { Squad } from "@/engine/core/objects/squad";

/**
 * Whether a squad may take a simulation target: the target's own rules, then the extensions' guards.
 *
 * @param squad - Squad weighing the target.
 * @param target - Simulation target.
 * @param isPopulationDecreaseNeeded - Whether the squad already counts in the target's population.
 * @returns Whether the squad may take the target, and why not when it may not.
 */
export function canSquadTakeSimulationTarget(
  squad: Squad,
  target: TSimulationObject,
  isPopulationDecreaseNeeded?: boolean
): LuaMultiReturn<[boolean, Nillable<TLabel>]> {
  const [isValid, rejection] = target.isValidSimulationTarget(squad, isPopulationDecreaseNeeded);

  if (!isValid) {
    return $multi(false, rejection);
  }

  const reason: Nillable<TLabel> = getGameGuardHookRejection(EGameHook.SIMULATION_TARGET_VALIDITY, target, squad);

  if ($isNotNil(reason)) {
    return $multi(false, reason);
  }

  return $multi(true, null);
}
