import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { command_line } from "xray16";
import { AnyObject, Nullable } from "xray16/lib";
import { replaceFunctionMock } from "xray16/testing/utils";

import { createMcpSession, register } from "@/engine/checks/mcp/extension";
import { check, isMcpArmed } from "@/engine/checks/mcp/extension_check";
import { McpEndpoint } from "@/engine/checks/mcp/McpEndpoint";
import { getManager } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/checks/mcp/NamedPipeTransport", () => ({
  NamedPipeTransport: jest.fn(() => ({ accept: () => false, isConnected: () => false })),
}));

describe("game MCP extension", () => {
  const globals: AnyObject = globalThis as AnyObject;

  beforeEach(() => {
    resetRegistry();
    globals.os = { time: () => 1_700_000_000 };
  });

  afterEach(() => {
    delete globals.os;
  });

  it("should stay unavailable without the launch flag", () => {
    replaceFunctionMock(command_line, () => "-dump_bindings -xrf_mcp_other -start server(all/single/alife/new)");

    expect(isMcpArmed()).toBe(false);
    expect(check().enabled).toBe(false);
    expect(check().reason).toContain("-xrf_mcp");
    expect(register()).toBeNull();
    expect(getManager(EventsManager).getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(0);
  });

  it("should start the endpoint and poll it on actor updates when armed", () => {
    replaceFunctionMock(command_line, () => "-dump_bindings -xrf_mcp -ltx user_mcp.ltx");

    expect(isMcpArmed()).toBe(true);
    expect(check().enabled).toBe(true);

    replaceFunctionMock(command_line, () => "-xrf_mcp");
    expect(isMcpArmed()).toBe(true);

    const update = jest.spyOn(McpEndpoint.prototype, "update").mockImplementation(jest.fn());
    const endpoint: Nullable<McpEndpoint> = register();

    expect(endpoint).toBeInstanceOf(McpEndpoint);
    expect(getManager(EventsManager).getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);

    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE, 16);

    expect(update).toHaveBeenCalledWith(16);
    expect(update.mock.contexts[0]).toBe(endpoint);
  });

  it("should name each game start by wall clock and engine time", () => {
    expect(createMcpSession()).toMatch(/^1700000000-\d+$/);
  });
});
