import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { registerZone } from "@/engine/core/database";
import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerWalkerJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_walker";
import { jobPreconditionWalker } from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("jobs_general should correctly generate stalker walker jobs", () => {
  it("should correctly generate default walker jobs with no patrols", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart_without_walker");

    const [jobs, builder] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default walker jobs with test smart", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_walker.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        isMonsterJob: false,
        preconditionFunction: jobPreconditionWalker,
        preconditionParameters: {
          wayName: "test_smart_walker_1_walk",
        },
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_walker_1_walk",
        type: EJobType.WALKER,
        priority: 15,
      },
    ]);
  });

  it("should correctly generate default walker jobs with restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_walker.restrictor.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";

    jest.spyOn(terrain, "name").mockImplementation(() => "test_smart");

    const [jobs, builder] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        isMonsterJob: false,
        preconditionFunction: jobPreconditionWalker,
        preconditionParameters: {
          wayName: "test_smart_walker_1_walk",
        },
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_walker_1_walk",
        type: EJobType.WALKER,
        priority: 15,
      },
    ]);
  });

  it("should correctly generate default walker jobs with ignore restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_walker.ignore.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;

    const object: GameObject = MockGameObject.mock({ name: "some_restrictor" });

    jest.spyOn(object, "inside").mockImplementation(() => true);

    registerZone(object);

    jest.spyOn(terrain, "name").mockImplementation(() => "test_smart");

    const [jobs, builder] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        isMonsterJob: false,
        preconditionFunction: jobPreconditionWalker,
        preconditionParameters: {
          wayName: "test_smart_walker_1_walk",
        },
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_walker_1_walk",
        type: EJobType.WALKER,
        priority: 15,
      },
    ]);
  });

  it("should correctly generate default walker jobs with invulnerable state", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_walker.invulnerable.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;
    terrain.safeRestrictor = "safe_restrictor_test";

    const object: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    jest.spyOn(object, "inside").mockImplementation(() => true);

    registerZone(object);

    jest.spyOn(terrain, "name").mockImplementation(() => "test_smart");

    const [jobs, builder] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        isMonsterJob: false,
        preconditionFunction: jobPreconditionWalker,
        preconditionParameters: {
          wayName: "test_smart_walker_1_walk",
        },
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_walker_1_walk",
        type: EJobType.WALKER,
        priority: 15,
      },
    ]);
  });
});
