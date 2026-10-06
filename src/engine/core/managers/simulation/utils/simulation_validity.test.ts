import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { registerGameHook } from "@/engine/core/hooks/hooks";
import { EGameHook } from "@/engine/core/hooks/hooks_types";
import { ESimulationTargetRejection } from "@/engine/core/managers/simulation/types";
import { canSquadTakeSimulationTarget } from "@/engine/core/managers/simulation/utils/simulation_validity";
import { Squad } from "@/engine/core/objects/squad";
import { MockSquad, resetRegistry } from "@/fixtures/engine";

beforeEach(() => {
  resetRegistry();
});

describe("canSquadTakeSimulationTarget", () => {
  it("should apply the target's own rules first, then the extensions' guards", () => {
    const target: Squad = MockSquad.mock();
    const squad: Squad = MockSquad.mock();
    const guard = jest.fn(() => "guarded by test");
    const own = jest.spyOn(target, "isValidSimulationTarget");

    own.mockImplementation(() => $multi(true, null));

    expect(canSquadTakeSimulationTarget(squad, target)).toEqual([true, null]);

    own.mockImplementation(() => $multi(false, ESimulationTargetRejection.NOT_WANTED));
    registerGameHook(EGameHook.SIMULATION_TARGET_VALIDITY, guard, { owner: "test" });

    expect(canSquadTakeSimulationTarget(squad, target, true)).toEqual([false, ESimulationTargetRejection.NOT_WANTED]);
    expect(own).toHaveBeenCalledWith(squad, true);
    expect(guard).not.toHaveBeenCalled();

    own.mockImplementation(() => $multi(true, null));

    expect(canSquadTakeSimulationTarget(squad, target)).toEqual([false, "guarded by test"]);
    expect(guard).toHaveBeenCalledWith(target, squad);
  });
});
