import { beforeEach, describe, expect, it } from "@jest/globals";
import { LuaArray, TName, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockAlifeHumanStalker } from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import { getDebugObjectLevelName } from "@/engine/core/managers/debug/utils/debug_inspect";
import { inspectDebugSimulationLevel } from "@/engine/core/managers/debug/utils/debug_simulation_level";
import { destroySimulationData, resetSimulationDataCache } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import {
  getDebugFieldValues,
  mockRegisteredActor,
  MockSmartTerrain,
  MockSquad,
  resetRegistry,
} from "@/fixtures/engine";

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  resetSimulationDataCache();
});

describe("inspectDebugSimulationLevel", () => {
  it("should count squads by faction and terrains by property, with the tunables", () => {
    const squad: MockSquad = MockSquad.mockRegistered() as MockSquad;
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.maxStayingSquadsCount = 4;
    terrain.simulationProperties = $fromObject<TName, TRate>({ base: 1, lair: 0 });
    squad.mockAddMember(MockAlifeHumanStalker.mock());

    const fields: LuaArray<IDebugField> = inspectDebugSimulationLevel(getDebugObjectLevelName(squad));

    expect(getDebugFieldValues(fields, squad.faction)).toEqual(["1 squads, 1 members"]);
    expect(getDebugFieldValues(fields, "base terrains")).toEqual(["1, 0/4 squads"]);
    expect(getDebugFieldValues(fields, "lair terrains")).toEqual([]);
    expect(getDebugFieldValues(fields, "respawn points")).toEqual(["0, 0 not blocked"]);
    expect(getDebugFieldValues(fields, "base priority")).toEqual(["3"]);
    expect(getDebugFieldValues(fields, "stay on target")).toEqual(["1h 30m to 4h 0m"]);
  });
});
