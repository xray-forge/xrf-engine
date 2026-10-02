import { level, time_global } from "xray16";
import { AnyObject, Nillable, TTimestamp } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { MCP_HANDLERS } from "@/engine/checks/mcp/mcp_handlers";
import { decodeJson, encodeJson } from "@/engine/checks/mcp/mcp_json";
import {
  IMcpEvent,
  IMcpHandlerContext,
  IMcpHandlerResult,
  IMcpRequest,
  IMcpResponse,
  IMcpTransport,
  TMcpHandler,
} from "@/engine/checks/mcp/mcp_types";
import { mcpConfig } from "@/engine/checks/mcp/McpConfig";
import { McpLineBuffer } from "@/engine/checks/mcp/McpLineBuffer";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Game side of the game MCP: answers requests arriving on a transport, polled on actor and main menu updates.
 */
export class McpEndpoint {
  public readonly transport: IMcpTransport;
  public readonly lines: McpLineBuffer = new McpLineBuffer();
  public readonly context: IMcpHandlerContext;

  // Work waiting for the answers before it to leave, as it may end the Lua state.
  public deferred: Array<() => void> = [];
  // Engine time of the previous poll, to report how often the game answers.
  public lastPolledAt: Nillable<TTimestamp> = null;

  public constructor(transport: IMcpTransport, session: string) {
    this.transport = transport;
    this.context = { session, updateDelta: 0 };
  }

  /**
   * Poll once: greet a new client, answer every complete request, then run work its answers allow.
   */
  public update(): void {
    const now: TTimestamp = time_global();

    this.context.updateDelta = $isNil(this.lastPolledAt) ? 0 : now - this.lastPolledAt;
    this.lastPolledAt = now;

    if (this.transport.accept()) {
      this.lines.clear();
      this.deferred = [];
      this.send({ event: "ready", session: this.context.session, level: this.getLevelName() });
    }

    if (!this.transport.isConnected()) {
      return;
    }

    const chunk: Nillable<string> = this.transport.read();

    if (chunk) {
      this.lines.push(chunk);
    }

    for (let line: Nillable<string> = this.lines.next(); $isNotNil(line); line = this.lines.next()) {
      if (line !== "") {
        this.handleLine(line);
      }
    }

    if (this.lines.isOverflowed) {
      this.lines.isOverflowed = false;
      this.respond(null, false, null, string.format("Request longer than %d bytes.", mcpConfig.MAX_REQUEST_LENGTH));
    }

    if (this.transport.flush() && this.deferred.length > 0) {
      const deferred: Array<() => void> = this.deferred;

      this.deferred = [];

      for (const action of deferred) {
        const [isDone, error] = pcall(action);

        if (!isDone) {
          logger.info("Deferred request work failed: %s", error);
        }
      }
    }
  }

  /**
   * Answer one request line, never letting a bad one raise out of the update.
   *
   * @param line - Request line without its line break.
   */
  public handleLine(line: string): void {
    const [isDecoded, decoded] = pcall(decodeJson, line);
    const request: Nillable<IMcpRequest> = isDecoded && type(decoded) === "table" ? (decoded as IMcpRequest) : null;
    const id: Nillable<string> = request && type(request.id) === "string" ? request.id : null;

    if (!request || !id || type(request.kind) !== "string") {
      return this.respond(id, false, null, isDecoded ? "Request needs a string 'id' and 'kind'." : tostring(decoded));
    }

    const handler: Nillable<TMcpHandler> = MCP_HANDLERS[request.kind];

    if (!handler) {
      return this.respond(id, false, null, string.format("Unknown request kind '%s'.", request.kind));
    }

    const [isHandled, outcome] = pcall(handler, request, this.context);

    if (!isHandled) {
      return this.respond(id, false, null, tostring(outcome));
    }

    this.respond(id, true, (outcome as IMcpHandlerResult).result, null);

    if ((outcome as IMcpHandlerResult).after) {
      this.deferred.push((outcome as IMcpHandlerResult).after as () => void);
    }
  }

  /**
   * @param id - Request answered, null when it could not be read.
   * @param isOk - Whether the request succeeded.
   * @param result - What the request returned.
   * @param error - Why the request failed.
   */
  public respond(id: Nillable<string>, isOk: boolean, result: unknown, error: Nillable<string>): void {
    const response: IMcpResponse = {
      id,
      ok: isOk,
      at: { timeGlobal: time_global(), level: this.getLevelName() },
    };

    if (isOk) {
      response.result = result;
    } else {
      response.error = error as string;
    }

    this.send(response);
  }

  /**
   * Send a response or event as one line, answering an error instead when it cannot be encoded, as an error here
   * would escape into the actor update and end the game.
   *
   * @param message - Response or event to send.
   */
  public send(message: IMcpResponse | IMcpEvent | AnyObject): void {
    const [isEncoded, encoded] = pcall(encodeJson, message);

    if (isEncoded) {
      this.transport.write((encoded as string) + "\n");

      return;
    }

    logger.info("Cannot encode an answer: %s", encoded);

    this.transport.write(
      encodeJson({
        id: (message as AnyObject).id ?? null,
        ok: false,
        error: string.format("Cannot encode the answer: %s", tostring(encoded)),
        at: { timeGlobal: time_global(), level: this.getLevelName() },
      }) + "\n"
    );
  }

  /**
   * @returns Name of the level playing, null outside one.
   */
  public getLevelName(): Nillable<string> {
    return level.present() ? level.name() : null;
  }
}
