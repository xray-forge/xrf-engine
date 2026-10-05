import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerHumanObject } from "xray16/alias";
import { AnyObject, createTime, StringBuilder, TNumberId, TSection } from "xray16/lib";
import { MockAlifeHumanStalker, MockGameObject } from "xray16/mocks";

import { registerObject, registerSmartCover, registerZone } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SmartCover } from "@/engine/core/objects/smart_cover";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { createStalkerAnimpointJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_animpoint";
import { createStalkerCamperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_camper";
import { createStalkerCollectorJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_collector";
import { createStalkerGuardJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_guard";
import { createStalkerPatrolJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_patrol";
import { createStalkerSleepJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sleep";
import { createStalkerSniperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sniper";
import { createStalkerWalkerJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_walker";
import {
  jobPreconditionAnimpoint,
  jobPreconditionCamper,
  jobPreconditionCollector,
  jobPreconditionExclusive,
  jobPreconditionGuard,
  jobPreconditionGuardFollower,
  jobPreconditionPatrol,
  jobPreconditionSleep,
  jobPreconditionSniper,
  jobPreconditionSurge,
  jobPreconditionWalker,
} from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { IObjectJobState } from "@/engine/core/objects/smart_terrain/job/job_types";
import { MockSmartCover, MockSmartTerrain, resetRegistry } from "@/fixtures/engine";

describe("job_precondition utilities", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("jobPreconditionWalker should correctly check", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionWalker(stalker, terrain, parameters)).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "zombied");
    expect(jobPreconditionWalker(stalker, terrain, parameters)).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "stalker");
    terrain.alarmStartedAt = createTime(1, 2, 3, 4, 5, 6, 7);
    expect(jobPreconditionWalker(stalker, terrain, parameters)).toBe(true);

    terrain.safeRestrictor = "safe_restrictor_test";
    expect(jobPreconditionWalker(stalker, terrain, parameters)).toBe(true);

    expect(jobPreconditionWalker(stalker, terrain, parameters)).toBe(true);
    expect(jobPreconditionWalker(stalker, terrain, { ...parameters, isSafeJob: false })).toBe(false);

    const first: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });
    const second: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    jest.spyOn(first, "inside").mockImplementation(() => false);
    jest.spyOn(second, "inside").mockImplementation(() => true);

    registerZone(first);
    expect(jobPreconditionWalker(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(false);

    registerZone(second);
    expect(jobPreconditionWalker(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);
  });

  it("jobPreconditionSurge should correctly check with", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerWalkerJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    surgeConfig.IS_STARTED = true;
    expect(jobPreconditionSurge(stalker, terrain, parameters)).toBe(true);

    surgeConfig.IS_STARTED = false;
    expect(jobPreconditionSurge(stalker, terrain, parameters)).toBe(false);
  });

  it("jobPreconditionSniper should correctly check sniper jobs preconditions with", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerSniperJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionSniper(stalker, terrain, parameters)).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "zombied");
    expect(jobPreconditionSniper(stalker, terrain, parameters)).toBe(false);

    jest.spyOn(stalker, "community").mockImplementation(() => "stalker");
    expect(jobPreconditionSniper(stalker, terrain, parameters)).toBe(true);
  });

  it("jobPreconditionAnimpoint should correctly check animpoint preconditions", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const cover: SmartCover = MockSmartCover.mock("test_smart_animpoint_1");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    registerSmartCover(cover);

    const [jobs] = createStalkerAnimpointJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionAnimpoint(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "zombied");
    expect(jobPreconditionAnimpoint(stalker, terrain, parameters)).toBe(false);

    jest.spyOn(stalker, "community").mockImplementation(() => "stalker");
    expect(jobPreconditionAnimpoint(stalker, terrain, parameters)).toBe(true);
  });

  it("jobPreconditionCamper should correctly check camper jobs preconditions", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerCamperJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionCamper(stalker, terrain, parameters)).toBe(true);
  });

  it("jobPreconditionCollector should correctly check collector jobs preconditions", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerCollectorJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionCollector(stalker, terrain, parameters)).toBe(false);

    const object: GameObject = MockGameObject.mock({
      id: stalker.id,
    });

    jest.spyOn(object, "object").mockImplementation((section: TSection | TNumberId) => {
      return section === "detector_elite" ? MockGameObject.mock() : null;
    });

    registerObject(object);

    expect(jobPreconditionCollector(stalker, terrain, parameters)).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "zombied");
    expect(jobPreconditionCollector(stalker, terrain, parameters)).toBe(false);
  });

  it("parameters should correctly check guard jobs preconditions", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionGuard(stalker, terrain, parameters)).toBe(true);

    terrain.alarmStartedAt = createTime(1, 2, 3, 4, 5, 6, 7);
    expect(jobPreconditionGuard(stalker, terrain, parameters)).toBe(true);

    terrain.safeRestrictor = "safe_restrictor_test";
    expect(jobPreconditionGuard(stalker, terrain, parameters)).toBe(true);

    expect(jobPreconditionGuard(stalker, terrain, parameters)).toBe(true);
    expect(jobPreconditionGuard(stalker, terrain, { ...parameters, isSafeJob: false })).toBe(false);

    const first: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });
    const second: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    jest.spyOn(first, "inside").mockImplementation(() => true);
    jest.spyOn(second, "inside").mockImplementation(() => false);

    registerZone(first);
    expect(jobPreconditionGuard(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);

    registerZone(second);
    expect(jobPreconditionGuard(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(false);
  });

  it("jobPreconditionGuardFollower should correctly check guard follower jobs preconditions", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerGuardJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(2).preconditionParameters as AnyObject;

    expect(jobPreconditionGuardFollower(stalker, terrain, parameters, {} as IObjectJobState)).toBe(false);
    expect(
      jobPreconditionGuardFollower(stalker, terrain, parameters, {
        desiredJob: "logic@test_smart_guard_1_walk",
      } as IObjectJobState)
    ).toBe(true);
    expect(
      jobPreconditionGuardFollower(stalker, terrain, { ...parameters, nextDesiredJob: "1" }, {} as IObjectJobState)
    ).toBe(false);
    expect(
      jobPreconditionGuardFollower(stalker, terrain, { ...parameters, nextDesiredJob: "1" }, {
        desiredJob: "2",
      } as IObjectJobState)
    ).toBe(false);
    expect(
      jobPreconditionGuardFollower(stalker, terrain, { ...parameters, nextDesiredJob: "3" }, {
        desiredJob: "3",
      } as IObjectJobState)
    ).toBe(true);
  });

  it("jobPreconditionPatrol should correctly check patrol jobs preconditions", async () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerPatrolJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionPatrol(stalker, terrain, {})).toBe(true);

    terrain.alarmStartedAt = createTime(1, 2, 3, 4, 5, 6, 7);
    expect(jobPreconditionPatrol(stalker, terrain, parameters)).toBe(true);

    terrain.safeRestrictor = "safe_restrictor_test";
    expect(jobPreconditionPatrol(stalker, terrain, parameters)).toBe(true);

    expect(jobPreconditionPatrol(stalker, terrain, parameters)).toBe(true);
    expect(jobPreconditionPatrol(stalker, terrain, { ...parameters, isSafeJob: false })).toBe(false);

    const first: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });
    const second: GameObject = MockGameObject.mock({ name: "safe_restrictor_test" });

    jest.spyOn(first, "inside").mockImplementation(() => false);
    jest.spyOn(second, "inside").mockImplementation(() => true);

    registerZone(first);
    expect(jobPreconditionPatrol(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(false);

    registerZone(second);
    expect(jobPreconditionPatrol(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);
  });

  it("jobPreconditionSleep should correctly use sleep preconditions", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    const [jobs] = createStalkerSleepJobs(terrain, new LuaTable(), new StringBuilder());
    const parameters: AnyObject = jobs.get(1).preconditionParameters as AnyObject;

    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 23);
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);

    jest.spyOn(stalker, "community").mockImplementation(() => "zombied");
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: true })).toBe(false);

    jest.spyOn(stalker, "community").mockImplementation(() => "stalker");
    terrain.alarmStartedAt = createTime(2014, 2, 3, 4, 20, 30, 400);
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);

    terrain.safeRestrictor = "sleep_test_restrictor";

    const first: GameObject = MockGameObject.mock({ name: "sleep_test_restrictor" });
    const second: GameObject = MockGameObject.mock({ name: "sleep_test_restrictor" });

    jest.spyOn(first, "inside").mockImplementation(() => true);
    jest.spyOn(second, "inside").mockImplementation(() => false);

    registerZone(first);
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(true);

    registerZone(second);
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: null })).toBe(false);

    terrain.safeRestrictor = "another_sleep_test_restrictor";
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: true })).toBe(true);
    expect(jobPreconditionSleep(stalker, terrain, { ...parameters, isSafeJob: false })).toBe(false);
  });

  it("jobPreconditionExclusive should correctly use condlist preconditions", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    expect(jobPreconditionExclusive(stalker, terrain, { condlist: parseConditionsList("true") })).toBe(true);
    expect(jobPreconditionExclusive(stalker, terrain, { condlist: parseConditionsList("false") })).toBe(false);
    expect(
      jobPreconditionExclusive(stalker, terrain, { condlist: parseConditionsList("{-some_info} true, false") })
    ).toBe(true);
  });
});
