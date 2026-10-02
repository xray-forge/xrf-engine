import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { IMockGameObjectConfig, MockGameObject, MockIniFile } from "xray16/mocks";

import { ObjectRestrictionsController } from "@/engine/core/ai/restriction";
import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";

/**
 * @param config - Object configuration.
 * @returns Object whose own restrictors are all it has, as a mock carries no level defaults.
 */
function mockRestrictedObject(config: IMockGameObjectConfig = {}): GameObject {
  const object: GameObject = MockGameObject.mock(config);

  jest.mocked(object.base_in_restrictions).mockImplementation(() => object.in_restrictions());
  jest.mocked(object.base_out_restrictions).mockImplementation(() => object.out_restrictions());

  return object;
}

describe("ObjectRestrictionsController", () => {
  it("caches one controller and captures the initial restrictors", () => {
    const object: GameObject = mockRestrictedObject({
      inRestrictions: "base-in-a, base-in-b",
      outRestrictions: "base-out-a, base-out-b",
    });

    registerObject(object);

    const first: ObjectRestrictionsController = ObjectRestrictionsController.getOrCreateForObject(object);
    const second: ObjectRestrictionsController = ObjectRestrictionsController.getOrCreateForObject(object);

    expect(second).toBe(first);
    expect(registry.objects.get(object.id()).restrictionsController).toBe(first);
    expect(first.baseInRestrictions.length()).toBe(2);
    expect(first.baseInRestrictions.has("base-in-a")).toBeTruthy();
    expect(first.baseInRestrictions.has("base-in-b")).toBeTruthy();
    expect(first.baseOutRestrictions.length()).toBe(2);
    expect(first.baseOutRestrictions.has("base-out-a")).toBeTruthy();
    expect(first.baseOutRestrictions.has("base-out-b")).toBeTruthy();
  });

  it("replaces dynamic in and out restrictors while preserving the initial ones", () => {
    const object: GameObject = mockRestrictedObject({
      inRestrictions: "base-in",
      outRestrictions: "base-out",
    });
    const state: IRegistryObjectState = registerObject(object);

    state.ini = MockIniFile.mock("test.ltx", {
      "restrictor@first": {
        in_restr: "first-in",
        out_restr: "first-out",
      },
      "restrictor@second": {
        in_restr: "second-in",
        out_restr: "second-out",
      },
    });

    const controller: ObjectRestrictionsController = ObjectRestrictionsController.syncForObject(
      object,
      "restrictor@first"
    );

    controller.sync("restrictor@second");

    expect(object.in_restrictions()).toBe("base-in,second-in");
    expect(object.out_restrictions()).toBe("base-out,second-out");
  });

  it("removes dynamic restrictors when the next section omits both fields", () => {
    const object: GameObject = mockRestrictedObject({
      inRestrictions: "base-in",
      outRestrictions: "base-out",
    });
    const state: IRegistryObjectState = registerObject(object);

    state.ini = MockIniFile.mock("test.ltx", {
      "restrictor@active": {
        in_restr: "dynamic-in",
        out_restr: "dynamic-out",
      },
      "restrictor@empty": {},
    });

    const controller: ObjectRestrictionsController = ObjectRestrictionsController.syncForObject(
      object,
      "restrictor@active"
    );

    controller.sync("restrictor@empty");

    expect(object.in_restrictions()).toBe("base-in");
    expect(object.out_restrictions()).toBe("base-out");
  });

  it("does not call the engine when synchronization is already satisfied", () => {
    const object: GameObject = mockRestrictedObject();
    const state: IRegistryObjectState = registerObject(object);

    state.ini = MockIniFile.mock("test.ltx", {
      "restrictor@active": {
        in_restr: "dynamic-in",
        out_restr: "dynamic-out",
      },
    });

    const controller: ObjectRestrictionsController = ObjectRestrictionsController.syncForObject(
      object,
      "restrictor@active"
    );
    const addRestrictions = jest.spyOn(object, "add_restrictions");
    const removeRestrictions = jest.spyOn(object, "remove_restrictions");

    addRestrictions.mockClear();
    removeRestrictions.mockClear();
    controller.sync("restrictor@active");

    expect(addRestrictions).not.toHaveBeenCalled();
    expect(removeRestrictions).not.toHaveBeenCalled();
  });

  it("ignores literal nil restrictors", () => {
    const object: GameObject = mockRestrictedObject({
      inRestrictions: "base-in",
      outRestrictions: "base-out",
    });
    const state: IRegistryObjectState = registerObject(object);

    state.ini = MockIniFile.mock("test.ltx", {
      "restrictor@nil": {
        in_restr: "nil",
        out_restr: "nil",
      },
    });

    ObjectRestrictionsController.syncForObject(object, "restrictor@nil");

    expect(object.in_restrictions()).toBe("base-in");
    expect(object.out_restrictions()).toBe("base-out");
  });

  it("leaves the level default restrictors to the engine", () => {
    const object: GameObject = MockGameObject.mock({ inRestrictions: "own-in,level-default", outRestrictions: "" });
    const state: IRegistryObjectState = registerObject(object);

    jest.mocked(object.base_in_restrictions).mockReturnValue("own-in");
    jest.mocked(object.base_out_restrictions).mockReturnValue("");
    state.ini = MockIniFile.mock("test.ltx", { "walker@test": {} });

    const controller: ObjectRestrictionsController = ObjectRestrictionsController.syncForObject(object, "walker@test");

    expect(controller.baseInRestrictions.has("level-default")).toBeFalsy();
    expect(object.remove_restrictions).not.toHaveBeenCalled();
    expect(object.add_restrictions).not.toHaveBeenCalled();
  });
});
