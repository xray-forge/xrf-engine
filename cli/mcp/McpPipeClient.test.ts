import { EventEmitter } from "node:events";
import * as net from "node:net";

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { EGamePipeState, IGameEvent, McpPipeClient } from "#/mcp/McpPipeClient";

let counter: number = 0;

/**
 * @returns Pipe name no other test or game uses.
 */
function createPipeName(): string {
  counter += 1;

  return `\\\\.\\pipe\\xrf-game-test-${process.pid}-${counter}`;
}

/**
 * Fake game endpoint: greets every connection with the next session and answers through a handler.
 */
class FakeEndpoint {
  public readonly server: net.Server;
  public readonly sockets: Array<net.Socket> = [];
  public sessions: Array<string> = ["session-1", "session-2"];

  public constructor(
    public readonly pipeName: string,
    public handle: (message: Record<string, unknown>, socket: net.Socket) => void = (message, socket) =>
      socket.write(JSON.stringify({ id: message.id, ok: true, result: { kind: message.kind } }) + "\n")
  ) {
    this.server = net.createServer((socket) => {
      this.sockets.push(socket);
      socket.setEncoding("utf8");
      socket.write(JSON.stringify({ event: "ready", session: this.sessions.shift(), level: "zaton" }) + "\n");

      let pending: string = "";

      socket.on("data", (chunk: string) => {
        pending += chunk;

        for (let index: number = pending.indexOf("\n"); index >= 0; index = pending.indexOf("\n")) {
          this.handle(JSON.parse(pending.slice(0, index)), socket);
          pending = pending.slice(index + 1);
        }
      });
    });
  }

  public listen(): Promise<void> {
    return new Promise((resolve) => this.server.listen(this.pipeName, resolve));
  }

  public close(): Promise<void> {
    this.sockets.forEach((it) => it.destroy());

    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

describe("McpPipeClient", () => {
  const endpoints: Array<FakeEndpoint> = [];
  const clients: Array<McpPipeClient> = [];

  /**
   * @returns Client and a listening fake endpoint on a fresh pipe.
   */
  async function setup(handle?: FakeEndpoint["handle"]): Promise<[McpPipeClient, FakeEndpoint]> {
    const endpoint: FakeEndpoint = new FakeEndpoint(createPipeName(), handle);
    const client: McpPipeClient = new McpPipeClient(endpoint.pipeName);

    await endpoint.listen();
    endpoints.push(endpoint);
    clients.push(client);

    return [client, endpoint];
  }

  afterEach(async () => {
    clients.splice(0).forEach((it) => it.close());
    await Promise.all(endpoints.splice(0).map((it) => it.close()));
  });

  it("should report no game when nothing listens", async () => {
    const client: McpPipeClient = new McpPipeClient(createPipeName());

    expect(await client.connect()).toBe(EGamePipeState.ABSENT);
    await expect(client.request("status")).rejects.toThrow("No game is listening");
  });

  it("should report a busy game when its pipe serves another client", async () => {
    const socket = Object.assign(new EventEmitter(), { destroy: jest.fn() });
    const client: McpPipeClient = new (class extends McpPipeClient {
      protected override createSocket(): net.Socket {
        return socket as unknown as net.Socket;
      }
    })(createPipeName(), 50);

    // The connection neither opens nor fails while the single pipe instance is taken.
    expect(await client.connect()).toBe(EGamePipeState.BUSY);
    expect(socket.destroy).toHaveBeenCalled();
    await expect(client.request("status")).rejects.toThrow("Another session is connected to the game");

    const failing: Promise<EGamePipeState> = client.connect();

    socket.emit("error", Object.assign(new Error("busy"), { code: "EBUSY" }));
    expect(await failing).toBe(EGamePipeState.BUSY);
  });

  it("should match answers to requests by id", async () => {
    const [client] = await setup();

    const [first, second] = await Promise.all([client.request("status"), client.request("lua", { code: "1" })]);

    expect(first).toMatchObject({ ok: true, result: { kind: "status" } });
    expect(second).toMatchObject({ ok: true, result: { kind: "lua" } });
  });

  it("should decode answers as UTF-8, and text that is not UTF-8 in the game encoding", async () => {
    const [client] = await setup((message, socket) => {
      const name: Buffer =
        message.kind === "lua"
          ? Buffer.from([0xc0, 0xe2, 0xe3, 0xf3, 0xf1, 0xf2, 0xe0])
          : Buffer.from("\u0410\u0432\u0433\u0443\u0441\u0442\u0430 \u2014", "utf8");

      socket.write(
        Buffer.concat([Buffer.from(`{"id":"${message.id}","ok":true,"result":"`), name, Buffer.from('"}\n')])
      );
    });

    client.textEncoding = "windows-1251";

    expect((await client.request("lua")).result).toBe("\u0410\u0432\u0433\u0443\u0441\u0442\u0430");
    expect((await client.request("status")).result).toBe("\u0410\u0432\u0433\u0443\u0441\u0442\u0430 \u2014");
  });

  it("should send requests in the game encoding", async () => {
    const pipeName: string = createPipeName();
    const received: Array<Buffer> = [];
    const server: net.Server = net.createServer((socket) => socket.on("data", (chunk: Buffer) => received.push(chunk)));
    const client: McpPipeClient = new McpPipeClient(pipeName);

    await new Promise<void>((resolve) => server.listen(pipeName, resolve));
    clients.push(client);
    client.textEncoding = "windows-1251";

    await expect(client.request("lua", { code: "\u0410\u0432\u0433" }, 200)).rejects.toThrow("did not answer");
    // Latin-1 keeps each byte one character, so the comparison sees the bytes the game receives.
    expect(Buffer.concat(received).toString("latin1")).toContain(
      Buffer.from([0x22, 0xc0, 0xe2, 0xe3, 0x22]).toString("latin1")
    );

    client.close();
    await new Promise((resolve) => server.close(resolve));
  });

  it("should take the session from the greeting", async () => {
    const [client] = await setup();

    const ready: IGameEvent = await client.waitForReady(2_000);

    expect(ready).toEqual({ event: "ready", session: "session-1", level: "zaton" });
    expect(client.session).toBe("session-1");
  });

  it("should wait past a session for the endpoint that greets after the game restarts its scripts", async () => {
    const [client, endpoint] = await setup();

    await client.waitForReady(2_000);
    endpoint.sockets[0].destroy();

    const ready: IGameEvent = await client.waitForReady(5_000, "session-1");

    expect(ready.session).toBe("session-2");
  });

  it("should fail requests still waiting when the connection closes", async () => {
    const [client, endpoint] = await setup((_, socket) => socket.destroy());

    await client.connect();
    await expect(client.request("quit")).rejects.toThrow("closed before answering");
    expect(endpoint.sockets).toHaveLength(1);
  });

  it("should give up on an answer that takes too long", async () => {
    const [client] = await setup(() => {});

    await expect(client.request("lua", { code: "while true do end" }, 100)).rejects.toThrow("within 100 ms");
  });

  it("should notice the game closing its connection", async () => {
    const [client, endpoint] = await setup();

    await client.waitForReady(2_000);

    const closed: Promise<boolean> = client.waitForClose(2_000);

    endpoint.sockets[0].end();

    expect(await closed).toBe(true);
    expect(client.isConnected()).toBe(false);
    expect(client.session).toBeNull();
  });
});
