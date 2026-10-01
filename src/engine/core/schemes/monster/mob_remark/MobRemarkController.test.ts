import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid } from "xray16";
import { GameObject } from "xray16/alias";
import { TName } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockGameObject } from "xray16/mocks";

import { EMonsterState } from "@/engine/constants/monsters";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType } from "@/engine/core/managers/notifications/notifications_types";
import { ISchemeMobRemarkState } from "@/engine/core/schemes/monster/mob_remark/mob_remark_types";
import { MobRemarkController } from "@/engine/core/schemes/monster/mob_remark/MobRemarkController";
import { EScheme } from "@/engine/core/schemes/types";
import { mockBaseSchemeLogic, mockSchemeState, resetRegistry } from "@/fixtures/engine";

describe("MobRemarkController", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly activate", () => {
    const object: GameObject = MockGameObject.mock({ clsid: clsid.bloodsucker_s });
    const state: ISchemeMobRemarkState = mockSchemeState<ISchemeMobRemarkState>(EScheme.MOB_REMARK, {
      signals: $fromObject<TName, boolean>({ a: true }),
      state: EMonsterState.INVISIBLE,
      anim: "example1, example2",
      time: "255, 0",
      animationMovement: true,
    });
    const controller: MobRemarkController = new MobRemarkController(object, state);

    controller.activate();

    expect(state.signals).toEqualLuaTables({});
    expect(controller.isTipSent).toBe(false);
    expect(controller.isActionEndSignalled).toBe(false);

    expect(object.disable_talk).toHaveBeenCalledTimes(1);
    expect(object.set_invisible).toHaveBeenCalledWith(true);
    expect(object.script).toHaveBeenCalledWith(true, "xrf");
    expect(object.command).toHaveBeenCalledTimes(2);
  });

  it("should correctly update", () => {
    const object: GameObject = MockGameObject.mock({ clsid: clsid.bloodsucker_s });
    const state: ISchemeMobRemarkState = mockSchemeState<ISchemeMobRemarkState>(EScheme.MOB_REMARK, {
      signals: $fromObject<TName, boolean>({ a: true }),
      state: EMonsterState.INVISIBLE,
      anim: "example1, example2",
      time: "255, 0",
      tip: "test_tip",
      dialogCondition: mockBaseSchemeLogic({
        condlist: parseConditionsList("true"),
      }),
      animationMovement: true,
    });
    const controller: MobRemarkController = new MobRemarkController(object, state);

    jest.spyOn(object, "get_script").mockImplementation(() => true);
    jest.spyOn(EventsManager, "emitEvent");

    controller.activate();
    controller.update();

    expect(controller.isTipSent).toBe(true);
    expect(controller.isActionEndSignalled).toBe(true);
    expect(state.signals).toEqualLuaTables({ action_end: true });
    expect(object.enable_talk).toHaveBeenCalledTimes(1);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: "test_tip",
    });
  });
});
