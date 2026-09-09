import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { registerZone } from "@/engine/core/database";
import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerGuardJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_guard";
import {
  jobPreconditionGuard,
  jobPreconditionGuardFollower,
} from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("should correctly generate stalker guard jobs", () => {
  it("should correctly generate default guard jobs with no collector patrols", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");

    const [jobs, builder] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default guard jobs with test smart", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_guard.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionGuard,
        preconditionParameters: {
          wayName: "test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_guard_1_walk",
        priority: 25,
        type: EJobType.GUARD,
      },
      {
        preconditionFunction: jobPreconditionGuardFollower,
        preconditionParameters: {
          nextDesiredJob: "logic@test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@follower_test_smart_guard_1_walk",
        priority: 24,
        type: EJobType.GUARD_FOLLOWER,
      },
    ]);
  });

  it("should correctly generate default guard jobs with restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_guard.restrictor.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";

    const [jobs, builder] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionGuard,
        preconditionParameters: {
          wayName: "test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_guard_1_walk",
        priority: 25,
        type: EJobType.GUARD,
      },
      {
        preconditionFunction: jobPreconditionGuardFollower,
        preconditionParameters: {
          nextDesiredJob: "logic@test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@follower_test_smart_guard_1_walk",
        priority: 24,
        type: EJobType.GUARD_FOLLOWER,
      },
    ]);
  });

  it("should correctly generate default guard jobs with ignore restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_guard.ignore.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;

    const object: GameObject = MockGameObject.mock({ name: "some_restrictor" });

    registerZone(object);

    jest.spyOn(object, "inside").mockImplementation(() => true);

    const [jobs, builder] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionGuard,
        preconditionParameters: {
          wayName: "test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_guard_1_walk",
        priority: 25,
        type: EJobType.GUARD,
      },
      {
        preconditionFunction: jobPreconditionGuardFollower,
        preconditionParameters: {
          nextDesiredJob: "logic@test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@follower_test_smart_guard_1_walk",
        priority: 24,
        type: EJobType.GUARD_FOLLOWER,
      },
    ]);
  });

  it("should correctly generate default guard jobs with invulnerable state", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_guard.invulnerable.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;
    terrain.safeRestrictor = "safe_restrictor_test";

    const object: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    registerZone(object);

    jest.spyOn(object, "inside").mockImplementation(() => true);

    const [jobs, builder] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionGuard,
        preconditionParameters: {
          wayName: "test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_guard_1_walk",
        priority: 25,
        type: EJobType.GUARD,
      },
      {
        preconditionFunction: jobPreconditionGuardFollower,
        preconditionParameters: {
          nextDesiredJob: "logic@test_smart_guard_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@follower_test_smart_guard_1_walk",
        priority: 24,
        type: EJobType.GUARD_FOLLOWER,
      },
    ]);
  });
});
