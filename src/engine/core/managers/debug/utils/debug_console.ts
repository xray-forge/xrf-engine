import { AnyObject, Nillable, TLabel, TNumberId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getGameObjectById, registry } from "@/engine/core/database";
import { toJSON } from "@/engine/core/utils/transform";

/**
 * Longest result the console shows, past which it is cut.
 */
const MAX_RESULT_LENGTH: number = 600;

/**
 * Turn a Lua value into console text: tables as JSON two levels deep, cut when long.
 *
 * @param value - Value to show.
 * @returns Console text.
 */
export function formatDebugValue(value: unknown): TLabel {
  const text: TLabel = type(value) === "table" ? toJSON(value, " ", 0, 2) : tostring(value);

  return string.len(text) > MAX_RESULT_LENGTH ? `${string.sub(text, 1, MAX_RESULT_LENGTH)} ...` : text;
}

/**
 * Globals console Lua sees besides the regular ones: the actor, the debugger target, online or offline, and the
 * registry.
 *
 * @param targetId - Debugger target.
 * @returns Console environment, falling back to the regular globals.
 */
export function createDebugConsoleEnvironment(targetId: Nillable<TNumberId>): AnyObject {
  const environment: AnyObject = {
    actor: registry.actor,
    target: getGameObjectById(targetId) ?? ($isNil(targetId) ? null : registry.simulator?.object(targetId)),
    registry: registry,
  };

  return setmetatable(environment, { __index: _G });
}

/**
 * Run console Lua: an expression shows its value, a chunk runs as it is and shows what it returns.
 *
 * @param code - Lua typed into the console.
 * @param environment - Globals the Lua sees.
 * @returns Console text of the result, or of the error.
 */
export function evaluateDebugLua(code: string, environment: AnyObject): TLabel {
  let [chunk, error] = loadstring(`return ${code}`, "=console");

  if (!chunk) {
    [chunk, error] = loadstring(code, "=console");
  }

  if (!chunk) {
    return `error: ${error}`;
  }

  setfenv(chunk, environment);

  const [isCompleted, value] = pcall(chunk as () => unknown);

  return isCompleted ? formatDebugValue(value) : `error: ${tostring(value)}`;
}
