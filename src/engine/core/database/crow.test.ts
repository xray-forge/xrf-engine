import { describe, expect, it } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { markCrowDead, registerCrow, unregisterCrow } from "@/engine/core/database/crow";
import { IRegistryObjectState } from "@/engine/core/database/database_types";
import { registry } from "@/engine/core/database/registry";

describe("registerCrow and unregisterCrow", () => {
  it("should correctly register and unregister crow objects", () => {
    const first: GameObject = MockGameObject.mock();
    const second: GameObject = MockGameObject.mock();

    const firstState: IRegistryObjectState = registerCrow(first);

    expect(registry.crows.count).toBe(1);
    expect(registry.crows.storage.length()).toBe(1);
    expect(registry.crows.storage.get(first.id())).toBe(first.id());
    expect(firstState).toBe(registry.objects.get(first.id()));

    const duplicateFirstState: IRegistryObjectState = registerCrow(first);

    expect(registry.crows.count).toBe(1);
    expect(registry.crows.storage.length()).toBe(1);
    expect(duplicateFirstState).toBe(firstState);

    const secondState: IRegistryObjectState = registerCrow(second);

    expect(registry.crows.count).toBe(2);
    expect(registry.crows.storage.length()).toBe(2);
    expect(registry.crows.storage.get(second.id())).toBe(second.id());
    expect(secondState).toBe(registry.objects.get(second.id()));

    unregisterCrow(first);

    expect(registry.crows.count).toBe(1);
    expect(registry.crows.storage.length()).toBe(1);
    expect(registry.objects.length()).toBe(1);

    unregisterCrow(first);

    expect(registry.crows.count).toBe(1);
    expect(registry.crows.storage.length()).toBe(1);
    expect(registry.objects.length()).toBe(1);

    unregisterCrow(first);
    unregisterCrow(second);

    expect(registry.crows.count).toBe(0);
    expect(registry.crows.storage.length()).toBe(0);
    expect(registry.objects.length()).toBe(0);
  });
});

describe("markCrowDead", () => {
  it("should stop counting a crow and keep its object state", () => {
    const object: GameObject = MockGameObject.mock();

    registerCrow(object);
    markCrowDead(object);
    markCrowDead(object);

    expect(registry.crows.count).toBe(0);
    expect(registry.crows.storage.length()).toBe(0);
    expect(registry.objects.get(object.id())).toBeDefined();

    unregisterCrow(object);

    expect(registry.crows.count).toBe(0);
    expect(registry.objects.length()).toBe(0);
  });
});
