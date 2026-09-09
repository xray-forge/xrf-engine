import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { range } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";

import { registerZone } from "@/engine/core/database";
import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerSleepJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sleep";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("jobs_general should correctly generate stalkers sleep jobs", () => {
  it("should correctly generate sleep jobs for stalkers when no patrols exist", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");
    const [jobs, builder] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate sleep jobs for stalkers when patrols exist", async () => {
    const surgeJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sleep.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = null;

    const [jobs, builder] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(surgeJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(2, 1).map((it) => ({
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: `test_smart_sleep_${it}`,
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: `logic@test_smart_sleep_${it}`,
        type: EJobType.SLEEP,
        priority: 10,
      }))
    );
  });

  it("should correctly generate sleep jobs for stalkers when patrols exist with restrictors", async () => {
    const surgeJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sleep.restrictors.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "def_restrictor_test";
    terrain.terrainControl = { ignoreZone: "test_ignore_zone" } as SmartTerrainControl;

    const [jobs, builder] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(surgeJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(2, 1).map((it) => ({
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: `test_smart_sleep_${it}`,
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: `logic@test_smart_sleep_${it}`,
        type: EJobType.SLEEP,
        priority: 10,
      }))
    );
  });

  it("should correctly generate sleep jobs for stalkers when patrols exist, when in restrictor", async () => {
    const surgeJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sleep.ignore.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const object: GameObject = MockGameObject.mock({ name: "some_restrictor" });

    registerZone(object);

    jest.spyOn(object, "inside").mockImplementation(() => true);

    terrain.defendRestrictor = "def_restrictor_test";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;

    const [jobs, builder] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(surgeJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(2, 1).map((it) => ({
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: `test_smart_sleep_${it}`,
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: `logic@test_smart_sleep_${it}`,
        type: EJobType.SLEEP,
        priority: 10,
      }))
    );
  });

  it("should correctly generate sleep jobs for stalkers when patrols exist with invulnerable state", async () => {
    const surgeJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sleep.invulnerable.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const object: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    registerZone(object);

    jest.spyOn(object, "inside").mockImplementation(() => true);

    terrain.safeRestrictor = "safe_restrictor_test";
    terrain.terrainControl = { ignoreZone: "test_ignore_zone" } as SmartTerrainControl;

    const [jobs, builder] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(surgeJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(2, 1).map((it) => ({
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: `test_smart_sleep_${it}`,
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: `logic@test_smart_sleep_${it}`,
        type: EJobType.SLEEP,
        priority: 10,
      }))
    );
  });
});
