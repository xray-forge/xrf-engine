import { describe, expect, it } from "@jest/globals";
import { range } from "xray16/lib";

import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerPointJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_point";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("should correctly generate stalkers point jobs", () => {
  it("should correctly generate point jobs for stalkers with empty smarts", async () => {
    const pointJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_point.empty.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");
    const [jobs, builder] = createStalkerPointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(pointJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(20, 1).map((it) => ({
        isMonsterJob: false,
        pathType: EJobPathType.POINT,
        section: "logic@empty_smart_point_" + it,
        type: EJobType.POINT,
        priority: 3,
      }))
    );
  });
  it("should correctly generate point jobs for stalkers", async () => {
    const pointJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_point.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerPointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(pointJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(20, 1).map((it) => ({
        isMonsterJob: false,
        pathType: EJobPathType.POINT,
        section: "logic@test_smart_point_" + it,
        type: EJobType.POINT,
        priority: 3,
      }))
    );
  });

  it("should correctly generate point jobs for stalkers with extended smart terrains", async () => {
    const pointJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_point.restrictors.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "def_restrictor_test";
    terrain.terrainControl = { ignoreZone: "test_ignore_zone" } as SmartTerrainControl;

    const [jobs, builder] = createStalkerPointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(pointJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(20, 1).map((it) => ({
        isMonsterJob: false,
        pathType: EJobPathType.POINT,
        section: "logic@test_smart_point_" + it,
        type: EJobType.POINT,
        priority: 3,
      }))
    );
  });
});
