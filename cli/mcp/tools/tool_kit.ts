import * as fs from "node:fs";
import * as path from "node:path";

import { decodeGameText } from "#/mcp/game_text";
import { IToolArgumentSchema, IToolInputSchema, IToolResult } from "#/mcp/mcp_tool_types";
import { IGameResponse, McpPipeClient } from "#/mcp/McpPipeClient";
import { IXrfCliEnvelope } from "#/mcp/xrf_cli";
import { IStartGameCommandParameters } from "#/start/start_game";
import { readLastLinesOfFile } from "#/utils/fs/read_last_lines_of_file";
import { Nullable } from "#/utils/types";

/**
 * Folders under `target/mcp` the tools keep their files in, the agent's workspace.
 */
export interface IMcpWorkspace {
  dumps: string;
  saves: string;
  probes: string;
}

/**
 * Game folders the tools read.
 */
export interface IGameFolders {
  logs: string;
  screenshots: string;
  savedgames: string;
}

/**
 * What the tools reach outside the pipe, replaced in tests.
 */
export interface IGameToolsContext {
  client: McpPipeClient;
  workspace: IMcpWorkspace;
  startGame: (parameters: IStartGameCommandParameters) => Promise<void>;
  isGameRunning: () => Promise<boolean>;
  isEndpointBuilt: () => boolean;
  getPaths: () => Promise<IGameFolders>;
  getEngineLogPath: () => Promise<Nullable<string>>;
  getTextEncoding: () => Promise<string>;
  keepScreenshot: (file: string) => string;
  scaleScreenshot: (file: string, width: number) => Promise<Buffer>;
  runXrfCli: (parameters: Array<string>) => Promise<IXrfCliEnvelope>;
}

/**
 * Logs the game writes.
 */
export type TGameLogFile = "engine" | "lua" | "checks";

/**
 * @param text - Text to answer with.
 * @param isError - Whether the tool failed.
 * @returns Tool result holding the text.
 */
export function text(text: string, isError: boolean = false): IToolResult {
  return { content: [{ type: "text", text }], isError };
}

/**
 * @param value - Value to answer with.
 * @returns Tool result holding the value as JSON.
 */
export function json(value: unknown): IToolResult {
  return text(JSON.stringify(value, null, 2));
}

/**
 * @param response - Answer from the game.
 * @returns Its result as JSON, or its error.
 */
export function answer(response: IGameResponse): IToolResult {
  return response.ok ? json(response.result ?? null) : text(response.error ?? "The game reported a failure.", true);
}

/**
 * @param list - Comma separated names, possibly empty.
 * @returns The names.
 */
export function splitList(list: unknown): Array<string> {
  return typeof list === "string"
    ? list
        .split(",")
        .map((it) => it.trim())
        .filter(Boolean)
    : [];
}

/**
 * @param properties - Arguments by name.
 * @param required - Arguments without a default that must be given.
 * @returns Input schema of a tool.
 */
export function schema(
  properties: Record<string, IToolArgumentSchema> = {},
  required: ReadonlyArray<string> = []
): IToolInputSchema {
  return { type: "object", properties, required, additionalProperties: false };
}

/**
 * @param milliseconds - How long to sleep.
 * @param signal - Signal ending the sleep early.
 * @returns Promise resolved once the time passed or the signal fired.
 */
export function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer: NodeJS.Timeout = setTimeout(resolve, milliseconds);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * @param context - What the tools reach outside the pipe.
 * @param file - Which log.
 * @returns Path of the log, null when the game has not written it.
 */
export async function resolveGameLog(context: IGameToolsContext, file: TGameLogFile): Promise<Nullable<string>> {
  const logPath: Nullable<string> =
    file === "engine"
      ? await context.getEngineLogPath()
      : path.join((await context.getPaths()).logs, file === "lua" ? "xrf_lua.log" : "xrf_checks.log");

  return logPath && fs.existsSync(logPath) ? logPath : null;
}

/**
 * @param logPath - Game log to read.
 * @param lines - How many last lines, all of them when not given.
 * @param encoding - Game text encoding.
 * @returns The lines, each decoded as the game wrote it.
 */
export async function readGameLog(logPath: string, lines: Nullable<number>, encoding: string): Promise<Array<string>> {
  // Latin-1 keeps every byte, so each line decodes as the game wrote it.
  const raw: string =
    lines === null ? fs.readFileSync(logPath, "latin1") : await readLastLinesOfFile(logPath, lines, "latin1");

  return raw.split(/\r?\n/).map((line) => decodeGameText(Buffer.from(line, "latin1"), encoding));
}
