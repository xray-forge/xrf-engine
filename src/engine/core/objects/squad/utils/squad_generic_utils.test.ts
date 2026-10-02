import { beforeEach, describe, expect, it } from "@jest/globals";
import { FALSE } from "xray16/lib";

import { registerSimulator } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { parseConditionsList } from "@/engine/core/ini";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { Squad } from "@/engine/core/objects/squad/Squad";
import { getSquadMapDisplayHint } from "@/engine/core/objects/squad/utils/squad_generic_utils";
import { MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

describe("getSquadMapDisplayHint", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();

    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;
  });

  it("should correctly get hint without debug", () => {
    const squad: Squad = MockSquad.mock();

    expect(getSquadMapDisplayHint(squad)).toBe("");
  });

  it("should correctly get hint with debug and defaults", () => {
    const squad: Squad = MockSquad.mock();

    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;

    squad.isSimulationAvailableConditionList = parseConditionsList(FALSE);

    expect(getSquadMapDisplayHint(squad).replaceAll("\\n", "\n")).toBe(`[${squad.name()}]
available = false
online = true
faction = stalker
community = stalker
spawn_id = nil
spawn_section = nil
[smart_terrain]
assigned = nil
[target]
current = nil
assigned = nil
last = nil
next = nil
[action]
current = nil
`);
  });

  it("should correctly get hint with debug and custom values", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const squad: Squad = MockSquad.mock();
    const target: Squad = MockSquad.mock();
    const assigned: Squad = MockSquad.mock();
    const next: Squad = MockSquad.mock();

    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;

    squad.currentTargetId = target.id;
    squad.currentAction = new SquadStayOnTargetAction(target);

    squad.assignedTargetId = 5000;
    squad.assignedTerrainId = terrain.id;
    squad.nextTargetIndex = next.id;
    squad.assignedTargetId = assigned.id;

    expect(getSquadMapDisplayHint(squad).replaceAll("\\n", "\n")).toBe(`[${squad.name()}]
available = true
online = true
faction = stalker
community = stalker
spawn_id = nil
spawn_section = nil
[smart_terrain]
assigned = ${terrain.name()}
[target]
current = ${target.name()}
assigned = ${assigned.name()}
last = nil
next = ${next.id}
[action]
current = ${squad.currentAction.type}
stay_on_target_for = 0
`);
  });
});
