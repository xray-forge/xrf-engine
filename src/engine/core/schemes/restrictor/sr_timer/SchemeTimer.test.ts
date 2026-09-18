import { describe, expect, it } from "@jest/globals";
import { GameObject, IniFile } from "xray16/alias";
import { MockGameObject, MockIniFile } from "xray16/mocks";

import { registerObject } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { SchemeTimer } from "@/engine/core/schemes/restrictor/sr_timer/SchemeTimer";
import { ETimerType, ISchemeTimerState } from "@/engine/core/schemes/restrictor/sr_timer/sr_timer_types";
import { loadSchemeImplementation } from "@/engine/core/schemes/runtime/scheme_setup";
import { EScheme, ESchemeType } from "@/engine/core/schemes/types";

describe("SchemeTimer functionality", () => {
  it("should be correctly defined", () => {
    expect(SchemeTimer.SCHEME_SECTION).toBe("sr_timer");
    expect(SchemeTimer.SCHEME_SECTION).toBe(EScheme.SR_TIMER);
    expect(SchemeTimer.SCHEME_TYPE).toBe(ESchemeType.RESTRICTOR);
  });

  it.each([{}, { on_value: "" }, { on_value: "   " }])("should accept missing or empty thresholds: %s", (config) => {
    const object = MockGameObject.mock();
    const ini = MockIniFile.mock("timer-empty.ltx", { sr_timer: config });

    registerObject(object);
    loadSchemeImplementation(SchemeTimer);

    expect(() => SchemeTimer.activate(object, ini, EScheme.SR_TIMER, "sr_timer")).not.toThrow();
    expect(SchemeTimer.activate(object, ini, EScheme.SR_TIMER, "sr_timer").onValue.length()).toBe(0);
  });

  it("should preserve all thresholds and condlist alternatives in configuration order", () => {
    const object = MockGameObject.mock();
    const ini = MockIniFile.mock("timer-list.ltx", {
      sr_timer: { on_value: "3000 | {+test_info} sr_idle@first, sr_idle@fallback | 2000 | nil" },
    });

    registerObject(object);
    loadSchemeImplementation(SchemeTimer);

    const state = SchemeTimer.activate(object, ini, EScheme.SR_TIMER, "sr_timer");

    expect(state.onValue).toEqualLuaTables({
      1: { value: 3000, condlist: parseConditionsList("{+test_info} sr_idle@first, sr_idle@fallback") },
      2: { value: 2000, condlist: parseConditionsList("nil") },
    });
  });

  it.each(["invalid|nil", "1000|nil|2000", "1000||2000|nil"])("should reject malformed thresholds: %s", (on_value) => {
    const object = MockGameObject.mock();
    const ini = MockIniFile.mock("timer-invalid.ltx", { sr_timer: { on_value } });

    registerObject(object);
    loadSchemeImplementation(SchemeTimer);

    expect(() => SchemeTimer.activate(object, ini, EScheme.SR_TIMER, "sr_timer")).toThrow("Invalid on_value");
  });

  it("should correctly activate scheme", () => {
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      "sr_timer@test": {
        type: ETimerType.DECREMENT,
        start_value: 15_000,
        timer_id: "timerId123",
        string: "label",
        on_value:
          "0 | sr_idle@end {!squad_exist(zat_b38_bloodsuckers_sleepers)} " +
          "%+zat_b57_gas_running_stop +zat_b57_den_of_the_bloodsucker_tell_stalkers_about_destroy_lair_give%",
      },
      "sr_timer@missing_start": {
        type: ETimerType.DECREMENT,
        timer_id: "timerId123",
        string: "label",
        on_value:
          "0 | sr_idle@end {!squad_exist(zat_b38_bloodsuckers_sleepers)} " +
          "%+zat_b57_gas_running_stop +zat_b57_den_of_the_bloodsucker_tell_stalkers_about_destroy_lair_give%",
      },
    });

    registerObject(object);
    loadSchemeImplementation(SchemeTimer);

    // Missing start value.
    expect(() => {
      SchemeTimer.activate(object, ini, SchemeTimer.SCHEME_SECTION, `${SchemeTimer.SCHEME_SECTION}@missing_start`);
    }).toThrow();

    const state: ISchemeTimerState = SchemeTimer.activate(
      object,
      ini,
      SchemeTimer.SCHEME_SECTION,
      `${SchemeTimer.SCHEME_SECTION}@test`
    );

    expect(state.ini).toBe(ini);
    expect(state.scheme).toBe("sr_timer");
    expect(state.section).toBe("sr_timer@test");
    expect(state.logic?.length()).toBe(0);
    expect(state.actions?.length()).toBe(1);

    expect(state.type).toBe(ETimerType.DECREMENT);
    expect(state.startValue).toBe(15_000);
    expect(state.timerId).toBe("timerId123");
    expect(state.string).toBe("label");
    expect(state.onValue).toEqualLuaTables({
      1: {
        condlist: parseConditionsList(
          "sr_idle@end {!squad_exist(zat_b38_bloodsuckers_sleepers)} " +
            "%+zat_b57_gas_running_stop +zat_b57_den_of_the_bloodsucker_tell_stalkers_about_destroy_lair_give%"
        ),
        value: 0,
      },
    });
  });
});
