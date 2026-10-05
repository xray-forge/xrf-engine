import { command_line } from "xray16";
import { LuaArray, TCount, TLabel } from "xray16/lib";
import { $fromArray, $isNil } from "xray16/macros";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import { dumpLuaData, dumpSystemIni } from "@/engine/core/utils/debug/debug_dump";

/**
 * @returns Lua runtime facts for the system tab.
 */
export function inspectDebugSystem(): LuaArray<IDebugField> {
  return $fromArray<IDebugField>([
    { label: "lua", value: _VERSION ?? "unknown" },
    { label: "jit", value: $isNil(jit) ? "disabled" : "enabled" },
    { label: "lua memory", value: string.format("%.3f MB", collectgarbage("count") / 1_024) },
    { label: "simulation debug", value: forgeConfig.DEBUG.IS_SIMULATION_ENABLED ? "on" : "off" },
    { label: "command line", value: command_line() ?? "unknown" },
  ]);
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
