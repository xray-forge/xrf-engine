import { describe, expect, it } from "@jest/globals";

import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerSniperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sniper";
import { jobPreconditionSniper } from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("jobs_general should correctly generate stalker patrol jobs", () => {
  it("should correctly generate default patrol jobs with no sniper patrols", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");

    const [jobs, builder] = createStalkerSniperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default sniper jobs with test smart", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sniper.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerSniperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionSniper,
        preconditionParameters: {
          wayName: "test_smart_sniper_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_sniper_1_walk",
        type: EJobType.SNIPER,
        priority: 30,
      },
    ]);
  });

  it("should correctly generate default sniper jobs with restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_sniper.restrictor.ltx")
    );
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";

    const [jobs, builder] = createStalkerSniperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: jobPreconditionSniper,
        preconditionParameters: {
          wayName: "test_smart_sniper_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_sniper_1_walk",
        type: EJobType.SNIPER,
        priority: 30,
      },
    ]);
  });
});
