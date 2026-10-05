import { describe, expect, it } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { MockGameObject, MockIniFile } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { IDynamicObjectState, IRegistryObjectState } from "@/engine/core/database/database_types";
import {
  getGameObjectById,
  getObjectDynamicState,
  registerObject,
  registerObjectDynamicState,
  resetObject,
  unregisterObject,
  unregisterObjectDynamicState,
} from "@/engine/core/database/objects";
import { registry } from "@/engine/core/database/registry";

describe("registerObject, resetObject, and unregisterObject", () => {
  it("should correctly manage objects", () => {
    const object: GameObject = MockGameObject.mock();
    const mockIni: MockIniFile<{ a: number }> = new MockIniFile("test.ltx", { a: 1 });
    const state: IRegistryObjectState = registerObject(object);

    state.ini = mockIni.asMock();
    expect(registry.objects.get(object.id())).toEqual({ object, ini: mockIni });

    resetObject(object);
    expect(registry.objects.get(object.id())).toEqual({ object });

    unregisterObject(object);
    expect(registry.objects.get(object.id())).toBeNull();
  });
});

describe("getGameObjectById", () => {
  it("should find registered and unregistered online objects", () => {
    const registered: GameObject = MockGameObject.mock();
    const unregistered: GameObject = MockGameObject.mock();

    registerObject(registered);
    replaceFunctionMock(level.object_by_id, (id: number) => (id === unregistered.id() ? unregistered : null));

    expect(getGameObjectById(null)).toBeNull();
    expect(getGameObjectById(registered.id())).toBe(registered);
    expect(getGameObjectById(unregistered.id())).toBe(unregistered);
    expect(getGameObjectById(60_000)).toBeNull();

    unregisterObject(registered);
    resetFunctionMock(level.object_by_id);
  });
});

describe("object dynamic-state utilities", () => {
  it("should correctly register, get, and unregister dynamic state", () => {
    const object: GameObject = MockGameObject.mock();
    const state: IDynamicObjectState = registerObjectDynamicState(object.id());

    expect(registry.dynamicData.objects.get(object.id())).toEqual({});
    expect(registry.dynamicData.objects.get(object.id())).toBe(state);
    expect(getObjectDynamicState(object.id())).toBe(state);

    unregisterObjectDynamicState(object.id());
    expect(getObjectDynamicState(object.id())).toBeNull();
    expect(registry.dynamicData.objects.get(object.id())).toBeNull();

    expect(getObjectDynamicState(object.id(), true)).toEqual({});
  });
});
