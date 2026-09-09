import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { registerZone } from "@/engine/core/database";
import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerCollectorJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_collector";
import { jobPreconditionCollector } from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("should correctly generate stalker collector jobs", () => {
  it("should correctly generate default collector jobs with no collector patrols", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("smart_empty");
    const [jobs, builder] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default collector jobs with test smart", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_collector.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionCollector,
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_collector_1_walk",
        priority: 25,
        type: EJobType.COLLECTOR,
      },
    ]);
  });

  it("should correctly generate default collector jobs with restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_collector.restrictor.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";

    const [jobs, builder] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionCollector,
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_collector_1_walk",
        priority: 25,
        type: EJobType.COLLECTOR,
      },
    ]);
  });

  it("should correctly generate default collector jobs with ignore restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_collector.ignore.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;

    const object: GameObject = MockGameObject.mock({ name: "some_restrictor" });

    jest.spyOn(object, "inside").mockImplementation(() => true);

    registerZone(object);

    const [jobs, builder] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionCollector,
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_collector_1_walk",
        priority: 25,
        type: EJobType.COLLECTOR,
      },
    ]);
  });

  it("should correctly generate default collector jobs with invulnerable state", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_collector.invulnerable.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "some_restrictor" } as SmartTerrainControl;
    terrain.safeRestrictor = "safe_restrictor_test";

    const object: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    jest.spyOn(object, "inside").mockImplementation(() => true);

    registerZone(object);

    const [jobs, builder] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionCollector,
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_collector_1_walk",
        priority: 25,
        type: EJobType.COLLECTOR,
      },
    ]);
  });
});
