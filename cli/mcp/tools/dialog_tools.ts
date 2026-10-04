import { TARGET_GAME_DATA_DIR } from "#/globals/paths";
import { IDialogInspectReport, IDialogListReport, TDialogOffer } from "#/mcp/dialogs/dialog_cli_types";
import { filterDialogListing, formatDialogListing } from "#/mcp/dialogs/game_dialog_listing";
import {
  IGameDialogListing,
  IGameDialogListingFilter,
  IGameDialogNpc,
  IGameDialogSummary,
} from "#/mcp/dialogs/game_dialog_types";
import { findDialogInitFunction, summarizeListedDialog, toGameDialog } from "#/mcp/dialogs/game_dialogs";
import { IMcpTool } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { answer, IGameToolsContext, json, schema, splitList, text } from "#/mcp/tools/tool_kit";
import { IXrfCliEnvelope } from "#/mcp/xrf_cli";
import { Nullable, Optional } from "#/utils/types";

/**
 * @param arguments_ - Arguments of one mode by name.
 * @returns Names of those given.
 */
function listGivenArguments(arguments_: Record<string, unknown>): Array<string> {
  return Object.keys(arguments_).filter((name) => arguments_[name] !== undefined);
}

/**
 * @param offer - How a dialog reaches the actor.
 * @returns Whether it is the character's start dialog.
 */
function isStartOffer(offer: TDialogOffer): boolean {
  return offer.kind === "start";
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools listing and walking an NPC's dialogs.
 */
export function createDialogTools(context: IGameToolsContext): Array<IMcpTool> {
  const { client } = context;

  /**
   * Run an `xrf-cli dialog` command over the gamedata the game runs.
   *
   * @param parameters - Subcommand and its arguments.
   * @returns What the command answered.
   */
  async function queryDialogs<T>(parameters: Array<string>): Promise<T> {
    const envelope: IXrfCliEnvelope = await context.runXrfCli([
      "dialog",
      ...parameters,
      "--path",
      TARGET_GAME_DATA_DIR,
      "--source",
      "directory",
    ]);

    if (envelope.result === null) {
      throw new Error(envelope.error ?? `xrf-cli dialog ${parameters[0]} answered nothing`);
    }

    return envelope.result as T;
  }

  /**
   * List the dialogs reaching the actor from an NPC.
   *
   * @param npc - What the endpoint reported about the NPC.
   * @returns The dialogs, as the game judges whether the actor may open each now.
   */
  async function listOffered(npc: IGameDialogNpc): Promise<Array<IGameDialogSummary>> {
    const { profile, scriptedStartDialog } = npc;

    if (!profile) {
      return [];
    }

    const { dialogs } = await queryDialogs<IDialogListReport>(["list", "--profile", profile]);
    const summaries: Array<IGameDialogSummary> = dialogs
      // A start dialog a script replaced no longer opens the talk, and nothing else offers it.
      .filter((entry) => !scriptedStartDialog || entry.id === scriptedStartDialog || !entry.offers.every(isStartOffer))
      .map((entry) =>
        summarizeListedDialog(
          entry,
          scriptedStartDialog ? entry.id === scriptedStartDialog : entry.offers.some(isStartOffer)
        )
      );

    if (scriptedStartDialog && !summaries.some((summary) => summary.id === scriptedStartDialog)) {
      const { dialog } = await queryDialogs<IDialogInspectReport>(["inspect", scriptedStartDialog]);
      const { phrases: _, ...summary } = toGameDialog(dialog, true);

      summaries.unshift(summary);
    }

    return summaries;
  }

  /**
   * @param npc - What the endpoint reported about the NPC.
   * @param dialog - Dialog id.
   * @returns Whether the NPC opens the dialog: the one a script set, or a start dialog of its character.
   */
  async function isStartedByNpc(npc: IGameDialogNpc, dialog: string): Promise<boolean> {
    if (dialog === npc.scriptedStartDialog) {
      return true;
    } else if (!npc.profile) {
      return false;
    }

    const { dialogs } = await queryDialogs<IDialogListReport>(["list", "--profile", npc.profile]);

    return dialogs.some((entry) => entry.id === dialog && entry.offers.some(isStartOffer));
  }

  return [
    {
      name: "game_dialog",
      description:
        "Talk to an NPC as the talk window would, by the dialog XML the game loads, read through `xrf-cli dialog`. " +
        "Without `dialog`, list the dialogs the NPC offers, one line each: open or closed, who opens it, and the " +
        "first condition that fails; `only` keeps open or closed ones, `match` filters ids, and `full` answers JSON " +
        "with each dialog's opening line instead; each mode refuses the other's arguments. With " +
        "`dialog`, open it and say the phrases in `say` in order: actor choices, and optionally NPC answers to force " +
        "where the NPC could say several, as the engine picks at random. Phrases apply their info portions, then run " +
        "their actions, with the same arguments and conditions as the engine. The answer lists the phrases said, the " +
        "actor's next options and any error; walk on by repeating the call with a longer `say`, since every call " +
        "opens the dialog again. A dialog opens as `opener` says, by default by the NPC for a start dialog of its " +
        "character, else by the actor. A walk closes the game's own talk window first, since it does not drive it.",
      inputSchema: schema(
        {
          npc: { type: "string", minLength: 1, description: "Story id, object id, or name pattern of the NPC." },
          dialog: { type: "string", minLength: 1, description: "Dialog id to open; omit to list the dialogs." },
          say: { type: "string", description: "Comma separated phrase ids to say after the opening one, e.g. `1,11`." },
          opener: { type: "string", enum: ["npc", "actor"], description: "Who says the opening phrase." },
          only: { type: "string", enum: ["open", "closed"], description: "Listing only: keep open or closed dialogs." },
          match: {
            type: "string",
            minLength: 1,
            description: "Listing only: case-insensitive regular expression dialog ids must match.",
          },
          full: { type: "boolean", description: "Listing only: answer JSON with each dialog's opening line." },
        },
        ["npc"]
      ),
      call: async ({ npc, dialog, say, opener, only, match, full }) => {
        // Each mode refuses the other's arguments rather than ignoring them, so a call never does less than it says.
        const misplaced: Array<string> =
          dialog === undefined ? listGivenArguments({ say, opener }) : listGivenArguments({ only, match, full });

        if (misplaced.length > 0) {
          return text(
            dialog === undefined
              ? `A listing takes no '${misplaced.join("', '")}'; name a dialog with 'dialog' to walk it.`
              : `A walk takes no '${misplaced.join("', '")}'; omit 'dialog' to list the dialogs.`,
            true
          );
        }

        const selector: string | number = /^\d+$/.test(npc as string) ? Number(npc) : (npc as string);
        const described: IGameResponse = await client.request("dialog_npc", { npc: selector });

        if (!described.ok) {
          return answer(described);
        }

        const partner: IGameDialogNpc = described.result as IGameDialogNpc;
        const id: Optional<string> = dialog as Optional<string>;

        if (id === undefined) {
          const listed: IGameResponse = await client.request("dialog", {
            npc: selector,
            dialogs: await listOffered(partner),
          });

          if (!listed.ok) {
            return answer(listed);
          }

          const listing: IGameDialogListing = listed.result as IGameDialogListing;
          const filter: IGameDialogListingFilter = {
            only: only as IGameDialogListingFilter["only"],
            match: match === undefined ? undefined : new RegExp(match as string, "i"),
          };

          return full ? json(filterDialogListing(listing, filter)) : text(formatDialogListing(listing, filter));
        }

        const { dialog: descriptor } = await queryDialogs<IDialogInspectReport>(["inspect", id]);
        const initFunction: Nullable<string> = findDialogInitFunction(descriptor);

        if (initFunction) {
          return text(`Dialog '${id}' is built by '${initFunction}' at runtime, so it has no phrases to walk.`, true);
        }

        const isOpenedByNpc: boolean = opener ? opener === "npc" : await isStartedByNpc(partner, id);

        return answer(
          await client.request("dialog", {
            npc: selector,
            walk: { dialog: toGameDialog(descriptor, isOpenedByNpc), choices: splitList(say) },
          })
        );
      },
    },
  ];
}
