import {
  IGameDialogListing,
  IGameDialogListingFilter,
  IGameDialogNpc,
  IGameOfferedDialog,
} from "#/mcp/dialogs/game_dialog_types";

/**
 * @param listing - Dialogs an NPC offers, as the game judged them.
 * @param filter - Which dialogs to keep.
 * @returns The listing holding only the dialogs the filter keeps.
 */
export function filterDialogListing(listing: IGameDialogListing, filter: IGameDialogListingFilter): IGameDialogListing {
  const { only, match } = filter;

  return {
    ...listing,
    dialogs: listing.dialogs.filter(
      (dialog) =>
        (only === undefined || dialog.isAvailable === (only === "open")) &&
        (match === undefined || match.test(dialog.id))
    ),
  };
}

/**
 * @param npc - NPC the listing is about.
 * @returns One line naming the NPC and whether the actor can talk to it at all.
 */
function describeNpc(npc: IGameDialogNpc): string {
  const state: string = !npc.isAlive ? "dead" : npc.isTalkEnabled ? "talk enabled" : "talk disabled";
  const scripted: string = npc.scriptedStartDialog ? `, scripted start ${npc.scriptedStartDialog}` : "";

  return `${npc.name} (id ${npc.id}, profile ${npc.profile ?? "none"}${scripted}): ${state}`;
}

/**
 * @param dialog - Dialog as the game judged it.
 * @returns One line: open or closed, the id, who opens it, and the failed condition.
 */
function describeDialog(dialog: IGameOfferedDialog): string {
  const opener: string = dialog.isStartedByNpc ? " [npc opens]" : "";
  const reason: string = dialog.isAvailable ? "" : ` - ${dialog.failed ?? "closed"}`;

  return `${dialog.isAvailable ? "open  " : "closed"} ${dialog.id}${opener}${reason}`;
}

/**
 * @param listing - Dialogs an NPC offers, as the game judged them.
 * @param filter - Which dialogs to show.
 * @returns The shown dialogs one per line, between the NPC and a count over every dialog offered.
 */
export function formatDialogListing(listing: IGameDialogListing, filter: IGameDialogListingFilter): string {
  const shown: Array<IGameOfferedDialog> = filterDialogListing(listing, filter).dialogs;
  const open: number = listing.dialogs.filter((dialog) => dialog.isAvailable).length;
  const count: string = shown.length === listing.dialogs.length ? "" : `, ${shown.length} shown`;

  return [
    describeNpc(listing.npc),
    ...shown.map(describeDialog),
    `${open} open of ${listing.dialogs.length} offered${count}`,
  ].join("\n");
}
