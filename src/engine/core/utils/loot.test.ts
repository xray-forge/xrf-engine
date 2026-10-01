import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { LuaArray } from "xray16/lib";
import { MockGameObject, MockVector } from "xray16/mocks";

import { ammo } from "@/engine/constants/items/ammo";
import { weapons } from "@/engine/constants/items/weapons";
import { IRegistryObjectState, registerObject, setPortableStoreValue } from "@/engine/core/database";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { PS_LOOTING_DEAD_OBJECT } from "@/engine/core/schemes/stalker/corpse_detection/corpse_detection_types";
import { getNearestCorpseToLoot, isObjectWithValuableLoot, transferLoot } from "@/engine/core/utils/loot";
import { resetRegistry } from "@/fixtures/engine";

describe("isObjectWithValuableLoot", () => {
  it("should correctly check object valuable loot", () => {
    expect(isObjectWithValuableLoot(MockGameObject.mock())).toBe(false);
    expect(
      isObjectWithValuableLoot(
        MockGameObject.mock({
          inventory: [
            ["grenade_f2", MockGameObject.mock({ section: "grenade_f2" })],
            ["grenade_f3", MockGameObject.mock({ section: "grenade_f3" })],
          ],
        })
      )
    ).toBe(false);
    expect(
      isObjectWithValuableLoot(
        MockGameObject.mock({
          inventory: [
            ["grenade_f2", MockGameObject.mock({ section: "grenade_f2" })],
            [weapons.wpn_ak74u, MockGameObject.mock({ section: weapons.wpn_ak74u })],
          ],
        })
      )
    ).toBe(true);
    expect(
      isObjectWithValuableLoot(
        MockGameObject.mock({
          inventory: [
            [weapons.wpn_ak74u, MockGameObject.mock({ section: weapons.wpn_ak74u })],
            [ammo["ammo_5.45x39_fmj"], MockGameObject.mock({ section: ammo["ammo_5.45x39_fmj"] })],
          ],
        })
      )
    ).toBe(true);
  });
});

describe("transferLoot", () => {
  it("should correctly transfer lootable items", () => {
    const ak74: GameObject = MockGameObject.mock({ section: weapons.wpn_ak74u });
    const akAmmo: GameObject = MockGameObject.mock({ section: ammo["ammo_5.45x39_ap"] });
    const questItem: GameObject = MockGameObject.mock({ section: "secret_quest_container" });
    const from: GameObject = MockGameObject.mock({
      inventory: [
        [ak74.section(), ak74],
        [akAmmo.section(), akAmmo],
        [questItem.section(), questItem],
      ],
    });
    const to: GameObject = MockGameObject.mock();

    const transferred: LuaArray<GameObject> = transferLoot(from, to);

    expect(transferred).toEqualLuaArrays([ak74, akAmmo]);
    expect(from.object(ak74.section())).toBeNull();
    expect(to.object(ak74.section())).toBe(ak74);
    expect(from.object(akAmmo.section())).toBeNull();
    expect(to.object(akAmmo.section())).toBe(akAmmo);
    expect(from.object(questItem.section())).toBe(questItem);
    expect(to.object(questItem.section())).toBeNull();
  });
});

describe("getNearestCorpseToLoot", () => {
  beforeEach(() => {
    resetRegistry();
    deathConfig.RELEASE_OBJECTS_REGISTRY = new LuaTable();
  });

  it("should choose the nearest visible, reachable, unclaimed corpse with valuable loot", () => {
    const seeker: GameObject = MockGameObject.mock({ position: MockVector.create(0, 0, 0) });
    const selected: GameObject = MockGameObject.mock({
      position: MockVector.create(1, 0, 0),
      inventory: [[weapons.wpn_ak74u, MockGameObject.mock({ section: weapons.wpn_ak74u })]],
    });
    const farther: GameObject = MockGameObject.mock({
      position: MockVector.create(2, 0, 0),
      inventory: [[weapons.wpn_ak74u, MockGameObject.mock({ section: weapons.wpn_ak74u })]],
    });
    const claimed: GameObject = MockGameObject.mock({
      position: MockVector.create(0.5, 0, 0),
      inventory: [[weapons.wpn_ak74u, MockGameObject.mock({ section: weapons.wpn_ak74u })]],
    });

    [selected, farther, claimed].forEach((corpse: GameObject) => {
      const state: IRegistryObjectState = registerObject(corpse);

      table.insert(deathConfig.RELEASE_OBJECTS_REGISTRY, corpse.id());
      expect(state.object).toBe(corpse);
    });

    setPortableStoreValue(claimed.id(), PS_LOOTING_DEAD_OBJECT, 999);

    jest.spyOn(seeker, "memory_position").mockImplementation(() => seeker.position());
    jest.spyOn(seeker, "accessible").mockImplementation(() => true);
    jest.spyOn(seeker.position(), "distance_to_sqr").mockImplementation((position: Vector) => {
      return position === selected.position() ? 1 : position === farther.position() ? 4 : 0.25;
    });
    jest.spyOn(level, "vertex_id").mockImplementation(() => 713);

    expect(getNearestCorpseToLoot(seeker)).toEqual([selected, 713, selected.position()]);
  });

  it("should return an empty target when no registered corpse is eligible", () => {
    const seeker: GameObject = MockGameObject.mock();

    expect(getNearestCorpseToLoot(seeker)).toEqual([null, null, null]);
  });
});
