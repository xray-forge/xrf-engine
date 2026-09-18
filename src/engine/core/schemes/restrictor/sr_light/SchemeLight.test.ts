import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, IniFile } from "xray16/alias";
import { MockGameObject, MockIniFile } from "xray16/mocks";

import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { getConfigSwitchConditions } from "@/engine/core/ini";
import { LightController } from "@/engine/core/schemes/restrictor/sr_light/LightController";
import { SchemeLight } from "@/engine/core/schemes/restrictor/sr_light/SchemeLight";
import { ISchemeLightState } from "@/engine/core/schemes/restrictor/sr_light/sr_light_types";
import {
  activateSchemeBySection,
  loadSchemeImplementation,
  switchObjectSchemeToSection,
} from "@/engine/core/schemes/runtime";
import { getSchemeStateOptimistic } from "@/engine/core/schemes/state";
import { EScheme, ESchemeType } from "@/engine/core/schemes/types";
import {
  assertSchemeSubscribedToController,
  getSchemeAction,
  mockRegisteredActor,
  mockSchemeState,
  resetRegistry,
} from "@/fixtures/engine";

describe("SchemeLight", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should be correctly defined", () => {
    expect(SchemeLight.SCHEME_SECTION).toBe("sr_light");
    expect(SchemeLight.SCHEME_SECTION).toBe(EScheme.SR_LIGHT);
    expect(SchemeLight.SCHEME_TYPE).toBe(ESchemeType.RESTRICTOR);
  });

  it("should correctly activate scheme with defaults", () => {
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      "sr_light@test": {
        on_info: "{=actor_in_zone(zat_b42_warning_space_restrictor)} sr_another@1",
        on_info1: "{=actor_in_zone(zat_b42_warning_space_restrictor)} sr_another@2",
      },
    });

    registerObject(object);
    loadSchemeImplementation(SchemeLight);

    const state: ISchemeLightState = SchemeLight.activate(
      object,
      ini,
      SchemeLight.SCHEME_SECTION,
      `${SchemeLight.SCHEME_SECTION}@test`
    );

    expect(state.ini).toBe(ini);
    expect(state.scheme).toBe("sr_light");
    expect(state.section).toBe("sr_light@test");
    expect(state.logic?.length()).toBe(2);
    expect(state.logic).toEqualLuaTables(getConfigSwitchConditions(ini, "sr_light@test"));
    expect(state.actions?.length()).toBe(1);
    expect(state.light).toBe(false);

    assertSchemeSubscribedToController(state, LightController);
  });

  it("should correctly activate scheme with custom values", () => {
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      "sr_light@test": {
        light_on: true,
      },
    });

    registerObject(object);
    loadSchemeImplementation(SchemeLight);

    const state: ISchemeLightState = SchemeLight.activate(
      object,
      ini,
      SchemeLight.SCHEME_SECTION,
      `${SchemeLight.SCHEME_SECTION}@test`
    );

    expect(state.ini).toBe(ini);
    expect(state.scheme).toBe("sr_light");
    expect(state.section).toBe("sr_light@test");
    expect(state.light).toBe(true);
  });

  it("should correctly reset scheme", () => {
    const first: LightController = new LightController(MockGameObject.mock(), mockSchemeState(EScheme.SR_LIGHT));
    const second: LightController = new LightController(MockGameObject.mock(), mockSchemeState(EScheme.SR_LIGHT));

    expect(registry.lightZones.length()).toBe(0);

    first.activate();
    second.activate();

    expect(registry.lightZones.length()).toBe(2);

    SchemeLight.reset();

    expect(registry.lightZones.length()).toBe(0);
  });

  it("should preserve light registration across section switches and remove it on deactivation", () => {
    mockRegisteredActor();

    const object: GameObject = MockGameObject.mock();
    const objectState: IRegistryObjectState = registerObject(object);
    const ini: IniFile = MockIniFile.mock("test.ltx", {
      "sr_light@first": { light_on: true, on_info: "sr_light@second" },
      "sr_light@second": { light_on: false },
    });

    objectState.schemeType = ESchemeType.RESTRICTOR;
    loadSchemeImplementation(SchemeLight);
    jest.spyOn(object, "inside").mockReturnValue(true);
    activateSchemeBySection(object, ini, "sr_light@first", null, false);

    const state: ISchemeLightState = getSchemeStateOptimistic(objectState, EScheme.SR_LIGHT);
    const controller: LightController = getSchemeAction(state);

    controller.update();

    expect(objectState.activeSection).toBe("sr_light@second");
    expect(registry.lightZones.get(object.id())).toBe(controller);

    controller.update();

    expect(controller.checkStalker(MockGameObject.mock())).toEqual([false, true]);
    expect(registry.lightZones.get(object.id())).toBe(controller);

    switchObjectSchemeToSection(object, ini, "nil");

    expect(controller.active).toBe(false);
    expect(registry.lightZones.has(object.id())).toBe(false);
    expect(controller.checkStalker(MockGameObject.mock())).toEqual([false, false]);
  });
});
