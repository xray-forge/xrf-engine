import { game, get_console, level, time_global } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { abort, AnyObject, gameTimeToString, Nillable } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { collectReportedLines, ICheckFailure, ICheckResult } from "@/engine/checks/framework/core";
import { run } from "@/engine/checks/framework/entry";
import { EMcpRequestKind, IMcpHandlerContext, IMcpRequest, TMcpHandler } from "@/engine/checks/mcp/mcp_types";
import { registry } from "@/engine/core/database";

/**
 * @param request - Request carrying the argument.
 * @param name - Argument name.
 * @returns The argument, which must be a string.
 */
function readStringArgument(request: IMcpRequest, name: string): string {
  const value: unknown = request[name];

  if (type(value) !== "string") {
    abort("Request '%s' needs a string '%s'.", request.kind, name);
  }

  return value as string;
}

/**
 * Run a Lua chunk, read as an expression first so `level.name()` works without `return`.
 *
 * @param code - Lua source.
 * @returns First value the chunk returns.
 */
export function runLuaChunk(code: string): unknown {
  let [chunk, error] = loadstring("return " + code, "=mcp");

  if (!chunk) {
    [chunk, error] = loadstring(code, "=mcp");
  }

  if (!chunk) {
    abort("Cannot compile Lua: %s", error);
  }

  return (chunk as () => unknown)();
}

/**
 * Run a check flow as its launcher does and report the result.
 * Only the flow module is required again, so it registers its steps into the framework the endpoint already loaded.
 *
 * @param module - Lua module of the flow, e.g. `checks.quests.zat_b14_flow`.
 * @param identity - Name the flow reports itself under, e.g. `quests_zat_b14`.
 * @returns Result of the run.
 */
export function runFlowModule(module: string, identity: string): AnyObject {
  ((_G as AnyObject)["package"].loaded as AnyObject)[module] = null;
  require(module);

  // The check log is buffered, so the host could not read this run from it yet.
  const { result, lines } = collectReportedLines((): ICheckResult => run(identity));
  const failures: Array<ICheckFailure> = [];

  for (const [, failure] of result.failures) {
    failures.push(failure);
  }

  return {
    name: result.name,
    steps: result.steps,
    checked: result.checked,
    failures: failures,
    skipReason: result.skipReason,
    report: lines,
  };
}

/**
 * @param context - Endpoint state.
 * @returns What the game is doing now.
 */
export function getMcpStatus(context: IMcpHandlerContext): AnyObject {
  const actor: Nillable<GameObject> = registry.actor;
  let actorStatus: Nillable<AnyObject> = null;

  if ($isNotNil(actor)) {
    const position: Vector = actor.position();

    actorStatus = {
      alive: actor.alive(),
      health: actor.health,
      position: { x: position.x, y: position.y, z: position.z },
    };
  }

  return {
    session: context.session,
    level: level.present() ? level.name() : null,
    timeGlobal: time_global(),
    gameTime: gameTimeToString(game.get_game_time()),
    updateDelta: context.updateDelta,
    actor: actorStatus,
  };
}

/**
 * Handlers of every request kind.
 * Console commands, screenshots and quitting run after their answer is sent, as they may end the Lua state.
 */
export const MCP_HANDLERS: Record<EMcpRequestKind, TMcpHandler> = {
  [EMcpRequestKind.CONSOLE]: (request) => {
    const command: string = readStringArgument(request, "command");

    return { result: { queued: true }, after: () => get_console().execute(command) };
  },
  [EMcpRequestKind.FLOW]: (request) => ({
    result: runFlowModule(readStringArgument(request, "module"), readStringArgument(request, "identity")),
  }),
  [EMcpRequestKind.LUA]: (request) => ({ result: runLuaChunk(readStringArgument(request, "code")) }),
  [EMcpRequestKind.QUIT]: () => ({ result: { queued: true }, after: () => get_console().execute("quit") }),
  [EMcpRequestKind.SCREENSHOT]: () => ({
    result: { queued: true },
    // Without an argument the console only prints the command status, and a regular screenshot ignores the name.
    after: () => get_console().execute("screenshot mcp"),
  }),
  [EMcpRequestKind.STATUS]: (_, context) => ({ result: getMcpStatus(context) }),
};
