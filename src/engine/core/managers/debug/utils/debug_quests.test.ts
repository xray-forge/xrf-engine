import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { task } from "xray16";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { infoPortions } from "@/engine/constants/info_portions";
import { getManager, registry } from "@/engine/core/database";
import { IDebugQuestEntry } from "@/engine/core/managers/debug/debug_types";
import {
  buildDebugInfoPortionEntries,
  buildDebugTaskEntries,
  finishDebugTask,
  getDebugTaskState,
  getDebugTaskTargetId,
  giveDebugTask,
  setDebugInfoPortion,
} from "@/engine/core/managers/debug/utils/debug_quests";
import { taskConfig, TaskManager, TaskObject } from "@/engine/core/managers/tasks";
import { disableInfoPortion, giveInfoPortion } from "@/engine/core/utils/info_portion";
import { getTableKeys } from "@/engine/core/utils/table";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/info_portion", () => ({
  ...(jest.requireActual("@/engine/core/utils/info_portion") as object),
  disableInfoPortion: jest.fn(),
  giveInfoPortion: jest.fn(),
}));

const taskId: string = getTableKeys(taskConfig.AVAILABLE_TASKS).get(1);

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  taskConfig.ACTIVE_TASKS = new LuaTable();
});

describe("getDebugTaskState", () => {
  it("should tell active, finished and not given tasks apart", () => {
    jest.spyOn(registry.actor, "get_task").mockImplementation(() => null);

    expect(getDebugTaskState(taskId)).toBe("not given");

    jest.spyOn(registry.actor, "get_task").mockImplementation(() => ({}) as never);

    expect(getDebugTaskState(taskId)).toBe("finished");

    taskConfig.ACTIVE_TASKS.set(taskId, {} as TaskObject);

    expect(getDebugTaskState(taskId)).toBe("active");
  });
});

describe("buildDebugTaskEntries", () => {
  it("should list every configured task with its state", () => {
    jest.spyOn(registry.actor, "get_task").mockImplementation(() => null);

    const entries: LuaArray<IDebugQuestEntry> = buildDebugTaskEntries();

    expect(entries.length()).toBe(taskConfig.AVAILABLE_TASKS.length());
    expect(entries.get(1).label).toMatch(/ - not given$/);
  });
});

describe("giveDebugTask", () => {
  it("should give tasks not active yet", () => {
    jest.spyOn(getManager(TaskManager), "giveTask").mockImplementation(jest.fn());

    expect(giveDebugTask(taskId)).toBe(`gave ${taskId}`);

    taskConfig.ACTIVE_TASKS.set(taskId, {} as TaskObject);

    expect(giveDebugTask(taskId)).toBe(`${taskId} is already active`);
    expect(getManager(TaskManager).giveTask).toHaveBeenCalledTimes(1);
  });
});

describe("finishDebugTask", () => {
  it("should complete and fail active tasks only", () => {
    expect(finishDebugTask(taskId, true)).toBe(`${taskId} is not active`);

    taskConfig.ACTIVE_TASKS.set(taskId, {} as TaskObject);

    expect(finishDebugTask(taskId, true)).toBe(`completed ${taskId}`);
    expect(registry.actor.set_task_state).toHaveBeenCalledWith(task.completed, taskId);

    expect(finishDebugTask(taskId, false)).toBe(`failed ${taskId}`);
    expect(registry.actor.set_task_state).toHaveBeenCalledWith(task.fail, taskId);
  });
});

describe("getDebugTaskTargetId", () => {
  it("should read the target of active tasks", () => {
    expect(getDebugTaskTargetId(taskId)).toBeNull();

    taskConfig.ACTIVE_TASKS.set(taskId, { currentTargetId: 15 } as TaskObject);

    expect(getDebugTaskTargetId(taskId)).toBe(15);
  });
});

describe("buildDebugInfoPortionEntries", () => {
  it("should list recently changed portions first, then the rest once each by name", () => {
    const recent: string = infoPortions.zat_b7_raider_plan;
    const entries: LuaArray<IDebugQuestEntry> = buildDebugInfoPortionEntries($fromArray([recent]));
    const keys: Array<string> = [];

    for (const index of $range(1, entries.length())) {
      keys.push(entries.get(index).key);
    }

    expect(keys[0]).toBe(recent);
    expect(keys.filter((it) => it === recent)).toHaveLength(1);
    expect(keys.slice(1)).toEqual([...keys.slice(1)].sort());
  });
});

describe("setDebugInfoPortion", () => {
  it("should give and take info portions", () => {
    expect(setDebugInfoPortion("test_info", true)).toMatch(/^gave test_info/);
    expect(giveInfoPortion).toHaveBeenCalledWith("test_info");

    expect(setDebugInfoPortion("test_info", false)).toMatch(/^took test_info/);
    expect(disableInfoPortion).toHaveBeenCalledWith("test_info");
  });
});
