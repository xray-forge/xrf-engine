import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { resetFunctionMock } from "xray16/testing/utils";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { removeSquadMapSpot, updateSquadMapSpot } from "@/engine/core/managers/map/utils/map_spot_squad";
import { MockSquad, resetRegistry } from "@/fixtures/engine";

describe("updateSquadMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;
    resetFunctionMock(level.map_add_object_spot);
    resetFunctionMock(level.map_change_spot_hint);
    resetFunctionMock(level.map_remove_object_spot);
  });

  it("should remove an existing mark when squad display is hidden", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.isMapDisplayHidden = true;
    squad.currentMapSpotId = 100;
    squad.currentMapSpotSection = "test_spot";

    updateSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, "test_spot");
    expect(squad.currentMapSpotId).toBeNull();
    expect(squad.currentMapSpotSection).toBeNull();
  });

  it("should add and refresh a squad mark when its commander stays unchanged", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.faction = "monster";
    squad.currentMapSpotId = 100;
    jest.spyOn(squad, "commander_id").mockReturnValue(100);

    const hasMapSpot = jest.spyOn(level, "map_has_object_spot").mockReturnValue(0);

    updateSquadMapSpot(squad);

    expect(level.map_add_object_spot).toHaveBeenCalledTimes(1);
    expect(squad.currentMapSpotSection).toBe("alife_presentation_squad_monster_debug");

    hasMapSpot.mockImplementation((_id, spot) => (spot === squad.currentMapSpotSection ? 1 : 0));
    updateSquadMapSpot(squad);

    expect(level.map_change_spot_hint).toHaveBeenCalledTimes(1);
  });

  it("should replace the squad mark when its commander changes", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.faction = "monster";
    squad.currentMapSpotId = 100;
    squad.currentMapSpotSection = "previous_spot";
    jest.spyOn(squad, "commander_id").mockReturnValue(101);
    jest.spyOn(level, "map_has_object_spot").mockReturnValue(0);

    updateSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, "previous_spot");
    expect(level.map_add_object_spot).toHaveBeenCalledWith(
      101,
      "alife_presentation_squad_monster_debug",
      expect.any(String)
    );
    expect(squad.currentMapSpotId).toBe(101);
  });
});

describe("removeSquadMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(level.map_remove_object_spot);
  });

  it("should remove an existing map spot and clear squad state", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.currentMapSpotId = 100;
    squad.currentMapSpotSection = "test_spot";

    removeSquadMapSpot(squad);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(100, "test_spot");
    expect(squad.currentMapSpotId).toBeNull();
    expect(squad.currentMapSpotSection).toBeNull();
  });
});
