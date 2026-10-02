import * as net from "node:net";

import { decodeGameText, DEFAULT_GAME_TEXT_ENCODING, encodeGameText } from "#/mcp/game_text";
import { Nullable, Optional } from "#/utils/types";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";

/**
 * Answer the game endpoint sends for one request.
 */
export interface IGameResponse {
  id: Nullable<string>;
  ok: boolean;
  result?: unknown;
  error?: string;
  at?: { timeGlobal: number; level: Nullable<string> };
}

/**
 * Line the game endpoint sends unasked, as its `ready` greeting.
 */
export interface IGameEvent {
  event: string;
  session?: string;
  level?: Nullable<string>;
}

/**
 * What a connection attempt found.
 */
export enum EGamePipeState {
  CONNECTED = "connected",
  // No game listens.
  ABSENT = "absent",
  // A game listens, but its single pipe instance serves another client.
  BUSY = "busy",
}

interface IPendingRequest {
  resolve: (response: IGameResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Host side of the game MCP pipe: one connection at a time, answers matched to requests by id.
 * A load restarts the game's scripts and closes the pipe; the client then reconnects to the endpoint that follows.
 */
export class McpPipeClient {
  public readonly pipeName: string;
  public readonly connectTimeoutMs: number;

  public socket: Nullable<net.Socket> = null;
  // Session of the endpoint greeting this connection, null until it does.
  public session: Nullable<string> = null;
  public level: Nullable<string> = null;
  // Encoding of game text, which requests are sent in and answers arrive in.
  public textEncoding: string = DEFAULT_GAME_TEXT_ENCODING;

  protected buffer: Buffer = Buffer.alloc(0);
  protected nextId: number = 1;
  protected readonly pending: Map<string, IPendingRequest> = new Map();
  protected readonly closeWaiters: Array<() => void> = [];

  public constructor(pipeName: string = mcpConfig.PIPE_NAME, connectTimeoutMs: number = 2_000) {
    this.pipeName = pipeName;
    this.connectTimeoutMs = connectTimeoutMs;
  }

  /**
   * @returns Whether a game connection is open.
   */
  public isConnected(): boolean {
    return this.socket !== null;
  }

  /**
   * Connect once if no connection is open.
   *
   * @returns What the attempt found.
   */
  public connect(): Promise<EGamePipeState> {
    if (this.socket) {
      return Promise.resolve(EGamePipeState.CONNECTED);
    }

    return new Promise((resolve) => {
      const socket: net.Socket = this.createSocket();
      // A busy pipe does not fail the connection, which waits for the instance to free up instead.
      const timer: NodeJS.Timeout = setTimeout(() => {
        socket.destroy();
        resolve(EGamePipeState.BUSY);
      }, this.connectTimeoutMs);

      socket.once("connect", () => {
        clearTimeout(timer);
        socket.removeAllListeners("error");
        this.attach(socket);
        resolve(EGamePipeState.CONNECTED);
      });

      socket.once("error", (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        socket.destroy();
        resolve(error.code === "EBUSY" ? EGamePipeState.BUSY : EGamePipeState.ABSENT);
      });
    });
  }

  /**
   * Send a request and wait for its answer.
   *
   * @param kind - Request kind.
   * @param args - Request arguments.
   * @param timeoutMs - How long to wait for the answer.
   * @returns The answer, whether it succeeded or not.
   */
  public async request(
    kind: string,
    args: Record<string, unknown> = {},
    timeoutMs: number = 10_000
  ): Promise<IGameResponse> {
    const state: EGamePipeState = await this.connect();

    if (state === EGamePipeState.BUSY) {
      throw new Error("Another session is connected to the game, and only one can drive it at a time.");
    }

    if (state === EGamePipeState.ABSENT) {
      throw new Error("No game is listening; start one with game_start.");
    }

    const id: string = `${process.pid}-${this.nextId++}`;
    const socket: net.Socket = this.socket as net.Socket;

    return new Promise((resolve, reject) => {
      const timer: NodeJS.Timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`The game did not answer '${kind}' within ${timeoutMs} ms.`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      socket.write(encodeGameText(JSON.stringify({ ...args, id, kind }) + "\n", this.textEncoding));
    });
  }

  /**
   * Wait until an endpoint greets with a session other than the one given, connecting as soon as one listens.
   *
   * @param timeoutMs - How long to wait.
   * @param previousSession - Session to wait past, as the one running before a start or load.
   * @returns The greeting.
   */
  public async waitForReady(timeoutMs: number, previousSession: Nullable<string> = null): Promise<IGameEvent> {
    const deadline: number = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (this.session && this.session !== previousSession) {
        return { event: "ready", session: this.session, level: this.level };
      }

      if (!this.socket) {
        await this.connect();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`No game greeted within ${timeoutMs} ms.`);
  }

  /**
   * Wait until the open connection closes, as when the game quits.
   *
   * @param timeoutMs - How long to wait.
   * @returns Whether it closed in time.
   */
  public waitForClose(timeoutMs: number): Promise<boolean> {
    if (!this.socket) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const timer: NodeJS.Timeout = setTimeout(() => resolve(false), timeoutMs);

      this.closeWaiters.push(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /**
   * Close the open connection.
   */
  public close(): void {
    this.socket?.destroy();
  }

  /**
   * @returns Socket connecting to the game pipe.
   */
  protected createSocket(): net.Socket {
    return net.connect(this.pipeName);
  }

  /**
   * @param socket - Connected socket to read answers and greetings from.
   */
  protected attach(socket: net.Socket): void {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);

    socket.on("data", (chunk: Buffer) => this.receive(chunk));
    socket.on("error", () => socket.destroy());
    socket.on("close", () => this.detach());
  }

  /**
   * Forget the closed connection and fail what still waited on it.
   */
  protected detach(): void {
    this.socket = null;
    this.session = null;

    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("The game connection closed before answering."));
    }

    this.pending.clear();
    this.closeWaiters.splice(0).forEach((waiter) => waiter());
  }

  /**
   * @param chunk - Text as it arrived.
   */
  protected receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (let index: number = this.buffer.indexOf(0x0a); index >= 0; index = this.buffer.indexOf(0x0a)) {
      const line: string = decodeGameText(this.buffer.subarray(0, index), this.textEncoding).trim();

      this.buffer = this.buffer.subarray(index + 1);

      if (line) {
        this.dispatch(line);
      }
    }
  }

  /**
   * @param line - One message from the endpoint.
   */
  protected dispatch(line: string): void {
    let message: IGameResponse & IGameEvent;

    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (typeof message.event === "string") {
      if (message.event === "ready") {
        this.session = message.session ?? null;
        this.level = message.level ?? null;
      }

      return;
    }

    const request: Optional<IPendingRequest> =
      typeof message.id === "string" ? this.pending.get(message.id) : undefined;

    if (request) {
      clearTimeout(request.timer);
      this.pending.delete(message.id as string);
      request.resolve(message);
    }
  }
}
