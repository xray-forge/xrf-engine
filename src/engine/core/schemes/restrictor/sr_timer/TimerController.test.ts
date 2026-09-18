import { describe, expect, it, jest } from "@jest/globals";
import { CUIGameCustom, get_hud } from "xray16";
import { GameObject, IniFile } from "xray16/alias";
import { MockGameObject, MockIniFile } from "xray16/mocks";

import { IRegistryObjectState, registerActor, registerObject } from "@/engine/core/database";
import { SchemeTimer } from "@/engine/core/schemes/restrictor/sr_timer/SchemeTimer";
import { ETimerType, ISchemeTimerState } from "@/engine/core/schemes/restrictor/sr_timer/sr_timer_types";
import { TimerController } from "@/engine/core/schemes/restrictor/sr_timer/TimerController";
import { activateSchemeBySection, loadSchemeImplementation } from "@/engine/core/schemes/runtime";
import { getSchemeStateOptimistic } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { getSchemeAction, mockSchemeState } from "@/fixtures/engine/mocks";

describe("TimerController", () => {
  it("should correctly activate and deactivate with label and timer id", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeTimerState = mockSchemeState<ISchemeTimerState>(EScheme.SR_TIMER, {
      timerId: "timer-id",
      string: "timer-label",
    });
    const timerController: TimerController = new TimerController(object, state);
    const hud: CUIGameCustom = get_hud();

    timerController.activate();

    expect(hud.GetCustomStatic("timer-id")).toBeDefined();
    expect(hud.GetCustomStatic("hud_timer_text")!.wnd().TextControl().GetText()).toBe("timer-label");

    timerController.deactivate();

    expect(hud.GetCustomStatic("timer-id")).toBeNull();
    expect(hud.GetCustomStatic("hud_timer_text")).toBeNull();
  });

  it("should correctly activate and deactivate without custom label", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeTimerState = mockSchemeState<ISchemeTimerState>(EScheme.SR_TIMER, {
      timerId: "timer-id",
    });
    const timerController: TimerController = new TimerController(object, state);
    const hud: CUIGameCustom = get_hud();

    timerController.activate();

    expect(hud.GetCustomStatic("timer-id")).toBeDefined();
    expect(hud.GetCustomStatic("hud_timer_text")).toBeNull();

    timerController.deactivate();

    expect(hud.GetCustomStatic("timer-id")).toBeNull();
    expect(hud.GetCustomStatic("hud_timer_text")).toBeNull();
  });

  it.each([
    { type: ETimerType.INCREMENT, start_value: 0, on_value: "3000|sr_idle@later|2000|nil" },
    { type: ETimerType.DECREMENT, start_value: 5000, on_value: "1000|sr_idle@later|3000|nil" },
  ])("should evaluate later thresholds in $type mode", (config) => {
    registerActor(MockGameObject.mock());

    const object = MockGameObject.mock();
    const state = registerObject(object);
    const ini = MockIniFile.mock("timer-thresholds.ltx", { sr_timer: config });

    loadSchemeImplementation(SchemeTimer);
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    activateSchemeBySection(object, ini, "sr_timer", null, false);

    const controller: TimerController = getSchemeAction(getSchemeStateOptimistic(state, EScheme.SR_TIMER));

    jest.spyOn(Date, "now").mockReturnValue(11_999);
    controller.update();
    expect(state.activeScheme).toBe(EScheme.SR_TIMER);

    jest.spyOn(Date, "now").mockReturnValue(12_000);
    controller.update();
    expect(state.activeScheme).toBeNull();
  });

  it("should continue through unmet and effect-only entries and stop after switching", () => {
    const actor = MockGameObject.mock();

    registerActor(actor);

    const object = MockGameObject.mock();
    const state = registerObject(object);
    const ini = MockIniFile.mock("timer-effects.ltx", {
      sr_timer: {
        on_value:
          "1000|{+timer_missing}sr_idle@invalid|1000|%+timer_effect%|" + "1000|{+timer_effect}nil|1000|%+timer_stale%",
      },
    });

    loadSchemeImplementation(SchemeTimer);
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    activateSchemeBySection(object, ini, "sr_timer", null, false);

    const controller: TimerController = getSchemeAction(getSchemeStateOptimistic(state, EScheme.SR_TIMER));

    jest.spyOn(Date, "now").mockReturnValue(10_999);
    controller.update();
    expect(actor.give_info_portion).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockReturnValue(11_000);
    controller.update();

    expect(actor.give_info_portion).toHaveBeenCalledWith("timer_effect");
    expect(actor.give_info_portion).not.toHaveBeenCalledWith("timer_stale");
    expect(state.activeScheme).toBeNull();
  });

  it("should correctly call updates", () => {
    registerActor(MockGameObject.mock());

    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      "sr_timer@test": {
        type: ETimerType.DECREMENT,
        start_value: 60_000,
        timer_id: "timer-id",
        string: "timer-label",
        on_value: "0 | nil",
      },
    });

    jest.spyOn(Date, "now").mockImplementation(() => 10_000);

    registerObject(object);
    loadSchemeImplementation(SchemeTimer);
    activateSchemeBySection(object, ini, "sr_timer@test", null, false);

    const schemeState: ISchemeTimerState = getSchemeStateOptimistic(state, EScheme.SR_TIMER);
    const timerController: TimerController = getSchemeAction(schemeState);

    jest.spyOn(timerController, "deactivate");

    jest.spyOn(Date, "now").mockImplementation(() => 20_000);
    timerController.update();
    expect(schemeState.timer.TextControl().GetText()).toBe("0:00:50");
    expect(timerController.deactivate).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockImplementation(() => 65_000);
    timerController.update();
    expect(schemeState.timer.TextControl().GetText()).toBe("0:00:05");
    expect(timerController.deactivate).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockImplementation(() => 95_000);
    timerController.update();

    expect(schemeState.timer.TextControl().GetText()).toBe("0:00:00");
    expect(timerController.deactivate).toHaveBeenCalled();
    expect(state.activeScheme).toBeNull();
    expect(state.activeSection).toBeNull();
    expect(state.activationTime).toBe(95_000);
  });
});
