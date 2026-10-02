import * as fs from "node:fs";
import * as path from "node:path";

import { compareDumps, describeComparison, IDumpComparison } from "#/mcp/game_dump";
import { IMcpTool } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { answer, IGameToolsContext, json, schema, text } from "#/mcp/tools/tool_kit";
import { AnyObject } from "#/utils/types";

const DUMP_WAIT_MS: number = 60_000;
const DIFFERENCES_SHOWN: number = 15;
const NAME_PATTERN: RegExp = /^[A-Za-z0-9_-]+$/;

/**
 * @param managers - Managers to keep, all of them when empty.
 * @returns Lua chunk collecting every manager's `DUMP_LUA_DATA` answer.
 */
export function createDumpChunk(managers: ReadonlyArray<string>): string {
  return [
    'local EventsManager = require("core.managers.events.EventsManager").EventsManager',
    'local EGameEvent = require("core.managers.events.events_types").EGameEvent',
    "local data = {}",
    "EventsManager:emitEvent(EGameEvent.DUMP_LUA_DATA, data)",
    ...(managers.length > 0
      ? [
          `local only = { ${managers.map((it) => `${it} = true`).join(", ")} }`,
          "for name in pairs(data) do if not only[name] then data[name] = nil end end",
        ]
      : []),
    "return data",
  ].join("\n");
}

/**
 * @param list - Comma separated names, possibly empty.
 * @returns The names.
 */
function splitList(list: unknown): Array<string> {
  return typeof list === "string"
    ? list
        .split(",")
        .map((it) => it.trim())
        .filter(Boolean)
    : [];
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools capturing and comparing manager state.
 */
export function createDumpTools(context: IGameToolsContext): Array<IMcpTool> {
  return [
    {
      name: "game_dump",
      description:
        "Capture the state every manager reports for debug dumps into target/mcp/dumps/<name>.json and answer " +
        "with its size per manager. With `compareWith`, compare it against an earlier dump and answer with the " +
        "differences per manager; lists of plain values compare as sets, numeric fields named like timestamps " +
        "(`...At`, `updateDelta`) are left out, numeric fields moving together by one delta of a second or more " +
        "are counted as the game clock moving between two loads, and the full comparison goes to <name>.diff.txt. " +
        "With `managers`, only those managers are compared.",
      inputSchema: schema(
        {
          name: { type: "string", minLength: 1, description: "Dump name: letters, digits, `_` or `-`." },
          managers: {
            type: "string",
            description: "Comma separated managers to keep, e.g. `SurgeManager,WeatherManager`.",
          },
          compareWith: { type: "string", minLength: 1, description: "Name of an earlier dump to compare with." },
          ignore: { type: "string", description: "Comma separated path parts to leave out of the comparison." },
        },
        ["name"]
      ),
      call: async ({ name, managers, compareWith, ignore }) => {
        const kept: Array<string> = splitList(managers);

        if (!NAME_PATTERN.test(name as string) || kept.some((it) => !/^[A-Za-z]+$/.test(it))) {
          return text("Dump names take letters, digits, `_` and `-`; managers take letters.", true);
        }

        const earlier: string = path.join(context.workspace.dumps, `${compareWith}.json`);

        if (compareWith !== undefined && !fs.existsSync(earlier)) {
          return text(`No dump '${compareWith}' in ${context.workspace.dumps}.`, true);
        }

        const response: IGameResponse = await context.client.request(
          "lua",
          { code: createDumpChunk(kept) },
          DUMP_WAIT_MS
        );

        if (!response.ok) {
          return answer(response);
        }

        const dump: AnyObject = (response.result as AnyObject) ?? {};
        const file: string = path.join(context.workspace.dumps, `${name}.json`);

        fs.mkdirSync(context.workspace.dumps, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(dump));

        if (compareWith === undefined) {
          return json({
            file,
            managers: Object.fromEntries(
              Object.keys(dump)
                .sort()
                .map((manager) => [manager, JSON.stringify(dump[manager]).length])
            ),
          });
        }

        const earlierDump: AnyObject = JSON.parse(fs.readFileSync(earlier, "utf8"));
        const comparison: IDumpComparison = compareDumps(
          kept.length > 0
            ? Object.fromEntries(Object.entries(earlierDump).filter(([manager]) => kept.includes(manager)))
            : earlierDump,
          dump,
          splitList(ignore)
        );
        const report: string = path.join(context.workspace.dumps, `${name}.diff.txt`);

        fs.writeFileSync(report, describeComparison(comparison) + "\n");

        return text(`${describeComparison(comparison, DIFFERENCES_SHOWN)}\n\nFull comparison: ${report}`);
      },
    },
  ];
}
