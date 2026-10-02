import * as fs from "node:fs";
import * as path from "node:path";

import { IMcpTool, IToolResult } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { bankSave, IBankedSave, isValidSaveName, listBankedSaves } from "#/mcp/save_bank";
import { prepareSave, startArmedGame, waitForGreeting } from "#/mcp/tools/session_tools";
import { answer, IGameToolsContext, json, schema, sleep, text } from "#/mcp/tools/tool_kit";
import { AnyObject, Nullable } from "#/utils/types";

const SAVE_WAIT_MS: number = 20_000;

/**
 * Wait for the game to write a save.
 *
 * @param savedgames - Game's saves folder.
 * @param name - Save name.
 * @param since - Moment the save was asked for, in milliseconds.
 * @returns Whether the save was written in time.
 */
async function waitForSaveFile(savedgames: string, name: string, since: number): Promise<boolean> {
  const file: string = path.join(savedgames, `${name}.scop`);
  const deadline: number = Date.now() + SAVE_WAIT_MS;

  while (Date.now() < deadline) {
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs >= since - 1000) {
      // Its companion files follow in the same frame; one more poll leaves them time.
      await sleep(500);

      return true;
    }

    await sleep(200);
  }

  return false;
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools keeping test saves in the bank under target/mcp/saves and loading them.
 */
export function createSaveTools(context: IGameToolsContext): Array<IMcpTool> {
  const { client } = context;

  return [
    {
      name: "game_save",
      description:
        "Save the running game under a name and keep the save in the bank, target/mcp/saves, with its level, game " +
        "time and a note, so game_load and game_start can bring it back at any time.",
      inputSchema: schema(
        {
          name: {
            type: "string",
            minLength: 1,
            description: "Save name: letters, digits and `_`, e.g. `mcp_skadovsk`.",
          },
          note: { type: "string", description: "What the save is for, e.g. `Skadovsk bar, two dozen NPCs online`." },
        },
        ["name"]
      ),
      call: async ({ name, note }) => {
        if (!isValidSaveName(name as string)) {
          return text("Save names take letters, digits and `_`.", true);
        }

        const status: IGameResponse = await client.request("status");
        const result: AnyObject = (status.result as AnyObject) ?? {};

        if (!status.ok || !result.level) {
          return status.ok ? text("Saving needs a running level.", true) : answer(status);
        }

        const { savedgames } = await context.getPaths();
        const since: number = Date.now();
        const saved: IGameResponse = await client.request("console", { command: `save ${name}` });

        if (!saved.ok) {
          return answer(saved);
        }

        if (!(await waitForSaveFile(savedgames, name as string, since))) {
          return text(`The game wrote no save '${name}' in time.`, true);
        }

        return json(
          bankSave(savedgames, context.workspace.saves, {
            name: name as string,
            bankedAt: new Date().toISOString(),
            level: result.level,
            gameTime: result.gameTime,
            note: (note as Nullable<string>) ?? null,
          })
        );
      },
    },
    {
      name: "game_saves",
      description: "List the saves in the bank, target/mcp/saves, with their level, game time and note.",
      inputSchema: schema(),
      call: async () => {
        const saves: Array<IBankedSave> = listBankedSaves(context.workspace.saves);

        return saves.length > 0 ? json(saves) : text("The save bank is empty; make saves with game_save.");
      },
    },
    {
      name: "game_load",
      description:
        "Load a save, from the bank when it has one, and wait until its level runs: in a running level or the main " +
        "menu through the console, and by starting the game armed when none runs.",
      inputSchema: schema(
        {
          name: { type: "string", minLength: 1, description: "Save name." },
          timeoutSeconds: { type: "integer", minimum: 1, maximum: 900, default: 300, description: "How long to wait." },
        },
        ["name"]
      ),
      call: async ({ name, timeoutSeconds }) => {
        const save: string = name as string;
        const timeoutMs: number = (timeoutSeconds as number) * 1000;

        if (!(await context.isGameRunning())) {
          return startArmedGame(context, save, undefined, timeoutMs);
        }

        const missing: Nullable<IToolResult> = await prepareSave(context, save);

        if (missing) {
          return missing;
        }

        const status: IGameResponse = await client.request("status");

        if (!status.ok) {
          return answer(status);
        }

        const previous: Nullable<string> = client.session;
        // `load` needs a running game, which the main menu lacks, so a save starts the game there instead.
        const command: string = (status.result as AnyObject)?.level
          ? `load ${save}`
          : `start server(${save}/single/alife/load) client(localhost)`;
        const loading: IGameResponse = await client.request("console", { command });

        return loading.ok ? waitForGreeting(context, timeoutMs, previous) : answer(loading);
      },
    },
  ];
}
