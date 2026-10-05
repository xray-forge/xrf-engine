import { describe, expect, it } from "@jest/globals";
import { CTime, game } from "xray16";
import { MockCTime } from "xray16/mocks";

import { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action/SquadStayOnTargetAction";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { MockSquad } from "@/fixtures/engine";

describe("SquadStayOnTargetAction", () => {
  it("should correctly initialize", () => {
    const squad: MockSquad = MockSquad.mock();
    const action: SquadStayOnTargetAction = new SquadStayOnTargetAction(squad);

    expect(action.squad).toBe(squad);
    expect(action.type).toBe(ESquadActionType.STAY_ON_TARGET);
    expect(action.actionStartTime).toBeNull();
    expect(typeof action.actionIdleTime).toBe("number");

    action.initialize();

    expect(MockCTime.areEqual(action.actionStartTime as CTime, game.get_game_time())).toBe(true);
  });

  it("should correctly finalize", () => {
    const squad: MockSquad = MockSquad.mock();
    const action: SquadStayOnTargetAction = new SquadStayOnTargetAction(squad);

    action.initialize();

    expect(() => action.finalize()).not.toThrow();
  });

  it("should finish at once online, and under simulation once the idle time has passed", () => {
    const action: SquadStayOnTargetAction = new SquadStayOnTargetAction(MockSquad.mock());
    const previousNow: MockCTime = MockCTime.nowTime;

    MockCTime.nowTime = MockCTime.create(2012, 6, 12, 10, 0, 0, 0);
    action.initialize();
    action.actionIdleTime = 600;

    // Not under simulation (online): finishes immediately, ignoring the idle timer.
    expect(action.update(false)).toBe(true);
    expect(action.update(true)).toBe(false);

    MockCTime.nowTime = MockCTime.create(2012, 6, 12, 10, 10, 0, 0);
    expect(action.update(true)).toBe(false);

    MockCTime.nowTime = MockCTime.create(2012, 6, 12, 10, 10, 1, 0);
    expect(action.update(true)).toBe(true);

    MockCTime.nowTime = previousNow;
  });

  it("should correctly calculate stay idle duration", () => {
    const squad: MockSquad = MockSquad.mock();
    const action: SquadStayOnTargetAction = new SquadStayOnTargetAction(squad);

    action.initialize();

    expect(action.getStayIdleDuration()).toBe(action.actionIdleTime);
  });
});
