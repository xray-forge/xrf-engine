import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, get_console, level } from "xray16";
import { AnyObject, LuaArray } from "xray16/lib";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { ICheckFailure, report } from "@/engine/checks/framework/core";
import { run } from "@/engine/checks/framework/entry";
import { EFlowOutcome, EFlowTravel } from "@/engine/checks/framework/result_types";
import { MCP_HANDLERS, runFlowModule, runLuaChunk } from "@/engine/checks/mcp/mcp_handlers";
import { EMcpRequestKind, IMcpHandlerContext, IMcpRequest } from "@/engine/checks/mcp/mcp_types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/checks/framework/entry", () => ({ run: jest.fn() }));
jest.mock("checks.quests.example_flow", () => ({}), { virtual: true });

const context: IMcpHandlerContext = { session: "session-1", updateDelta: 16 };

/**
 * @param kind - Request kind.
 * @param args - Request arguments.
 * @returns Request to hand a handler.
 */
function createRequest(kind: EMcpRequestKind, args: AnyObject = {}): IMcpRequest {
  return { id: "1", kind, ...args };
}

describe("mcp handlers", () => {
  const globals: AnyObject = globalThis as AnyObject;

  beforeEach(() => {
    resetRegistry();
    globals.package = { loaded: {} };
  });

  afterEach(() => {
    delete globals.loadstring;
    delete globals.package;
    delete globals.setfenv;
    delete globals.setmetatable;
  });

  it("should queue console commands, screenshots and quitting to run after the answer", () => {
    jest.spyOn(get_console(), "execute");

    const console = MCP_HANDLERS[EMcpRequestKind.CONSOLE](
      createRequest(EMcpRequestKind.CONSOLE, { command: "time_factor 10" }),
      context
    );
    const screenshot = MCP_HANDLERS[EMcpRequestKind.SCREENSHOT](createRequest(EMcpRequestKind.SCREENSHOT), context);
    const quit = MCP_HANDLERS[EMcpRequestKind.QUIT](createRequest(EMcpRequestKind.QUIT), context);

    expect(console.result).toEqual({ queued: true });
    expect(get_console().execute).not.toHaveBeenCalled();

    console.after?.();
    screenshot.after?.();
    quit.after?.();

    expect(get_console().execute).toHaveBeenNthCalledWith(1, "time_factor 10");
    expect(get_console().execute).toHaveBeenNthCalledWith(2, "screenshot mcp");
    expect(get_console().execute).toHaveBeenNthCalledWith(3, "quit");
  });

  it("should run a Lua chunk as an expression first, then as statements", () => {
    globals.setfenv = jest.fn();
    globals.setmetatable = jest.fn((table: AnyObject) => table);
    globals.loadstring = jest.fn((code: string) =>
      code === "return 1 + 1" ? [() => 2] : code === "local x = 3 return x" ? [() => 3] : [null, "syntax"]
    );

    expect(runLuaChunk("1 + 1")).toBe(2);
    expect(runLuaChunk("local x = 3 return x")).toBe(3);
    expect(globals.setfenv).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ mcp: expect.anything() })
    );
    expect(globals.setmetatable).toHaveBeenCalledTimes(1);
    expect(() => runLuaChunk("???")).toThrow("Cannot compile Lua: syntax");
    expect(
      MCP_HANDLERS[EMcpRequestKind.LUA](createRequest(EMcpRequestKind.LUA, { code: "1 + 1" }), context).result
    ).toBe(2);
  });

  it("should let a flow request travel unless it says otherwise", () => {
    const request: AnyObject = { module: "checks.quests.example_flow", identity: "quests_example" };

    jest.mocked(run).mockImplementation(() => ({
      name: "quests_example",
      outcome: EFlowOutcome.WAITING,
      steps: 0,
      checked: 0,
      failures: new LuaTable(),
      skipReason: null,
      travel: EFlowTravel.NONE,
    }));

    MCP_HANDLERS[EMcpRequestKind.FLOW](createRequest(EMcpRequestKind.FLOW, request), context);
    expect(run).toHaveBeenLastCalledWith("quests_example", true);

    MCP_HANDLERS[EMcpRequestKind.FLOW](createRequest(EMcpRequestKind.FLOW, { ...request, travel: false }), context);
    expect(run).toHaveBeenLastCalledWith("quests_example", false);

    expect(() =>
      MCP_HANDLERS[EMcpRequestKind.FLOW](createRequest(EMcpRequestKind.FLOW, { ...request, travel: "no" }), context)
    ).toThrow("Request 'flow' needs a boolean 'travel'.");
  });

  it("should run a flow module afresh and answer its failures and report lines as lists", () => {
    const failures: LuaArray<ICheckFailure> = new LuaTable();

    failures.set(1, { assertion: "task given", detail: "missing" });
    jest.mocked(run).mockImplementation(() => {
      report("step %s reached", 1);

      return {
        name: "quests_example",
        outcome: EFlowOutcome.WAITING,
        steps: 3,
        checked: 2,
        failures,
        skipReason: null,
        travel: EFlowTravel.ON_LEVEL,
      };
    });

    globals.package.loaded["checks.quests.example_flow"] = { stale: true };

    expect(runFlowModule("checks.quests.example_flow", "quests_example", false)).toEqual({
      name: "quests_example",
      outcome: EFlowOutcome.WAITING,
      steps: 3,
      checked: 2,
      failures: [{ assertion: "task given", detail: "missing" }],
      skipReason: null,
      travel: EFlowTravel.ON_LEVEL,
      report: [expect.stringMatching(/^\[\d+\] \[check\] step 1 reached$/)],
    });
    expect(globals.package.loaded["checks.quests.example_flow"]).toBeNull();
    expect(run).toHaveBeenCalledWith("quests_example", false);
  });

  it("should report the actor and session in status", () => {
    mockRegisteredActor();

    const status: AnyObject = MCP_HANDLERS[EMcpRequestKind.STATUS](createRequest(EMcpRequestKind.STATUS), context)
      .result as AnyObject;

    expect(status).toMatchObject({ session: "session-1", updateDelta: 16, timeGlobal: expect.any(Number) });
    expect(status.actor).toMatchObject({ alive: expect.any(Boolean), position: expect.any(Object) });
  });

  it("should report no game time, level or actor in the main menu after a game", () => {
    mockRegisteredActor();
    replaceFunctionMock(level.present, () => false);
    jest.mocked(game.get_game_time).mockClear();

    const status: AnyObject = MCP_HANDLERS[EMcpRequestKind.STATUS](createRequest(EMcpRequestKind.STATUS), context)
      .result as AnyObject;

    expect(status).toMatchObject({ session: "session-1", level: null, gameTime: null, actor: null });
    expect(game.get_game_time).not.toHaveBeenCalled();

    resetFunctionMock(level.present);
  });

  it("should report no actor in status before one is registered", () => {
    const status: AnyObject = MCP_HANDLERS[EMcpRequestKind.STATUS](createRequest(EMcpRequestKind.STATUS), context)
      .result as AnyObject;

    expect(status.actor).toBeNull();
  });
});
