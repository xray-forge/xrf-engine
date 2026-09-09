import { describe, expect, it } from "@jest/globals";

import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerCamperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_camper";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("should correctly generate stalker camper jobs", () => {
  it("should correctly generate default camper jobs with no camp patrols", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");
    const [jobs, builder] = createStalkerCamperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default camper jobs with test smart", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_camper.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createStalkerCamperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: "test_smart_camper_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_camper_1_walk",
        priority: 45,
        type: EJobType.CAMPER,
      },
    ]);
  });

  it("should correctly generate default camper jobs with restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_camper.restrictor.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");

    terrain.defendRestrictor = "test_defend_restrictor";

    const [jobs, builder] = createStalkerCamperJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: expect.any(Function),
        preconditionParameters: {
          wayName: "test_smart_camper_1_walk",
        },
        isMonsterJob: false,
        pathType: EJobPathType.PATH,
        section: "logic@test_smart_camper_1_walk",
        priority: 45,
        type: EJobType.CAMPER,
      },
    ]);
  });
});
