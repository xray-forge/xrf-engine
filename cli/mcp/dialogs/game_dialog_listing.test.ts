import { describe, expect, it } from "@jest/globals";

import { filterDialogListing, formatDialogListing } from "#/mcp/dialogs/game_dialog_listing";
import { IGameDialogListing } from "#/mcp/dialogs/game_dialog_types";

function mockListing(overrides: Partial<IGameDialogListing["npc"]> = {}): IGameDialogListing {
  return {
    npc: {
      id: 6602,
      name: "zat_a2_stalker_mechanic6602",
      profile: "zat_a2_stalker_mechanic",
      scriptedStartDialog: null,
      isAlive: true,
      isTalkEnabled: true,
      ...overrides,
    },
    dialogs: [
      { id: "zat_b3_stalker_tech_start", isAvailable: true, isStartedByNpc: true, text: "Hey." },
      {
        id: "zat_b3_stalker_tech_drink_1",
        isAvailable: false,
        failed: "'dialogs_zaton.if_actor_has_vodka' is false",
        isStartedByNpc: false,
        text: "Got some booze. Want a shot?",
      },
      { id: "zat_b3_tech_buddies_about", isAvailable: true, isStartedByNpc: false, text: "Tell me about them." },
      { id: "actor_break_dialog", isAvailable: false, isStartedByNpc: false, text: "Laters." },
    ],
  };
}

describe("filterDialogListing", () => {
  it("should keep open or closed dialogs and those whose id matches", () => {
    const listing: IGameDialogListing = mockListing();

    expect(filterDialogListing(listing, {}).dialogs).toHaveLength(4);
    expect(filterDialogListing(listing, { only: "open" }).dialogs.map((it) => it.id)).toEqual([
      "zat_b3_stalker_tech_start",
      "zat_b3_tech_buddies_about",
    ]);
    expect(filterDialogListing(listing, { only: "closed", match: /DRINK/i }).dialogs.map((it) => it.id)).toEqual([
      "zat_b3_stalker_tech_drink_1",
    ]);
    expect(filterDialogListing(listing, { match: /buddies/i }).npc).toBe(listing.npc);
  });
});

describe("formatDialogListing", () => {
  it("should give one line per dialog between the NPC and a count of every dialog offered", () => {
    expect(formatDialogListing(mockListing(), {}).split("\n")).toEqual([
      "zat_a2_stalker_mechanic6602 (id 6602, profile zat_a2_stalker_mechanic): talk enabled",
      "open   zat_b3_stalker_tech_start [npc opens]",
      "closed zat_b3_stalker_tech_drink_1 - 'dialogs_zaton.if_actor_has_vodka' is false",
      "open   zat_b3_tech_buddies_about",
      "closed actor_break_dialog - closed",
      "2 open of 4 offered",
    ]);
  });

  it("should count every dialog offered when showing only some", () => {
    expect(formatDialogListing(mockListing(), { only: "closed", match: /drink/ }).split("\n")).toEqual([
      "zat_a2_stalker_mechanic6602 (id 6602, profile zat_a2_stalker_mechanic): talk enabled",
      "closed zat_b3_stalker_tech_drink_1 - 'dialogs_zaton.if_actor_has_vodka' is false",
      "2 open of 4 offered, 1 shown",
    ]);
  });

  it("should say when the NPC cannot talk and which start dialog a script set", () => {
    expect(formatDialogListing(mockListing({ isTalkEnabled: false }), { only: "open" }).split("\n")[0]).toBe(
      "zat_a2_stalker_mechanic6602 (id 6602, profile zat_a2_stalker_mechanic): talk disabled"
    );
    expect(
      formatDialogListing(mockListing({ isAlive: false, scriptedStartDialog: "zat_b3_custom" }), {}).split("\n")[0]
    ).toBe(
      "zat_a2_stalker_mechanic6602 (id 6602, profile zat_a2_stalker_mechanic, scripted start zat_b3_custom): dead"
    );
  });
});
