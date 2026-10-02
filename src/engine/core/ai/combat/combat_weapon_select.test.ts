import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockAlifeObject, MockGameObject } from "xray16/mocks";

import { selectBestStalkerWeapon } from "@/engine/core/ai/combat/combat_weapon_select";
import { getManager, registerSimulator } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { resetRegistry } from "@/fixtures/engine";

describe("selectBestStalkerWeapon", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should fallback to null if no handlers found", () => {
    expect(selectBestStalkerWeapon(MockGameObject.mock(), MockGameObject.mock())).toBeNull();
    expect(selectBestStalkerWeapon(MockGameObject.mock(), null)).toBeNull();
  });

  it("should not emit weapon selection without handlers", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");

    expect(selectBestStalkerWeapon(MockGameObject.mock(), MockGameObject.mock())).toBeNull();
    expect(eventsManager.emitEvent).not.toHaveBeenCalled();
  });

  it("should use weapon from latest event handler", () => {
    const object: GameObject = MockGameObject.mock();
    const weapon: GameObject = MockGameObject.mock();

    const firstBestWeapon: GameObject = MockGameObject.mock();
    const secondBestWeapon: GameObject = MockGameObject.mock();

    MockAlifeObject.mock({
      id: firstBestWeapon.id(),
      parentId: object.id(),
      clsid: clsid.wpn_svd,
    });

    MockAlifeObject.mock({
      id: secondBestWeapon.id(),
      parentId: object.id(),
      clsid: clsid.wpn_ak74,
    });

    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        expect(data).toEqual({ weaponId: null });
        data.weaponId = firstBestWeapon.id();
      }
    );

    eventsManager.registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        expect(data).toEqual({ weaponId: firstBestWeapon.id() });
        data.weaponId = secondBestWeapon.id();
      }
    );

    expect(selectBestStalkerWeapon(object, weapon)).toBe(secondBestWeapon);
  });

  it("should use a weapon with zero object id", () => {
    const object: GameObject = MockGameObject.mock();
    const bestWeapon: GameObject = MockGameObject.mock({ id: 0 });

    MockAlifeObject.mock({
      id: 0,
      parentId: object.id(),
      clsid: clsid.wpn_svd,
    });

    getManager(EventsManager).registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        data.weaponId = 0;
      }
    );

    expect(selectBestStalkerWeapon(object, null)).toBe(bestWeapon);
  });

  it("should fallback when selected weapon server object is unavailable", () => {
    getManager(EventsManager).registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        data.weaponId = 12345;
      }
    );

    expect(selectBestStalkerWeapon(MockGameObject.mock(), null)).toBeNull();
  });

  it("should fallback when selected weapon game object is unavailable", () => {
    const object: GameObject = MockGameObject.mock();

    MockAlifeObject.mock({
      id: 12345,
      parentId: object.id(),
      clsid: clsid.wpn_svd,
    });

    getManager(EventsManager).registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        data.weaponId = 12345;
      }
    );

    expect(selectBestStalkerWeapon(object, null)).toBeNull();
  });

  it("should require weapon ownership to use it", () => {
    const object: GameObject = MockGameObject.mock();
    const weapon: GameObject = MockGameObject.mock();

    const bestWeapon: GameObject = MockGameObject.mock();

    MockAlifeObject.mock({
      id: bestWeapon.id(),
      clsid: clsid.wpn_svd,
    });

    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        data.weaponId = bestWeapon.id();
      }
    );

    expect(selectBestStalkerWeapon(object, weapon)).toBeNull();
  });

  it("should require weapon cls id to use it", () => {
    const object: GameObject = MockGameObject.mock();
    const weapon: GameObject = MockGameObject.mock();

    const bestWeapon: GameObject = MockGameObject.mock();

    MockAlifeObject.mock({
      id: bestWeapon.id(),
      parentId: object.id(),
      clsid: clsid.obj_food,
    });

    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(
      EGameEvent.STALKER_WEAPON_SELECT,
      (_: GameObject, __: GameObject, data: AnyObject) => {
        data.weaponId = bestWeapon.id();
      }
    );

    expect(selectBestStalkerWeapon(object, weapon)).toBeNull();
  });
});
