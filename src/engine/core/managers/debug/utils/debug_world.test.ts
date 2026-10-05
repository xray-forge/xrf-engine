import { beforeEach, describe, expect, it } from "@jest/globals";
import { clsid } from "xray16";
import { ServerObject } from "xray16/alias";
import { LuaArray } from "xray16/lib";
import { MockAlifeObject, MockAlifeOnlineOfflineGroup, MockAlifeSmartZone } from "xray16/mocks";

import { getManager, registerSimulator, registerStoryLink } from "@/engine/core/database";
import { EDebugWorldView, IDebugSavedPosition, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { buildDebugWorldEntries, getDebugWorldTreasureName } from "@/engine/core/managers/debug/utils/debug_world";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { resetRegistry } from "@/fixtures/engine";

/**
 * @param entries - World rows.
 * @returns Their labels, in order.
 */
function getLabels(entries: LuaArray<IDebugWorldEntry>): Array<string> {
  const labels: Array<string> = [];

  for (const index of $range(1, entries.length())) {
    labels.push(entries.get(index).label);
  }

  return labels;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
});

describe("buildDebugWorldEntries", () => {
  it("should list smart terrains and squads by kind", () => {
    const terrain: ServerObject = MockAlifeSmartZone.create({ name: "test_smart", clsid: clsid.smart_terrain });
    const squad: ServerObject = MockAlifeOnlineOfflineGroup.mock({ name: "test_squad" });

    const terrains: LuaArray<IDebugWorldEntry> = buildDebugWorldEntries(EDebugWorldView.SMART_TERRAINS, new LuaTable());
    const squads: LuaArray<IDebugWorldEntry> = buildDebugWorldEntries(EDebugWorldView.SQUADS, new LuaTable());

    expect(getLabels(terrains).some((it) => it.startsWith("test_smart"))).toBe(true);
    expect(getLabels(terrains).some((it) => it.startsWith("test_squad"))).toBe(false);
    expect(getLabels(squads).some((it) => it.startsWith("test_squad"))).toBe(true);

    for (const index of $range(1, terrains.length())) {
      if (terrains.get(index).id === terrain.id) {
        expect(terrains.get(index)).toMatchObject({
          id: terrain.id,
          savedIndex: null,
          position: terrain.position,
          levelVertexId: terrain.m_level_vertex_id,
          gameVertexId: terrain.m_game_vertex_id,
        });
      }
    }

    expect(squads.get(squads.length()).id).toBe(squad.id);
  });

  it("should list story objects by story id", () => {
    const object: ServerObject = MockAlifeObject.mock({ name: "test_story_object" });

    registerStoryLink(object.id, "test_story_id");

    expect(getLabels(buildDebugWorldEntries(EDebugWorldView.STORY_OBJECTS, new LuaTable()))[0]).toMatch(
      /^test_story_id \(/
    );
  });

  it("should list saved positions in the order they were saved", () => {
    const saved: LuaArray<IDebugSavedPosition> = new LuaTable();

    saved.set(1, { name: "b", level: "zaton", x: 1, y: 2, z: 3, levelVertexId: 10, gameVertexId: 20 });
    saved.set(2, { name: "a", level: "jupiter", x: 4, y: 5, z: 6, levelVertexId: 11, gameVertexId: 21 });

    const entries: LuaArray<IDebugWorldEntry> = buildDebugWorldEntries(EDebugWorldView.POSITIONS, saved);

    expect(getLabels(entries)).toEqual(["b (zaton)", "a (jupiter)"]);
    expect(entries.get(2)).toMatchObject({ id: null, savedIndex: 2, levelVertexId: 11, gameVertexId: 21 });
    expect(entries.get(2).position.x).toBe(4);
  });

  it("should list treasures by name", () => {
    const restrictor: ServerObject = MockAlifeObject.mock({ name: "test_restrictor" });

    getManager(TreasureManager).treasuresRestrictorByName.set("test_treasure", restrictor.id);

    const entries: LuaArray<IDebugWorldEntry> = buildDebugWorldEntries(EDebugWorldView.TREASURES, new LuaTable());

    expect(getLabels(entries)[0]).toMatch(/^test_treasure /);
    expect(getDebugWorldTreasureName(entries.get(1))).toBe("test_treasure");
  });
});

describe("getDebugWorldTreasureName", () => {
  it("should name only treasure rows", () => {
    expect(
      getDebugWorldTreasureName({
        id: null,
        savedIndex: 1,
        label: "",
        search: "",
        position: MockAlifeObject.mock().position,
        levelVertexId: 1,
        gameVertexId: 1,
      })
    ).toBeNull();
  });
});
