import { game, task } from "xray16";
import { LuaArray, Nillable, TLabel, TName, TNumberId, TStringId } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { infoPortions } from "@/engine/constants/info_portions";
import { getManager, registry } from "@/engine/core/database";
import { readIniString } from "@/engine/core/ini";
import { IDebugField, IDebugQuestEntry } from "@/engine/core/managers/debug/debug_types";
import { TASK_MANAGER_CONFIG_LTX, taskConfig, TaskManager } from "@/engine/core/managers/tasks";
import type { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { disableInfoPortion, giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * @param id - Task id.
 * @returns Where the task stands: active, finished, or not given yet.
 */
export function getDebugTaskState(id: TStringId): TLabel {
  if (taskConfig.ACTIVE_TASKS.has(id)) {
    return "active";
  }

  return $isNil(registry.actor.get_task(id, false)) ? "not given" : "finished";
}

/**
 * @returns Every task of the task manager config, with its state.
 */
export function buildDebugTaskEntries(): LuaArray<IDebugQuestEntry> {
  const entries: LuaArray<IDebugQuestEntry> = new LuaTable();

  for (const [id] of taskConfig.AVAILABLE_TASKS) {
    const label: TLabel = `${id} - ${getDebugTaskState(id)}`;

    entries.set(entries.length() + 1, { key: id, label, search: string.lower(label) });
  }

  table.sort(entries, (first, second) => first.key < second.key);

  return entries;
}

/**
 * @param id - Task id.
 * @returns What the task is and where it stands.
 */
export function inspectDebugTask(id: TStringId): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();
  const active: Nillable<TaskObject> = taskConfig.ACTIVE_TASKS.get(id);

  fields.set(1, { label: "task", value: id });
  fields.set(2, {
    label: "title",
    value: game.translate_string(readIniString(TASK_MANAGER_CONFIG_LTX, id, "title", false, null, id)),
  });
  fields.set(3, { label: "state", value: getDebugTaskState(id) });

  if ($isNotNil(active)) {
    fields.set(4, {
      label: "target",
      value: $isNil(active.currentTargetId) ? "none" : tostring(active.currentTargetId),
    });
  }

  return fields;
}

/**
 * @param id - Task id.
 * @returns Result message.
 */
export function giveDebugTask(id: TStringId): TLabel {
  if (taskConfig.ACTIVE_TASKS.has(id)) {
    return `${id} is already active`;
  }

  getManager(TaskManager).giveTask(id);

  return `gave ${id}`;
}

/**
 * Finish an active task, as the engine does when its condition is met.
 *
 * @param id - Task id.
 * @param isCompleted - Whether it completes rather than fails.
 * @returns Result message.
 */
export function finishDebugTask(id: TStringId, isCompleted: boolean): TLabel {
  if (!taskConfig.ACTIVE_TASKS.has(id)) {
    return `${id} is not active`;
  }

  registry.actor.set_task_state(isCompleted ? task.completed : task.fail, id);

  return `${isCompleted ? "completed" : "failed"} ${id}`;
}

/**
 * @param id - Task id.
 * @returns Object the active task points to now, `null` when it points nowhere or is not active.
 */
export function getDebugTaskTargetId(id: TStringId): Nillable<TNumberId> {
  return taskConfig.ACTIVE_TASKS.get(id)?.currentTargetId ?? null;
}

/**
 * @param entries - Rows to add to.
 * @param name - Info portion to add a row for, marked when the actor has it.
 */
function addInfoPortionEntry(entries: LuaArray<IDebugQuestEntry>, name: TName): void {
  entries.set(entries.length() + 1, {
    key: name,
    label: hasInfoPortion(name) ? `${name} - has` : name,
    search: string.lower(name),
  });
}

/**
 * List every info portion the engine knows of, those changed this session first and the rest by name.
 *
 * @param recent - Info portions changed this session, newest first.
 * @returns Info portions, each marked when the actor has it.
 */
export function buildDebugInfoPortionEntries(recent: LuaArray<TName>): LuaArray<IDebugQuestEntry> {
  const entries: LuaArray<IDebugQuestEntry> = new LuaTable();
  const listed: LuaTable<TName, boolean> = new LuaTable();
  const names: LuaArray<TName> = new LuaTable();

  for (const index of $range(1, recent.length())) {
    listed.set(recent.get(index), true);
    addInfoPortionEntry(entries, recent.get(index));
  }

  for (const [, name] of pairs(infoPortions)) {
    if (!listed.has(name)) {
      listed.set(name, true);
      names.set(names.length() + 1, name);
    }
  }

  table.sort(names, (first, second) => first < second);

  for (const index of $range(1, names.length())) {
    addInfoPortionEntry(entries, names.get(index));
  }

  return entries;
}

/**
 * Give or take an info portion. Quests move on portions, so changing one by hand can leave a quest where its own
 * logic never would, and each change is logged as a warning.
 *
 * @param name - Info portion.
 * @param isGiven - Whether to give it rather than take it.
 * @returns Result message.
 */
export function setDebugInfoPortion(name: TName, isGiven: boolean): TLabel {
  logger.info("! Debugger %s info portion by hand: %s", isGiven ? "gives" : "takes", name);

  if (isGiven) {
    giveInfoPortion(name);
  } else {
    disableInfoPortion(name);
  }

  return `${isGiven ? "gave" : "took"} ${name} - quests may now be in a state their logic never reaches`;
}
