import { command_line } from "xray16";
import { LuaArray, TCount, TLabel } from "xray16/lib";
import { $fromArray, $isNil } from "xray16/macros";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { registry } from "@/engine/core/database/registry";
import { getGameHookRegistrations } from "@/engine/core/hooks/hooks";
import { EGameHook, EGameHookPhase } from "@/engine/core/hooks/hooks_types";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import { addDebugField } from "@/engine/core/managers/debug/utils/debug_inspect";
import { dumpLuaData, dumpSystemIni } from "@/engine/core/utils/debug/debug_dump";
import { getTableKeys } from "@/engine/core/utils/table";

// Names of hook phases, as hooks list them.
const HOOK_PHASE_LABELS: Record<EGameHookPhase, TLabel> = {
  [EGameHookPhase.SET]: "set",
  [EGameHookPhase.ADJUST]: "adjust",
  [EGameHookPhase.LIMIT]: "limit",
};

/**
 * @returns Lua runtime facts for the system tab, with the game hooks extensions registered and who handles them.
 */
export function inspectDebugSystem(): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = $fromArray<IDebugField>([
    { label: "lua", value: _VERSION ?? "unknown" },
    { label: "jit", value: $isNil(jit) ? "disabled" : "enabled" },
    { label: "lua memory", value: string.format("%.3f MB", collectgarbage("count") / 1_024) },
    { label: "simulation debug", value: forgeConfig.DEBUG.IS_SIMULATION_ENABLED ? "on" : "off" },
    { label: "command line", value: command_line() ?? "unknown" },
  ]);
  const hooks: LuaArray<EGameHook> = getTableKeys(registry.hooks);

  table.sort(hooks, (first, second) => first < second);

  for (const [, hook] of hooks) {
    const owners: LuaArray<TLabel> = new LuaTable();

    for (const [, it] of getGameHookRegistrations(hook)) {
      table.insert(owners, `${it.owner} (${HOOK_PHASE_LABELS[it.phase]})`);
    }

    addDebugField(fields, hook, table.concat(owners, ", "));
  }

  if (hooks.length() === 0) {
    addDebugField(fields, "game hooks", "none");
  }

  return fields;
}

/**
 * Force collection of unreachable Lua values.
 *
 * @returns Result message.
 */
export function collectDebugGarbage(): TLabel {
  const before: TCount = collectgarbage("count");

  collectgarbage("collect");

  return string.format("collected %.3f MB of lua garbage", (before - collectgarbage("count")) / 1_024);
}

/**
 * Toggle the simulation debug view: squads and smart terrains shown on the map with their stats.
 *
 * @returns Result message.
 */
export function toggleDebugSimulationView(): TLabel {
  forgeConfig.DEBUG.IS_SIMULATION_ENABLED = !forgeConfig.DEBUG.IS_SIMULATION_ENABLED;

  return `simulation debug ${forgeConfig.DEBUG.IS_SIMULATION_ENABLED ? "on" : "off"}`;
}

/**
 * @returns Result message.
 */
export function dumpDebugLuaData(): TLabel {
  return `dumped ${dumpLuaData()}`;
}

/**
 * @returns Result message.
 */
export function dumpDebugSystemIni(): TLabel {
  return `dumped ${dumpSystemIni()}`;
}
