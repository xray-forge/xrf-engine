import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_console, time_global } from "xray16";
import { AnyObject, Nillable } from "xray16/lib";
import { replaceFunctionMock } from "xray16/testing/utils";

import { IMcpTransport } from "@/engine/checks/mcp/mcp_types";
import { mcpConfig } from "@/engine/checks/mcp/McpConfig";
import { McpEndpoint } from "@/engine/checks/mcp/McpEndpoint";
import { resetRegistry } from "@/fixtures/engine";

/**
 * Transport that a test drives by hand.
 */
class FakeTransport implements IMcpTransport {
  public isClientConnected: boolean = false;
  public shouldConnect: boolean = false;
  public incoming: Array<string> = [];
  public written: Array<string> = [];
  public isFlushBlocked: boolean = false;

  public accept(): boolean {
    if (this.isClientConnected || !this.shouldConnect) {
      return false;
    }

    this.isClientConnected = true;

    return true;
  }

  public isConnected(): boolean {
    return this.isClientConnected;
  }

  public read(): Nillable<string> {
    return this.incoming.shift() ?? null;
  }

  public write(data: string): void {
    this.written.push(data);
  }

  public flush(): boolean {
    return !this.isFlushBlocked;
  }

  /**
   * @returns Every message written so far, decoded.
   */
  public messages(): Array<AnyObject> {
    return this.written.map((it) => JSON.parse(it));
  }
}

/**
 * @returns Endpoint with a connected fake client, its greeting already read.
 */
function createConnectedEndpoint(): [McpEndpoint, FakeTransport] {
  const transport: FakeTransport = new FakeTransport();
  const endpoint: McpEndpoint = new McpEndpoint(transport, "session-1");

  transport.shouldConnect = true;
  endpoint.update();
  transport.written = [];

  return [endpoint, transport];
}

describe("McpEndpoint", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should greet a client with its session once it connects", () => {
    const transport: FakeTransport = new FakeTransport();
    const endpoint: McpEndpoint = new McpEndpoint(transport, "session-1");

    endpoint.update();

    expect(transport.written).toHaveLength(0);

    transport.shouldConnect = true;
    endpoint.update();

    expect(transport.messages()).toEqual([{ event: "ready", session: "session-1", level: expect.any(String) }]);
    expect(transport.written[0].endsWith("\n")).toBe(true);
  });

  it("should answer a request with its id, result and time, and the time since the previous poll", () => {
    replaceFunctionMock(time_global, () => 1_000);

    const [endpoint, transport] = createConnectedEndpoint();

    replaceFunctionMock(time_global, () => 1_020);
    transport.incoming.push(JSON.stringify({ id: "a", kind: "status" }) + "\n");
    endpoint.update();

    const [response] = transport.messages();

    expect(response.id).toBe("a");
    expect(response.ok).toBe(true);
    expect(response.result.session).toBe("session-1");
    expect(response.result.updateDelta).toBe(20);
    expect(response.at).toEqual({ timeGlobal: expect.any(Number), level: expect.any(String) });
  });

  it("should answer requests split across reads and several in one read", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    transport.incoming.push('{"id":"a","kind":"st');
    endpoint.update();

    expect(transport.written).toHaveLength(0);

    transport.incoming.push('atus"}\n{"id":"b","kind":"status"}\n');
    endpoint.update();

    expect(transport.messages().map((it) => it.id)).toEqual(["a", "b"]);
  });

  it("should answer unreadable, incomplete and unknown requests with errors instead of raising", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    transport.incoming.push('not json\n{"kind":"status"}\n{"id":"c","kind":"nope"}\n');
    endpoint.update();

    const [unreadable, incomplete, unknown] = transport.messages();

    expect(unreadable).toMatchObject({ id: null, ok: false, error: expect.stringContaining("Invalid JSON") });
    expect(incomplete).toMatchObject({ id: null, ok: false, error: "Request needs a string 'id' and 'kind'." });
    expect(unknown).toMatchObject({ id: "c", ok: false, error: "Unknown request kind 'nope'." });
  });

  it("should answer a failing request with its error", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    transport.incoming.push(JSON.stringify({ id: "d", kind: "console" }) + "\n");
    endpoint.update();

    expect(transport.messages()[0]).toMatchObject({
      id: "d",
      ok: false,
      error: expect.stringContaining("needs a string 'command'"),
    });
  });

  it("should run deferred work only once its answer has been sent", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    jest.spyOn(get_console(), "execute");

    transport.isFlushBlocked = true;
    transport.incoming.push(JSON.stringify({ id: "e", kind: "console", command: "load save_1" }) + "\n");
    endpoint.update();

    expect(transport.messages()[0]).toMatchObject({ id: "e", ok: true, result: { queued: true } });
    expect(get_console().execute).not.toHaveBeenCalled();

    transport.isFlushBlocked = false;
    endpoint.update();

    expect(get_console().execute).toHaveBeenCalledWith("load save_1");
  });

  it("should report a request line longer than any request", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    transport.incoming.push("x".repeat(mcpConfig.MAX_REQUEST_LENGTH + 1));
    endpoint.update();

    expect(transport.messages()[0]).toMatchObject({ id: null, ok: false, error: expect.stringContaining("longer") });
  });

  it("should start afresh when a new client connects", () => {
    const [endpoint, transport] = createConnectedEndpoint();

    transport.incoming.push('{"id":"half');
    endpoint.update();
    transport.isClientConnected = false;
    endpoint.update();

    expect(transport.written).toHaveLength(1);
    expect(transport.messages()[0].event).toBe("ready");
    expect(endpoint.lines.pending).toBe("");
  });
});
