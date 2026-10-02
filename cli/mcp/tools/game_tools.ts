import * as fs from "node:fs";
import * as path from "node:path";

import { discoverChecks, ICheckDescriptor } from "#/checks/utils/discover_checks";
import { IMcpTool } from "#/mcp/mcp_tool_types";
import { answer, IGameToolsContext, schema, text } from "#/mcp/tools/tool_kit";
import { Nullable } from "#/utils/types";

const FLOW_WAIT_MS: number = 60_000;

/**
 * @param name - Flow identity (`quests_zat_b14`), source (`quests/zat_b14.flow.ts`) or launcher (`flow_quests_zat_b14`).
 * @returns The flow, or null when none matches.
 */
export function findFlow(name: string): Nullable<ICheckDescriptor> {
  return (
    discoverChecks().find(
      (it) => it.identity === name || it.relative === name || it.launcher === name || it.launcher === `${name}.script`
    ) ?? null
  );
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools reading and driving the running game.
 */
export function createGameTools(context: IGameToolsContext): Array<IMcpTool> {
  const { client } = context;

  return [
    {
      name: "game_status",
      description:
        "Report the session, level, game time and actor of the running game, and the time since the previous " +
        "actor update, which is how often the game answers.",
      inputSchema: schema(),
      call: async () => answer(await client.request("status")),
    },
    {
      name: "game_console",
      description:
        "Run a game console command after answering. Commands that load or quit restart the game's scripts; " +
        "call game_wait_ready afterwards. A command that takes an argument does nothing without one.",
      inputSchema: schema(
        { command: { type: "string", minLength: 1, description: "Console command, e.g. `time_factor 10`." } },
        ["command"]
      ),
      call: async ({ command }) => answer(await client.request("console", { command })),
    },
    {
      name: "game_lua",
      description:
        "Run Lua in the game and return its value as JSON. Tried as an expression first, so `level.name()` works " +
        "without `return`. Game objects come back as placeholders; return their fields instead. Pass `file` to run a " +
        "probe kept under target/mcp/probes instead of `code`.",
      inputSchema: schema({
        code: { type: "string", minLength: 1, description: "Lua expression or chunk." },
        file: { type: "string", minLength: 1, description: "Lua file, relative to target/mcp/probes." },
        timeoutSeconds: {
          type: "integer",
          minimum: 1,
          maximum: 300,
          default: 30,
          description: "How long to wait for the answer.",
        },
      }),
      call: async ({ code, file, timeoutSeconds }) => {
        if ((code === undefined) === (file === undefined)) {
          return text("Pass either 'code' or 'file'.", true);
        }

        const probe: Nullable<string> = file ? path.resolve(context.workspace.probes, file as string) : null;

        if (probe && !fs.existsSync(probe)) {
          return text(`No probe at '${probe}'.`, true);
        }

        const chunk: string = probe ? fs.readFileSync(probe, "utf8") : (code as string);

        return answer(await client.request("lua", { code: chunk }, (timeoutSeconds as number) * 1000));
      },
    },
    {
      name: "game_flow",
      description:
        "Run an in-game check flow and return how far it got, what failed, and the lines it reported, which say " +
        "what to do to reach a pending step.",
      inputSchema: schema(
        {
          name: { type: "string", minLength: 1, description: "Flow identity (`quests_zat_b14`), source or launcher." },
        },
        ["name"]
      ),
      call: async ({ name }) => {
        const flow: Nullable<ICheckDescriptor> = findFlow(name as string);

        if (!flow) {
          return text(
            `Unknown flow '${name}'. Available: ${discoverChecks()
              .map((it) => it.identity)
              .join(", ")}.`,
            true
          );
        }

        return answer(await client.request("flow", { module: flow.module, identity: flow.identity }, FLOW_WAIT_MS));
      },
    },
  ];
}
