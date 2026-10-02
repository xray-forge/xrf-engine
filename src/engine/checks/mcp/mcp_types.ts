import { AnyObject, Nillable, TDuration, TName } from "xray16/lib";

/**
 * Kinds of requests the endpoint answers.
 */
export enum EMcpRequestKind {
  CONSOLE = "console",
  FLOW = "flow",
  LUA = "lua",
  QUIT = "quit",
  SCREENSHOT = "screenshot",
  STATUS = "status",
}

/**
 * Request line sent by the MCP server.
 */
export interface IMcpRequest extends AnyObject {
  id: string;
  kind: EMcpRequestKind;
}

/**
 * Response line answering one request.
 */
export interface IMcpResponse {
  id: Nillable<string>;
  ok: boolean;
  result?: unknown;
  error?: string;
  at: { timeGlobal: number; level: Nillable<TName> };
}

/**
 * Line the endpoint sends unasked.
 */
export interface IMcpEvent extends AnyObject {
  event: string;
}

/**
 * Result of handling one request, with work to run once its answer has left.
 */
export interface IMcpHandlerResult {
  result: unknown;
  // Runs after the answer is sent, for requests that may end the Lua state or the game.
  after?: () => void;
}

/**
 * Handler of one request kind.
 */
export type TMcpHandler = (request: IMcpRequest, context: IMcpHandlerContext) => IMcpHandlerResult;

/**
 * What handlers read about the endpoint.
 */
export interface IMcpHandlerContext {
  session: string;
  // Time since the previous poll, by an actor update in a level or a main menu update while the menu is open.
  updateDelta: TDuration;
}

/**
 * Byte channel between the endpoint and the MCP server, released with the Lua state that opened it.
 */
export interface IMcpTransport {
  /**
   * Accept a client while none is connected.
   *
   * @returns Whether a client connected during this call.
   */
  accept(): boolean;
  /**
   * @returns Whether a client is connected.
   */
  isConnected(): boolean;
  /**
   * Read what arrived, noticing a client that left.
   *
   * @returns Received text, or null when nothing arrived.
   */
  read(): Nillable<string>;
  /**
   * Queue text to send.
   *
   * @param data - Text to send.
   */
  write(data: string): void;
  /**
   * Send as much queued text as the pipe takes now.
   *
   * @returns Whether nothing is left queued.
   */
  flush(): boolean;
}
