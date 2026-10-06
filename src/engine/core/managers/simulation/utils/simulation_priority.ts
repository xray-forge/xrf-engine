import { ServerObject } from "xray16/alias";
import { LuaArray, Nillable, TCount, TIndex, TNumberId, TRate } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { IAvailableSimulationTargetDescriptor, TSimulationObject } from "@/engine/core/managers/simulation";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { canSquadTakeSimulationTarget } from "@/engine/core/managers/simulation/utils/simulation_validity";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { areObjectsOnSameLevel, getServerDistanceBetween } from "@/engine/core/utils/position";

// Shared result buffer for sliced targets - rewritten on every call, consumers read the result
// immediately and never retain the reference (allocation-free, anomaly-proven pattern).
const SLICED_TARGETS_BUFFER: LuaArray<IAvailableSimulationTargetDescriptor> = new LuaTable();

/**
 * Evaluates simulation priority by distance.
 * Used as normalizer to pick better tasks based on distance from object.
 *
 * @param first - One of objects to measure priority by distance.
 * @param second - One of objects to measure priority by distance.
 * @returns Priority evaluated by distance.
 */
export function evaluateSimulationPriorityByDistance(first: ServerObject, second: ServerObject): TRate {
  return 1 + 1 / math.max(getServerDistanceBetween(first, second), 1);
}

/**
 * Weigh a target by what the squad wants: the base priority plus each behaviour rate of the squad times the target's
 * matching property.
 *
 * @param target - Simulation target to weigh.
 * @param squad - Squad weighing it.
 * @returns Priority before distance and validity are accounted for.
 */
export function evaluateSimulationPropertiesPriority(target: TSimulationObject, squad: Squad): TRate {
  let priority: TRate = simulationConfig.TARGET_PRIORITY_BASE;

  for (const [property, rate] of squad.behaviour) {
    const squadCoefficient: TRate = tonumber(rate) as TRate;
    let targetCoefficient: TRate = 0;

    if (target.simulationProperties.has(property)) {
      targetCoefficient = target.simulationProperties.get(property);
    }

    priority += squadCoefficient * targetCoefficient;
  }

  return priority;
}

/**
 * Evaluate objects selection priority for alife simulation.
 *
 * @param target - Simulation target to evaluate priority for.
 * @param squad - Squad trying to reach the target.
 * @returns Alife simulation priority for target selection.
 */
export function evaluateSimulationPriority(target: TSimulationObject, squad: Squad): TRate {
  // Blocking level traveling and specific preconditions.
  // Same-level check runs first - most registry entries are off-level and the check is two
  // memoized table reads, while target validity evaluates population counts and preconditions.
  if (!areObjectsOnSameLevel(target, squad)) {
    return 0;
  }

  const [isValid] = canSquadTakeSimulationTarget(squad, target);

  if (!isValid) {
    return 0;
  }

  return evaluateSimulationPropertiesPriority(target, squad) * evaluateSimulationPriorityByDistance(target, squad);
}

/**
 * Get the highest priority simulation targets for a squad, ordered from the highest.
 *
 * Note: returns a shared scratch buffer rewritten on every call - read results immediately,
 * do not retain the reference between calls.
 *
 * @param squad - Squad to get simulation targets for.
 * @param slice - Number of priority tasks to get.
 * @returns List of possible simulation targets to pick with priorities.
 */
export function getSlicedSimulationTargets(
  squad: Squad,
  slice: TCount
): LuaArray<IAvailableSimulationTargetDescriptor> {
  const availableTargets: LuaArray<IAvailableSimulationTargetDescriptor> = SLICED_TARGETS_BUFFER;
  const squadId: TNumberId = squad.id;

  let filled: TCount = 0;

  for (const [, target] of registry.simulationObjects) {
    const priority: TRate = target.id === squadId ? 0 : evaluateSimulationPriority(target, squad);

    // A full slice only takes targets above its lowest one, which drops out.
    if (priority > 0 && (filled < slice || priority > availableTargets.get(slice).priority)) {
      if (filled < slice) {
        filled += 1;
      }

      let index: TIndex = filled;

      // Records are mutated in place to avoid garbage.
      if ($isNil(availableTargets.get(index))) {
        availableTargets.set(index, { target, priority });
      }

      // Shift lower priority records down to keep the slice ordered.
      while (index > 1 && availableTargets.get(index - 1).priority < priority) {
        const lower: IAvailableSimulationTargetDescriptor = availableTargets.get(index);
        const higher: IAvailableSimulationTargetDescriptor = availableTargets.get(index - 1);

        lower.target = higher.target;
        lower.priority = higher.priority;
        index -= 1;
      }

      const record: IAvailableSimulationTargetDescriptor = availableTargets.get(index);

      record.target = target;
      record.priority = priority;
    }
  }

  // Drop stale records left from previous, longer fills.
  for (const it of $range(filled + 1, availableTargets.length())) {
    availableTargets.delete(it);
  }

  return availableTargets;
}

/**
 * Get simulation target for squad participating in alife, picked at random among the highest priority ones.
 *
 * @param squad - Squad to generate simulation target for.
 * @returns Simulation object to target or null based on priorities.
 */
export function getSquadSimulationTarget(squad: Squad): Nillable<TSimulationObject> {
  const availableTargets: LuaArray<IAvailableSimulationTargetDescriptor> = getSlicedSimulationTargets(
    squad,
    simulationConfig.TARGET_CHOICES
  );
  const availableTargetsCount: TCount = availableTargets.length();

  return availableTargetsCount > 0
    ? availableTargets.get(math.random(availableTargetsCount)).target
    : (squad.assignedTerrainId && registry.simulator.object<SmartTerrain>(squad.assignedTerrainId)) || squad;
}
