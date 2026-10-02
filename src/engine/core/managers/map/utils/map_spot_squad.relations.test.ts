import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerHumanObject } from "xray16/alias";
import { ACTOR_ID } from "xray16/lib";
import { MockAlifeHumanStalker, mockCharactersGoodwill, MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { communities } from "@/engine/constants/communities";
import { mapMarks } from "@/engine/constants/map_marks";
import { registerObject } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { removeSquadMapSpot, updateSquadMapSpot } from "@/engine/core/managers/map/utils/map_spot_squad";
import { mockRegisteredActor, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * Attach a squad member whose goodwill towards the actor produces the requested relation.
 */
function addMemberWithGoodwill(squad: MockSquad, goodwill: number): ServerHumanObject {
  const member: ServerHumanObject = MockAlifeHumanStalker.mock();
  const object: GameObject = MockGameObject.mock({ id: member.id });

  registerObject(object);
  mockCharactersGoodwill(member.id, ACTOR_ID, goodwill);
  squad.mockAddMember(member);

  return member;
}

describe("updateSquadMapSpot relation marks", () => {
  const isSimulationEnabled: boolean = forgeConfig.DEBUG.IS_SIMULATION_ENABLED;

  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();

    resetFunctionMock(level.map_add_object_spot);
    resetFunctionMock(level.map_change_spot_hint);
    resetFunctionMock(level.map_remove_object_spot);

    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = isSimulationEnabled;
  });

  /**
   * Build a squad whose map spot is already synchronized with its commander.
   */
  function createSquad(faction: string = communities.stalker): MockSquad {
    const squad: MockSquad = MockSquad.mock();

    squad.faction = faction as never;
    squad.currentMapSpotId = 100;

    jest.spyOn(squad, "commander_id").mockReturnValue(100);
    jest.spyOn(level, "map_has_object_spot").mockReturnValue(0);

    return squad;
  }

  it("should hide the default mark for npcs holding a role spot", () => {
    const squad: MockSquad = createSquad();

    jest
      .spyOn(level, "map_has_object_spot")
      .mockImplementation((_id, spot) => (spot === mapMarks.ui_pda2_trader_location ? 1 : 0));

    updateSquadMapSpot(squad);

    expect(squad.isMapDisplayHidden).toBe(true);
    expect(level.map_add_object_spot).toHaveBeenCalledTimes(0);
  });

  it("should use the debug friend mark for friendly squads", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, 1_000);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_friend_debug);
  });

  it("should use the debug neutral mark for neutral squads", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, 0);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_neutral_debug);
  });

  it("should use the debug enemy mark for hostile squads", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, -1_000);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_enemy_debug);
  });

  it("should use the plain friend mark outside of debug display", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, 1_000);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_friend);
  });

  it("should use the plain neutral mark outside of debug display", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, 0);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_neutral);
  });

  it("should not mark hostile squads outside of debug display", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, -1_000);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBeNull();
    expect(level.map_add_object_spot).toHaveBeenCalledTimes(0);
  });

  it("should not mark monster squads outside of debug display", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad(communities.monster);

    updateSquadMapSpot(squad);

    expect(squad.currentMapSpotSection).toBeNull();
    expect(level.map_add_object_spot).toHaveBeenCalledTimes(0);
  });

  it("should drop a stale mark when the squad no longer qualifies for one", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad(communities.monster);

    squad.currentMapSpotSection = mapMarks.alife_presentation_squad_neutral;

    updateSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, mapMarks.alife_presentation_squad_neutral);
    expect(squad.currentMapSpotSection).toBeNull();
  });

  it("should replace a differing mark that is still displayed", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    const squad: MockSquad = createSquad();

    addMemberWithGoodwill(squad, 1_000);

    squad.currentMapSpotSection = mapMarks.alife_presentation_squad_neutral;
    // Only the squad mark is displayed - role marks must stay absent or the whole spot gets hidden.
    jest
      .spyOn(level, "map_has_object_spot")
      .mockImplementation((_id, spot) => (spot === mapMarks.alife_presentation_squad_friend ? 1 : 0));

    updateSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, mapMarks.alife_presentation_squad_neutral);
    expect(level.map_add_object_spot).toHaveBeenCalledWith(
      100,
      mapMarks.alife_presentation_squad_friend,
      expect.any(String)
    );
    expect(squad.currentMapSpotSection).toBe(mapMarks.alife_presentation_squad_friend);
  });

  it("should remove the mark for squads without a commander", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.currentMapSpotId = 100;
    squad.currentMapSpotSection = "test_spot";

    jest.spyOn(squad, "commander_id").mockReturnValue(null as never);

    updateSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, "test_spot");
  });
});

describe("removeSquadMapSpot without state", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(level.map_remove_object_spot);
  });

  it("should be inert for squads without a recorded mark", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.currentMapSpotId = null;
    squad.currentMapSpotSection = null;

    removeSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledTimes(0);
  });
});
