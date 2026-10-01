import { task } from "xray16";
import { GameTask, NetPacket, NetProcessor, TTaskState } from "xray16/alias";
import { AnyObject, assert, Nillable, TCount, TStringId } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { closeLoadMarker, closeSaveMarker, getManager, openLoadMarker, openSaveMarker } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITaskUpdatedNotification } from "@/engine/core/managers/notifications/notifications_types";
import { TASK_MANAGER_CONFIG_LTX, taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { ETaskState } from "@/engine/core/managers/tasks/types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Management of current tasks lists, states, rewards and progression.
 */
export class TaskManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.TASK_STATE_UPDATE, this.onTaskStateUpdate, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.TASK_STATE_UPDATE, this.onTaskStateUpdate);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, TaskManager.name);

    const count: TCount = table.size(taskConfig.ACTIVE_TASKS);

    packet.w_u16(count);

    for (const [section, task] of taskConfig.ACTIVE_TASKS) {
      packet.w_stringZ(section);
      task.save(packet);
    }

    closeSaveMarker(packet, TaskManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, TaskManager.name);

    // Clean up tasks list since loading new info.
    taskConfig.ACTIVE_TASKS = new LuaTable();

    const count: TCount = reader.r_u16();

    for (const _ of $range(1, count)) {
      const id: TStringId = reader.r_stringZ();
      const object: TaskObject = new TaskObject(id, TASK_MANAGER_CONFIG_LTX);

      object.load(reader);

      taskConfig.ACTIVE_TASKS.set(id, object);
    }

    closeLoadMarker(reader, TaskManager.name);
  }

  /**
   * @param taskId - Id of the task to check.
   * @returns If task is active.
   */
  public isTaskActive(taskId: TStringId): boolean {
    return taskConfig.ACTIVE_TASKS.has(taskId);
  }

  /**
   * @param taskId - Id of the task to check.
   * @returns If task is failed.
   */
  public isTaskFailed(taskId: TStringId): boolean {
    return taskConfig.ACTIVE_TASKS.get(taskId)?.isFailed() === true;
  }

  /**
   * @param taskId - Id of the task to check.
   * @returns If task is completed.
   */
  public isTaskCompleted(taskId: TStringId): boolean {
    return taskConfig.ACTIVE_TASKS.get(taskId)?.isCompleted() === true;
  }

  /**
   * Give actor task and put it in the tasks list.
   *
   * @param taskId - Id of the tasks to give for the actor.
   */
  public giveTask(taskId: TStringId): void {
    assert(
      taskConfig.AVAILABLE_TASKS.has(taskId),
      "There is no task '%s' in task_manager config or ini file is not included.",
      taskId
    );

    const task: TaskObject = new TaskObject(taskId, TASK_MANAGER_CONFIG_LTX);

    taskConfig.ACTIVE_TASKS.set(taskId, task);

    task.onActivate();
  }

  /**
   * Handle change of a task state, sending notifications and deactivating finished tasks.
   *
   * Fired from game callback event.
   *
   * @param taskObject - Game task that changed its state.
   * @param state - New state of the task.
   */
  public onTaskStateUpdate(taskObject: GameTask, state: TTaskState): void {
    const taskId: TStringId = taskObject.get_id();

    logger.info("Task state update: %s %s %s", taskId, state, state !== task.fail);

    if (state !== task.fail) {
      EventsManager.emitEvent<ITaskUpdatedNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.TASK,
        state: state === task.completed ? ETaskState.COMPLETED : ETaskState.NEW,
        task: taskObject,
      });
    }

    if (state === task.fail || state === task.completed) {
      const activeTask: Nillable<TaskObject> = taskConfig.ACTIVE_TASKS.get(taskId);

      if ($isNotNil(activeTask)) {
        activeTask.onDeactivate(taskObject);
        taskConfig.ACTIVE_TASKS.delete(taskId);
      }
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      taskConfig: taskConfig,
    };

    return data;
  }
}
