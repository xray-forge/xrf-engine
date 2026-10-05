import { ServerCreatureObject } from "xray16/alias";
import { LuaArray, Nillable, TLabel, TName, TNumberId, TRate } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  addDebugField,
  describeDebugObject,
  describeDebugRates,
  formatDebugGameDuration,
  getDebugObjectLevelName,
} from "@/engine/core/managers/debug/utils/debug_inspect";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { IAvailableSimulationTargetDescriptor, TSimulationObject } from "@/engine/core/managers/simulation/types";
import {
  evaluateSimulationPriorityByDistance,
  evaluateSimulationPropertiesPriority,
  getSimulationTerrains,
  getSlicedSimulationTargets,
} from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import type { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { getServerDistanceBetween } from "@/engine/core/utils/position";

/**
 * Terrain a squad would want but may not take, with why.
 */
interface IDebugRejectedTarget {
  terrain: SmartTerrain;
  priority: TRate;
  reason: TLabel;
}

/**
 * @param id - Object id.
 * @returns Name of the object, `null` without an id.
 */
function describeOptionalObject(id: Nillable<TNumberId>): Nillable<TLabel> {
  return $isNil(id) ? null : describeDebugObject(id);
}

/**
 * @param squad - Simulation squad.
 * @returns The squad's action, with the time left while it stays on a target.
 */
function describeSquadAction(squad: Squad): Nillable<TLabel> {
  if ($isNil(squad.currentAction)) {
    return null;
  } else if (squad.currentAction.type === ESquadActionType.STAY_ON_TARGET) {
    return `staying, ${formatDebugGameDuration((squad.currentAction as SquadStayOnTargetAction).getStayIdleDuration())} left`;
  }

  return "reaching the target";
}

/**
 * Describe a squad for the simulation tab: its control, action and targets, members, and why it picks its targets.
 *
 * @param squad - Simulation squad.
 * @returns Labelled values describing the squad.
 */
export function inspectDebugSquad(squad: Squad): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();
  const scriptedTargetId: Nillable<TNumberId> = squad.getScriptedSimulationTarget();

  addDebugField(fields, "squad", describeDebugObject(squad.id));
  addDebugField(fields, "section", squad.section_name());
  addDebugField(fields, "faction", squad.faction);
  addDebugField(fields, "level", getDebugObjectLevelName(squad));
  addDebugField(fields, "state", squad.online ? "online" : "offline");
  addDebugField(
    fields,
    "control",
    $isNil(scriptedTargetId) ? "simulation" : `scripted, to ${describeDebugObject(scriptedTargetId)}`
  );
  addDebugField(fields, "as a target", registry.simulationObjects.has(squad.id) ? "available" : "unavailable");
  addDebugField(fields, "action", describeSquadAction(squad));
  addDebugField(fields, "assigned target", describeOptionalObject(squad.assignedTargetId));
  addDebugField(fields, "current target", describeOptionalObject(squad.currentTargetId));
  addDebugField(fields, "smart terrain", describeOptionalObject(squad.assignedTerrainId));
  addDebugField(
    fields,
    "respawned by",
    $isNil(squad.respawnPointId) ? null : `${describeDebugObject(squad.respawnPointId)}, ${squad.respawnPointSection}`
  );
  addDebugField(fields, "behaviour", describeDebugRates(squad.behaviour));

  for (const member of squad.squad_members()) {
    const creature: Nillable<ServerCreatureObject> = registry.simulator.object(member.id);

    addDebugField(
      fields,
      member.id === squad.commander_id() ? "commander" : "member",
      $isNil(creature)
        ? describeDebugObject(member.id)
        : string.format("%s, %.0f%%", creature.name(), creature.health() * 100)
    );
  }

  if ($isNil(scriptedTargetId)) {
    explainDebugSquadTargets(fields, squad);
  }

  return fields;
}

/**
 * @param squad - Simulation squad.
 * @returns Terrains on the squad's level it may not take, the most wanted first.
 */
function getRejectedTargets(squad: Squad): LuaArray<IDebugRejectedTarget> {
  const rejected: LuaArray<IDebugRejectedTarget> = new LuaTable();
  const squadLevel: TName = getDebugObjectLevelName(squad);

  for (const [, terrain] of getSimulationTerrains()) {
    if (getDebugObjectLevelName(terrain) === squadLevel) {
      const reason: Nillable<TLabel> = registry.simulationObjects.has(terrain.id)
        ? terrain.getSimulationTargetRejection(squad)
        : "simulation unavailable";

      if ($isNotNil(reason)) {
        table.insert(rejected, {
          terrain,
          priority:
            evaluateSimulationPropertiesPriority(terrain, squad) * evaluateSimulationPriorityByDistance(terrain, squad),
          reason,
        });
      }
    }
  }

  table.sort(rejected, (first, second) => first.priority > second.priority);

  return rejected;
}

/**
 * Explain the squad's next choice: the targets it picks from at random with their scores, and the terrains it would
 * want most but may not take, with why.
 *
 * @param fields - Fields to add to.
 * @param squad - Simulation squad under simulation control.
 */
export function explainDebugSquadTargets(fields: LuaArray<IDebugField>, squad: Squad): void {
  // The slice is a shared buffer, read before anything scores again.
  const candidates: LuaArray<IAvailableSimulationTargetDescriptor> = getSlicedSimulationTargets(
    squad,
    simulationConfig.TARGET_CHOICES
  );

  for (const index of $range(1, candidates.length())) {
    const target: TSimulationObject = candidates.get(index).target;

    addDebugField(
      fields,
      `choice ${index}`,
      string.format(
        "%s: %.2f = (%d + %.2f) x %.3f, %.0f m",
        target.name(),
        candidates.get(index).priority,
        simulationConfig.TARGET_PRIORITY_BASE,
        evaluateSimulationPropertiesPriority(target, squad) - simulationConfig.TARGET_PRIORITY_BASE,
        evaluateSimulationPriorityByDistance(target, squad),
        getServerDistanceBetween(target, squad)
      )
    );
  }

  if (candidates.length() === 0) {
    addDebugField(fields, "choices", "none, the squad stays on its terrain");
  }

  const rejected: LuaArray<IDebugRejectedTarget> = getRejectedTargets(squad);

  for (const index of $range(1, math.min(rejected.length(), simulationConfig.TARGET_CHOICES))) {
    const it: IDebugRejectedTarget = rejected.get(index);

    addDebugField(fields, "wants", string.format("%s: %.2f, %s", it.terrain.name(), it.priority, it.reason));
  }
}
