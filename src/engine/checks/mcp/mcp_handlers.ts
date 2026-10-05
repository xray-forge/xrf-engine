import { game, get_console, level, time_global } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { abort, AnyObject, gameTimeToString, Nillable } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { collectReportedLines, ICheckFailure, ICheckResult } from "@/engine/checks/framework/core";
import { run } from "@/engine/checks/framework/entry";
import { describeDialogNpc, handleDialogRequest, resolveDialogNpc } from "@/engine/checks/mcp/mcp_dialog";
import { IMcpDialogRequest } from "@/engine/checks/mcp/mcp_dialog_types";
import * as mcp from "@/engine/checks/mcp/mcp_probe";
import { EMcpRequestKind, IMcpHandlerContext, IMcpRequest, TMcpHandler } from "@/engine/checks/mcp/mcp_types";
import { registry } from "@/engine/core/database";
import { requireFresh } from "@/engine/core/utils/module";

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
 * @param request - Request carrying the argument.
 * @param name - Argument name.
 * @param fallback - Value of an argument the request leaves out.
 * @returns The argument, which must be a boolean when given.
 */
function readBooleanArgument(request: IMcpRequest, name: string, fallback: boolean): boolean {
  const value: unknown = request[name];

  if ($isNil(value)) {
    return fallback;
  } else if (type(value) !== "boolean") {
    abort("Request '%s' needs a boolean '%s'.", request.kind, name);
  }

  return value as boolean;
}

let chunkEnvironment: Nillable<AnyObject> = null;

/**
 * @returns Environment chunks run in: `mcp` utilities over the game's globals, keeping the globals a chunk sets for the
 *   next chunks without leaking them into the game.
 */
function getChunkEnvironment(): AnyObject {
  if ($isNil(chunkEnvironment)) {
    chunkEnvironment = setmetatable({ mcp }, { __index: _G });
  }

  return chunkEnvironment;
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

  setfenv(chunk, getChunkEnvironment());

  return (chunk as () => unknown)();
}

/**
 * Run a check flow as its launcher does and report the result.
 * Only the flow module is required again, so it registers its steps into the framework the endpoint already loaded.
 *
 * @param module - Lua module of the flow, e.g. `checks.quests.zat_b14_flow`.
 * @param identity - Name the flow reports itself under, e.g. `quests_zat_b14`.
 * @param isTravelAllowed - Whether steps may move the actor.
 * @returns Result of the run.
 */
export function runFlowModule(module: string, identity: string, isTravelAllowed: boolean): AnyObject {
  requireFresh(module);

  // The check log is buffered, so the host could not read this run from it yet.
  const { result, lines } = collectReportedLines((): ICheckResult => run(identity, isTravelAllowed));
  const failures: Array<ICheckFailure> = [];

  for (const [, failure] of result.failures) {
    failures.push(failure);
  }

  return {
    name: result.name,
    outcome: result.outcome,
    position: result.position,
    waiting: result.waiting,
    steps: result.steps,
    checked: result.checked,
    failures: failures,
    skipReason: result.skipReason,
    travel: result.travel,
    report: lines,
  };
}

/**
 * @param context - Endpoint state.
 * @returns What the game is doing now.
 */
export function getMcpStatus(context: IMcpHandlerContext): AnyObject {
  // Game time needs the A-Life time manager, which is gone in the main menu after a game, and reading it then crashes.
  const isLevelPresent: boolean = level.present();
  const actor: Nillable<GameObject> = isLevelPresent ? registry.actor : null;
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
    level: isLevelPresent ? level.name() : null,
    timeGlobal: time_global(),
    gameTime: isLevelPresent ? gameTimeToString(game.get_game_time()) : null,
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
  [EMcpRequestKind.DIALOG]: (request) => ({ result: handleDialogRequest(request as unknown as IMcpDialogRequest) }),
  [EMcpRequestKind.DIALOG_NPC]: (request) => ({ result: describeDialogNpc(resolveDialogNpc(request.npc)) }),
  [EMcpRequestKind.FLOW]: (request) => ({
    // A request that does not say travels, as the console launcher does.
    result: runFlowModule(
      readStringArgument(request, "module"),
      readStringArgument(request, "identity"),
      readBooleanArgument(request, "travel", true)
    ),
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
