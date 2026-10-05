import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { LuaArray, Nillable, TCount, TLabel, TNumberId, wrapText } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import {
  EDebugOverlayView,
  IDebugField,
  IDebugFlowResult,
  IDebugOverlayState,
  IDebugPreferences,
} from "@/engine/core/managers/debug/debug_types";
import {
  addDebugField,
  describeDebugObject,
  formatDebugPosition,
  inspectDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_inspect";
import {
  getDebugSimulationSquad,
  getDebugSimulationTerrain,
} from "@/engine/core/managers/debug/utils/debug_simulation";
import { summarizeDebugSquad } from "@/engine/core/managers/debug/utils/debug_simulation_squad";
import { summarizeDebugTerrain } from "@/engine/core/managers/debug/utils/debug_simulation_terrain";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import { isGameStarted } from "@/engine/core/utils/game";

/**
 * Describe what an overlay view shows now.
 *
 * @param view - Overlay view.
 * @param state - What the views follow.
 * @param width - Most characters a value fits, past which text wraps onto rows of its own.
 * @returns Labelled values for the panel, empty for a view that is off.
 */
export function inspectDebugOverlayView(
  view: EDebugOverlayView,
  state: IDebugOverlayState,
  width: TCount
): LuaArray<IDebugField> {
  if (!isGameStarted() || $isNil(registry.actor)) {
    return new LuaTable();
  }

  switch (view) {
    case EDebugOverlayView.TARGET:
      return $isNil(state.targetId) ? fieldsOf("target", "none") : inspectDebugTarget(state.targetId);

    case EDebugOverlayView.FLOW:
      return inspectOverlayFlow(state, width);

    case EDebugOverlayView.ACTOR:
      return inspectOverlayActor();

    case EDebugOverlayView.WORLD:
      return inspectOverlayWorld();

    case EDebugOverlayView.SIMULATION:
      return inspectOverlaySimulation(state);

    default:
      return new LuaTable();
  }
}

/**
 * @param preferences - Debugger preferences.
 * @param view - Overlay view.
 * @returns Whether the overlay is on with a panel showing the view.
 */
export function isDebugOverlayViewShown(preferences: IDebugPreferences, view: EDebugOverlayView): boolean {
  if (!preferences.isOverlayEnabled) {
    return false;
  }

  for (const [, it] of pairs(preferences.overlayViews)) {
    if (it === view) {
      return true;
    }
  }

  return false;
}

/**
 * @param label - Field label.
 * @param value - Field value.
 * @returns A single field.
 */
function fieldsOf(label: TLabel, value: TLabel): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, label, value);

  return fields;
}

/**
 * @returns Where the actor stands and how it is.
 */
function inspectOverlayActor(): LuaArray<IDebugField> {
  const actor: GameObject = registry.actor;
  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, "level", level.name());
  addDebugField(fields, "position", formatDebugPosition(actor.position()));
  addDebugField(fields, "level vertex", tostring(actor.level_vertex_id()));
  addDebugField(fields, "health", string.format("%.0f%%", actor.health * 100));
  addDebugField(fields, "money", tostring(actor.money()));

  return fields;
}

/**
 * @returns Game time, weather, surge, nearest smart terrain and active tasks.
 */
function inspectOverlayWorld(): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();
  const terrainId: Nillable<TNumberId> = registry.smartTerrainNearest.id;

  addDebugField(fields, "time", string.format("%02d:%02d", level.get_time_hours(), level.get_time_minutes()));
  addDebugField(fields, "weather", level.get_weather());
  addDebugField(fields, "surge", surgeConfig.IS_STARTED ? "running" : "none");
  addDebugField(fields, "nearest smart", $isNil(terrainId) ? "none" : describeDebugObject(terrainId));
  addDebugField(fields, "active tasks", tostring(table.size(taskConfig.ACTIVE_TASKS)));

  return fields;
}

/**
 * @param state - What the views follow.
 * @returns The pinned squad or smart terrain summed up, with its latest recorded events.
 */
function inspectOverlaySimulation(state: IDebugOverlayState): LuaArray<IDebugField> {
  const id: Nillable<TNumberId> = state.simulationId;
  const squad: Nillable<Squad> = $isNil(id) ? null : getDebugSimulationSquad(id);
  const terrain: Nillable<SmartTerrain> = $isNil(id) || $isNotNil(squad) ? null : getDebugSimulationTerrain(id);

  if ($isNil(id)) {
    return fieldsOf("simulation", "none pinned");
  } else if ($isNil(squad) && $isNil(terrain)) {
    return fieldsOf("simulation", `${describeDebugObject(id)} left the simulation`);
  }

  const fields: LuaArray<IDebugField> = $isNotNil(squad) ? summarizeDebugSquad(squad) : summarizeDebugTerrain(terrain!);

  for (const [, record] of state.simulationRecords) {
    addDebugField(fields, record.time, record.text);
  }

  return fields;
}

/**
 * @param state - What the views follow.
 * @param width - Most characters a value fits.
 * @returns Where the followed flow's walk stands, and what to do next.
 */
function inspectOverlayFlow(state: IDebugOverlayState, width: TCount): LuaArray<IDebugField> {
  const result: Nillable<IDebugFlowResult> = state.flowResult;

  if ($isNil(state.flow)) {
    return fieldsOf("flow", "none pinned");
  } else if ($isNil(result)) {
    return fieldsOf("flow", `${state.flow.identity} - not run yet`);
  }

  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, "flow", state.flow.identity);
  addDebugField(fields, "outcome", result.outcome);
  addDebugField(fields, "steps", `${result.position} / ${result.stepNames.length()}`);
  addDebugField(fields, "next", result.waiting?.name);

  if ($isNil(result.waiting?.handOff)) {
    return fields;
  }

  const lines: LuaArray<TLabel> = wrapText(result.waiting.handOff, width);

  for (const index of $range(1, lines.length())) {
    addDebugField(fields, index === 1 ? "to do" : "", lines.get(index));
  }

  return fields;
}
