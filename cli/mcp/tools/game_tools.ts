import * as fs from "node:fs";
import * as path from "node:path";

import { discoverChecks, ICheckDescriptor } from "#/checks/utils/discover_checks";
import { IMcpTool, IToolResult } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { waitForGreeting } from "#/mcp/tools/session_tools";
import { answer, IGameToolsContext, json, schema, sleep, text } from "#/mcp/tools/tool_kit";
import { Nullable } from "#/utils/types";

import { EFlowOutcome, EFlowTravel } from "@/engine/checks/framework/result_types";

const FLOW_WAIT_MS: number = 60_000;
const WAIT_POLL_MS: number = 1_000;
const WAIT_CHECK_MS: number = 5_000;
const TIME_FACTOR_RESET_MS: number = 30_000;
const PROCESS_CHECK_MS: number = 5_000;

/**
 * What one run of a flow answers, as far as waiting on it goes.
 */
interface IFlowRunResult {
  outcome: EFlowOutcome;
  steps: number;
  travel: EFlowTravel;
}

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
 * Run something with the engine clock sped up, and put the clock back to normal speed whatever it did.
 *
 * A reset the game does not answer, such as one sent while a level loads, fails the call instead of leaving the game
 * sped up unnoticed. A game that exited needs no reset.
 *
 * @param context - What the tools reach outside the pipe.
 * @param speed - Engine time factor to run at, 1 for normal speed.
 * @param body - What to run.
 * @returns What it answered.
 */
async function runAtEngineSpeed<T>(context: IGameToolsContext, speed: number, body: () => Promise<T>): Promise<T> {
  if (speed === 1) {
    return body();
  }

  await context.client.request("console", { command: `time_factor ${speed}` });

  try {
    return await body();
  } finally {
    if (await context.isGameRunning()) {
      await context.client.request("console", { command: "time_factor 1" }, TIME_FACTOR_RESET_MS);
    }
  }
}

/**
 * Whether running a flow again could show something new by itself: it waits on the same step, confirming none.
 *
 * @param response - Answer of one flow run.
 * @returns Whether the flow waits without having confirmed a step.
 */
export function isFlowStillWaiting(response: IGameResponse): boolean {
  const result: Nullable<IFlowRunResult> = response.ok ? (response.result as IFlowRunResult) : null;

  return result?.outcome === EFlowOutcome.WAITING && result.steps === 0;
}

/**
 * @param started - When the wait started.
 * @returns The answer for a wait the game process ended before it was over.
 */
function answerGameExited(started: number): IToolResult {
  return text(
    `The game exited ${(Date.now() - started) / 1000} s into the wait; read game_log, and the next start keeps the ` +
      "logs of a crash.",
    true
  );
}

/**
 * Run a flow, and run it again every second while it only waits, up to a deadline.
 *
 * Each level lets one run travel: the runs after it only watch what arriving started, as travelling again would undo
 * it. A jump to another level is waited out, and the new level lets a run travel again. Only the pauses between runs go
 * at `speed`, as a run may jump the level and a game loading one answers no speed reset.
 *
 * @param context - What the tools reach outside the pipe.
 * @param flow - Flow to run.
 * @param waitSeconds - Longest time to keep running it, in real seconds; 0 runs it once.
 * @param speed - Engine time factor of the pauses between runs.
 * @returns The last run's answer, with how many runs it took and how long they waited.
 */
async function waitOnFlow(
  context: IGameToolsContext,
  flow: ICheckDescriptor,
  waitSeconds: number,
  speed: number
): Promise<IToolResult> {
  const started: number = Date.now();
  const deadline: number = started + waitSeconds * 1000;
  let runs: number = 0;
  let isTravelAllowed: boolean = true;
  let response: IGameResponse;

  do {
    if (runs > 0) {
      await runAtEngineSpeed(context, speed, () => sleep(Math.min(WAIT_POLL_MS, Math.max(deadline - Date.now(), 0))));
    }

    const session: Nullable<string> = context.client.session;

    try {
      response = await context.client.request(
        "flow",
        { module: flow.module, identity: flow.identity, travel: isTravelAllowed },
        FLOW_WAIT_MS
      );
    } catch (error) {
      if (!(await context.isGameRunning())) {
        return answerGameExited(started);
      }

      throw error;
    }

    runs += 1;

    const travel: EFlowTravel = response.ok ? (response.result as IFlowRunResult).travel : EFlowTravel.NONE;

    if (travel === EFlowTravel.TO_LEVEL && Date.now() < deadline) {
      const arrival: IToolResult = await waitForGreeting(context, deadline - Date.now(), session);

      if (arrival.isError) {
        return arrival;
      }

      isTravelAllowed = true;
    } else if (travel === EFlowTravel.ON_LEVEL) {
      isTravelAllowed = false;
    }
  } while (isFlowStillWaiting(response) && Date.now() < deadline);

  if (!response.ok) {
    return answer(response);
  }

  return json({ ...(response.result as object), runs, waitedSeconds: (Date.now() - started) / 1000 });
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
        "without `return`. Engine objects come back named, such as `<game_object 0 actor>`. Chunks see `mcp`, the " +
        "in-game utilities of src/engine/checks/mcp/mcp_probe.ts under their own names: registry, getManagerByName, " +
        "getGameObjects, getNearestGameObject, getServerObjects, getNearestServerObject, getObjectByStoryId, " +
        "getServerObjectByStoryId, getSimulationSquads, getObjectSquad, getSquadMembers, killSquadMember, " +
        "teleportActorNearPosition, teleportActorToPosition, giveItemsToActor, giveMoneyToActor, giveInfoPortion, " +
        "hasInfoPortion, forwardGameTime and more. Globals a chunk sets stay for later chunks until a load. Pass " +
        "`file` to run a probe kept under target/mcp/probes instead of `code`.",
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
      name: "game_wait",
      description:
        "Let the game run for `seconds`, or until the Lua expression `until` is truthy, checked every second, and " +
        "answer with the game status, or with the last value of `until`. Use it to let a load settle or to follow a " +
        "surge, a sleep or a travel; the game may be silent while it loads, and a game that exits ends the wait " +
        "at once. `speed` runs the engine clock that many " +
        "times faster during the wait and back at normal speed after it, which plays scenes, logic timers and sounds " +
        "faster; keep it at 1 for fights, which physics decides.",
      inputSchema: schema(
        {
          seconds: { type: "integer", minimum: 1, maximum: 600, description: "Longest time to wait, in real seconds." },
          until: { type: "string", minLength: 1, description: "Lua expression ending the wait once truthy." },
          speed: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 1,
            description: "Engine time factor during the wait, the `time_factor` of a non-Gold engine.",
          },
        },
        ["seconds"]
      ),
      call: async ({ seconds, until, speed }) =>
        runAtEngineSpeed(context, speed as number, async () => {
          const started: number = Date.now();
          const deadline: number = started + (seconds as number) * 1000;

          if (until === undefined) {
            while (Date.now() < deadline) {
              await sleep(Math.min(PROCESS_CHECK_MS, deadline - Date.now()));

              if (!(await context.isGameRunning())) {
                return answerGameExited(started);
              }
            }

            return answer(await client.request("status"));
          }

          let last: Nullable<IGameResponse> = null;
          let failure: Nullable<string> = null;

          while (Date.now() < deadline) {
            try {
              last = await client.request("lua", { code: until }, WAIT_CHECK_MS);
              failure = last.ok ? null : (last.error ?? null);
            } catch (error) {
              failure = (error as Error).message;

              // A silent game is either loading or gone, and only the process list tells which.
              if (!(await context.isGameRunning())) {
                return answerGameExited(started);
              }
            }

            // Lua truth: only nil and false fail.
            if (last?.ok && last.result !== null && last.result !== undefined && last.result !== false) {
              return json({ matched: true, waitedSeconds: (Date.now() - started) / 1000, value: last.result });
            }

            await sleep(Math.min(WAIT_POLL_MS, Math.max(deadline - Date.now(), 0)));
          }

          return json({
            matched: false,
            waitedSeconds: (Date.now() - started) / 1000,
            value: last?.result ?? null,
            error: failure,
          });
        }),
    },
    {
      name: "game_flow",
      description:
        "Run an in-game check flow and return how far it got, what failed, and the lines it reported, which say " +
        "what to do to reach a pending step. With `waitSeconds` it runs the flow again every second while it waits " +
        "on the same step, and answers once a step is confirmed, the walk ends, or the time is up. Only the first " +
        "run on a level travels, so the rest watch what arriving started; a jump to another level is waited out. " +
        "`speed` runs the engine clock faster between runs, as game_wait does, and normal during them.",
      inputSchema: schema(
        {
          name: { type: "string", minLength: 1, description: "Flow identity (`quests_zat_b14`), source or launcher." },
          waitSeconds: {
            type: "integer",
            minimum: 0,
            maximum: 600,
            default: 0,
            description: "Longest time to keep running the flow while it waits on the same step, in real seconds.",
          },
          speed: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 1,
            description: "Engine time factor of the pauses between runs, the `time_factor` of a non-Gold engine.",
          },
        },
        ["name"]
      ),
      call: async ({ name, waitSeconds, speed }) => {
        const flow: Nullable<ICheckDescriptor> = findFlow(name as string);

        if (!flow) {
          return text(
            `Unknown flow '${name}'. Available: ${discoverChecks()
              .map((it) => it.identity)
              .join(", ")}.`,
            true
          );
        }

        return waitOnFlow(context, flow, waitSeconds as number, speed as number);
      },
    },
  ];
}
