import { describe, expect, it } from "@jest/globals";
import { range } from "xray16/lib";

import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType } from "@/engine/core/objects/smart_terrain/job";
import { createMonsterJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_monster";
import { StringBuilder } from "@/engine/core/utils/string";
import { MockSmartTerrain, readInGameTestLtxFromTest, trimInGameTestLtxFromTest } from "@/fixtures/engine";

describe("jobs_general should correctly generate monster default jobs", () => {
  it("should correctly generate default jobs for monsters", async () => {
    const monsterJobsLtx: string = trimInGameTestLtxFromTest(
      await readInGameTestLtxFromTest("__test__", "job_create_monster.default.ltx")
    );

    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const [jobs, builder] = createMonsterJobs(terrain, new LuaTable(), new StringBuilder());

    expect(builder.build()).toBe(monsterJobsLtx);
    expect(jobs).toEqualLuaArrays(
      range(20, 1).map((it) => ({
        type: EJobType.MONSTER_HOME,
        isMonsterJob: true,
        pathType: EJobPathType.POINT,
        section: "logic@test_smart_home_" + it,
        priority: 40,
      }))
    );
  });
});
