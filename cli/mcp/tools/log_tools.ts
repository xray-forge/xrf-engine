import { describeGameErrors, findGameErrors } from "#/mcp/game_log_errors";
import { IMcpTool } from "#/mcp/mcp_tool_types";
import { IGameToolsContext, readGameLog, resolveGameLog, schema, text, TGameLogFile } from "#/mcp/tools/tool_kit";
import { Nullable } from "#/utils/types";

const LOG_FILES: ReadonlyArray<TGameLogFile> = ["engine", "lua", "checks"];

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools reading the game logs.
 */
export function createLogTools(context: IGameToolsContext): Array<IMcpTool> {
  return [
    {
      name: "game_log",
      description:
        "Read the last lines of a game log, while the game runs, loads or is paused, or after it crashed: the " +
        "engine log, the xrf Lua log, or the check flows log. With `match`, return the last matching lines of the " +
        "whole log with their line numbers.",
      inputSchema: schema({
        file: { type: "string", enum: LOG_FILES, default: "engine", description: "Which log to read." },
        lines: { type: "integer", minimum: 1, maximum: 2000, default: 100, description: "How many last lines." },
        match: { type: "string", minLength: 1, description: "Case-insensitive regular expression lines must match." },
      }),
      call: async ({ file, lines, match }) => {
        const logPath: Nullable<string> = await resolveGameLog(context, file as TGameLogFile);

        if (!logPath) {
          return text(`No ${file} log found.`, true);
        }

        const encoding: string = await context.getTextEncoding();

        if (match === undefined) {
          return text((await readGameLog(logPath, lines as number, encoding)).join("\n"));
        }

        const pattern: RegExp = new RegExp(match as string, "i");
        const matching: Array<string> = (await readGameLog(logPath, null, encoding))
          .map((line, index) => `${index + 1}: ${line}`)
          .filter((line) => pattern.test(line.slice(line.indexOf(":") + 2)));

        return text(
          matching.length > 0 ? matching.slice(-(lines as number)).join("\n") : `No ${file} log line matches.`
        );
      },
    },
    {
      name: "game_errors",
      description:
        "Summarize the problems in a game log since the game started: its fatal error, script errors and engine " +
        "warnings, grouped by message with numbers left out, leaving out warnings every launch writes.",
      inputSchema: schema({
        file: { type: "string", enum: LOG_FILES, default: "engine", description: "Which log to read." },
      }),
      call: async ({ file }) => {
        const logPath: Nullable<string> = await resolveGameLog(context, file as TGameLogFile);

        if (!logPath) {
          return text(`No ${file} log found.`, true);
        }

        return text(
          describeGameErrors(
            `${file} log`,
            findGameErrors(await readGameLog(logPath, null, await context.getTextEncoding()))
          )
        );
      },
    },
  ];
}
