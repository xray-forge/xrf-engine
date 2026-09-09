import { beforeEach, describe, expect, it } from "@jest/globals";

import { registerSmartCover } from "@/engine/core/database";
import { SmartCover } from "@/engine/core/objects/smart_cover";
import { SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createStalkerAnimpointJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_animpoint";
import { StringBuilder } from "@/engine/core/utils/string";
import {
  MockSmartCover,
  MockSmartTerrain,
  readInGameTestLtxFromTest,
  resetRegistry,
  trimInGameTestLtxFromTest,
} from "@/fixtures/engine";

describe("should correctly generate stalker animpoint jobs", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly generate default animpoint jobs with no smart covers", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("empty_smart");
    const [jobs, builder] = createStalkerAnimpointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe("");
    expect(jobs).toEqualLuaArrays([]);
  });

  it("should correctly generate default animpoint jobs with available smart covers", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_animpoint.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const smartCover: SmartCover = MockSmartCover.mock("test_smart_animpoint_1");

    registerSmartCover(smartCover);

    const [jobs, builder] = createStalkerAnimpointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: expect.any(Function),
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.SMART_COVER,
        section: "logic@test_smart_animpoint_1",
        priority: 15,
        type: EJobType.ANIMPOINT,
      },
    ]);
  });

  it("should correctly generate default animpoint jobs with defend restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_animpoint.restrictor.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const cover: SmartCover = MockSmartCover.mock("test_smart_animpoint_1");

    terrain.defendRestrictor = "test_defend_restrictor";

    registerSmartCover(cover);

    const [jobs, builder] = createStalkerAnimpointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: expect.any(Function),
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.SMART_COVER,
        section: "logic@test_smart_animpoint_1",
        priority: 15,
        type: EJobType.ANIMPOINT,
      },
    ]);
  });

  it("should correctly generate default animpoint jobs with ignore restrictor", async () => {
    const jobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_stalker_animpoint.ignore.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const cover: SmartCover = MockSmartCover.mock("test_smart_animpoint_1");

    terrain.defendRestrictor = "test_defend_restrictor";
    terrain.terrainControl = { ignoreZone: "test_ignore_zone" } as SmartTerrainControl;

    registerSmartCover(cover);

    const [jobs, builder] = createStalkerAnimpointJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(jobsLtx);
    expect(jobs).toEqualLuaArrays([
      {
        preconditionFunction: expect.any(Function),
        preconditionParameters: {},
        isMonsterJob: false,
        pathType: EJobPathType.SMART_COVER,
        section: "logic@test_smart_animpoint_1",
        priority: 15,
        type: EJobType.ANIMPOINT,
      },
    ]);
  });
});
