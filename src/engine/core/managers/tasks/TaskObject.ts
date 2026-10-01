import { CGameTask, game, level, task, time_global } from "xray16";
import { GameTask, IniFile, NetPacket, NetProcessor, ServerObject, Time } from "xray16/alias";
import {
  AnyCallablesModule,
  assertDefined,
  getExtern,
  LuaArray,
  Nillable,
  readTimeFromPacket,
  TIndex,
  TLabel,
  TName,
  TNumberId,
  TRate,
  TStringId,
  TTimestamp,
  writeTimeToPacket,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { TLevel } from "@/engine/constants/levels";
import { mapMarks } from "@/engine/constants/map_marks";
import { closeLoadMarker, closeSaveMarker, openLoadMarker, openSaveMarker, registry } from "@/engine/core/database";
import {
  parseConditionsList,
  parseNumberOptional,
  parseStringOptional,
  pickSectionFromCondList,
  readIniBoolean,
  readIniNumber,
  readIniString,
  TConditionList,
} from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITaskUpdatedNotification } from "@/engine/core/managers/notifications/notifications_types";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { ETaskState, ETaskStatus, POSSIBLE_STATES } from "@/engine/core/managers/tasks/types";
import { addGuiderSpot, giveTaskReward, removeGuiderSpot } from "@/engine/core/managers/tasks/utils";
import { LuaLogger } from "@/engine/core/utils/logging";
import { getGameLevelName, getGameVertexLevelId } from "@/engine/core/utils/position";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Task object representation containing all the logics built over C task.
 * Handles rewards / conditions / side effects from tasks.
 */
export class TaskObject {
  public readonly id: TStringId;

  public task: Nillable<GameTask> = null;
  // Task state in list: selected or not.
  public status: ETaskStatus;
  public state: Nillable<ETaskState> = null;

  public initializedAt: Nillable<Time> = null;
  public nextUpdateAt: TTimestamp = 0;

  public title: TLabel;
  public currentTitle: Nillable<TLabel> = null;
  public titleGetterFunctorName: string;

  public description: TLabel;
  public currentDescription: TLabel;
  public descriptionGetterFunctorName: TName;

  public rewardMoneyConditionList: TConditionList;
  public rewardItemsConditionList: TConditionList;

  public target: TName;
  public targetGetterFunctorName: TName;
  public currentTargetId: Nillable<TNumberId> = null;

  public readonly isStorylineTask: boolean;
  public readonly isNotificationOnUpdateMuted: boolean;

  public communityRelationDeltaFail: number;
  public communityRelationDeltaComplete: number;

  public icon: TName;
  public priority: TRate;
  public spot: TLabel;

  public conditionLists: LuaArray<TConditionList>;

  public onInit: TConditionList;
  public onComplete: TConditionList;
  public onReversed: TConditionList;

  public constructor(id: TStringId, ini: IniFile) {
    this.id = id;

    this.title = readIniString(ini, id, "title", false, null, "TITLE_DOESNT_EXIST");
    this.titleGetterFunctorName = readIniString(ini, id, "title_functor", false, null, "condlist");

    this.description = readIniString(ini, id, "descr", false, null, "DESCR_DOESNT_EXIST");
    this.descriptionGetterFunctorName = readIniString(ini, id, "descr_functor", false, null, "condlist");

    this.target = readIniString(ini, id, "target", false, null, "DESCR_DOESNT_EXIST");
    this.targetGetterFunctorName = readIniString(ini, id, "target_functor", false, null, "target_condlist");

    this.icon = readIniString(ini, id, "icon", false, null, "ui_pda2_mtask_overlay");
    this.priority = readIniNumber(ini, id, "prior", false, 0);
    this.isStorylineTask = readIniBoolean(ini, id, "storyline", false, true);

    let it: TIndex = 0;

    this.conditionLists = new LuaTable();

    while (ini.line_exist(id, "condlist_" + it)) {
      this.conditionLists.set(it, parseConditionsList(ini.r_string(id, "condlist_" + it)));

      it += 1;
    }

    this.onInit = parseConditionsList(readIniString(ini, id, "on_init", false, null, ""));
    this.onComplete = parseConditionsList(readIniString(ini, id, "on_complete", false, null, ""));
    this.onReversed = parseConditionsList(readIniString(ini, id, "on_reversed", false, null, ""));

    this.rewardMoneyConditionList = parseConditionsList(readIniString(ini, id, "reward_money", false, null, ""));
    this.rewardItemsConditionList = parseConditionsList(readIniString(ini, id, "reward_item", false, null, ""));

    this.communityRelationDeltaFail = readIniNumber(ini, id, "community_relation_delta_fail", false, 0);
    this.communityRelationDeltaComplete = readIniNumber(ini, id, "community_relation_delta_complete", false, 0);

    const taskFunctors: AnyCallablesModule = getExtern<AnyCallablesModule>("task_functors");

    this.currentTitle = taskFunctors[this.titleGetterFunctorName](this.id, "title", this.title);
    this.currentDescription = taskFunctors[this.descriptionGetterFunctorName](this.id, "descr", this.description);
    this.currentTargetId = taskFunctors[this.targetGetterFunctorName](this.id, "target", this.target);

    this.status = ETaskStatus.NORMAL;
    this.spot = this.isStorylineTask ? mapMarks.storyline_task_location : mapMarks.secondary_task_location;

    this.isNotificationOnUpdateMuted = readIniBoolean(ini, id, "dont_send_update_news", false, false);
  }

  /**
   * @returns Whether task is completed.
   */
  public isCompleted(): boolean {
    this.update();

    return this.state === ETaskState.COMPLETED;
  }

  /**
   * @returns Whether task is failed.
   */
  public isFailed(): boolean {
    this.update();

    return this.state === ETaskState.FAIL || this.state === ETaskState.REVERSED;
  }

  /**
   * Reverse task from script.
   * Sets state as reversed and lets other checks to do the job.
   */
  public reverse(): void {
    this.state = ETaskState.REVERSED;
  }

  /**
   * Update task state based on current game state.
   * Throttles it because game engine does a lot of calls for tasks.
   */
  public update(): Nillable<ETaskState> {
    const now: TTimestamp = time_global();

    // Throttle for any state - `null` state of in-progress tasks is the most common polling case:
    if (now < this.nextUpdateAt) {
      return this.state;
    }

    if (!this.task) {
      this.task = registry.actor.get_task(this.id, true) as GameTask;

      return this.state;
    }

    this.nextUpdateAt = now + math.random(taskConfig.UPDATE_CHECK_PERIOD_MIN, taskConfig.UPDATE_CHECK_PERIOD_MAX);

    const taskFunctors: AnyCallablesModule = getExtern<AnyCallablesModule>("task_functors");
    const nextTitle: TLabel = taskFunctors[this.titleGetterFunctorName](this.id, "title", this.title);
    let isTaskUpdated: boolean = false;

    if (this.currentTitle !== nextTitle) {
      isTaskUpdated = true;
      this.currentTitle = nextTitle;
      this.task.set_title(game.translate_string(nextTitle));
    }

    const nextDescription: TLabel = taskFunctors[this.descriptionGetterFunctorName](this.id, "descr", this.description);

    if (this.currentDescription !== nextDescription) {
      isTaskUpdated = true;
      this.currentDescription = nextDescription;
      this.task.set_description(game.translate_string(nextDescription));
    }

    const nextTargetId: TNumberId = taskFunctors[this.targetGetterFunctorName](this.id, "target", this.target);

    this.updateLevelDirection(nextTargetId);

    if (this.currentTargetId !== nextTargetId) {
      logger.info("Updated task due to target change: %s %s %s", this.id, this.currentTargetId, nextTargetId);

      if ($isNil(this.currentTargetId)) {
        isTaskUpdated = true;
        this.task.change_map_location(this.spot, nextTargetId);
        level.map_add_object_spot(
          nextTargetId,
          this.isStorylineTask ? mapMarks.ui_storyline_task_blink : mapMarks.ui_secondary_task_blink,
          ""
        );
      } else {
        if ($isNil(nextTargetId)) {
          this.task.remove_map_locations(false);
          isTaskUpdated = true;
        } else {
          level.map_add_object_spot(
            nextTargetId,
            this.isStorylineTask ? mapMarks.ui_storyline_task_blink : mapMarks.ui_secondary_task_blink,
            ""
          );

          this.task.change_map_location(this.spot, nextTargetId);
          isTaskUpdated = true;
        }
      }

      this.currentTargetId = nextTargetId;
    }

    if (isTaskUpdated && !this.isNotificationOnUpdateMuted) {
      EventsManager.emitEvent<ITaskUpdatedNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.TASK,
        state: ETaskState.UPDATED,
        task: this.task,
      });
    }

    for (const [, conditionList] of this.conditionLists) {
      const taskState: Nillable<ETaskState> = pickSectionFromCondList(
        registry.actor,
        registry.actor,
        conditionList
      ) as Nillable<ETaskState>;

      if (taskState) {
        assertDefined(POSSIBLE_STATES[taskState], "Invalid task status [%s] for task [%s]", taskState, this.title);

        this.state = taskState;

        return this.state;
      }
    }

    return this.state;
  }

  /**
   * Update direction guiding based on current level and quest target.
   * If quest target is on another level, point to guider to navigate over location.
   *
   * @param targetId - Task object target id, used for getting direction.
   */
  public updateLevelDirection(targetId: Nillable<TNumberId>): void {
    if (!targetId || !registry.actor.is_active_task(this.task as GameTask)) {
      return;
    }

    const alifeObject: Nillable<ServerObject> = registry.simulator.object(targetId);

    if (alifeObject) {
      const levelName: TLevel = level.name();
      const targetLevel: TLevel = getGameLevelName(getGameVertexLevelId(alifeObject.m_game_vertex_id)) as TLevel;

      if (levelName === targetLevel) {
        removeGuiderSpot(levelName);
      } else {
        addGuiderSpot(levelName, targetLevel, this.isStorylineTask);
      }
    }
  }

  /**
   * Handle task activation - addition to current tasks list.
   */
  public onActivate(): void {
    logger.info("Activate task: %s", this.id);

    const gameTask: GameTask = new CGameTask();

    gameTask.set_id(tostring(this.id));
    gameTask.set_type(this.isStorylineTask ? task.storyline : task.additional);
    gameTask.set_title(this.currentTitle as TLabel);
    gameTask.set_description(this.currentDescription);
    gameTask.set_priority(this.priority);
    gameTask.set_icon_name(this.icon);

    gameTask.add_complete_func("engine.is_task_completed");
    gameTask.add_fail_func("engine.is_task_failed");

    // Execute to generate side effects.
    pickSectionFromCondList(registry.actor, registry.actor, this.onInit);

    if ($isNotNil(this.currentTargetId)) {
      gameTask.set_map_location(this.spot);
      gameTask.set_map_object_id(this.currentTargetId);

      level.map_add_object_spot(
        this.currentTargetId,
        this.isStorylineTask ? mapMarks.ui_storyline_task_blink : mapMarks.ui_secondary_task_blink,
        ""
      );
    }

    registry.actor.give_task(gameTask, 0, false, 0);

    this.task = gameTask;
    this.status = ETaskStatus.SELECTED;
    this.initializedAt = game.get_game_time();

    EventsManager.emitEvent(EGameEvent.TASK_ACTIVATED, this);
  }

  /**
   * Handle task deactivation based on current state.
   *
   * @param task - C game task object linked to current one.
   */
  public onDeactivate(task: GameTask): void {
    logger.info("Deactivate task: %s %s", this.title, this.state);

    switch (this.state) {
      case ETaskState.FAIL:
        EventsManager.emitEvent<ITaskUpdatedNotification>(EGameEvent.NOTIFICATION, {
          type: ENotificationType.TASK,
          state: ETaskState.FAIL,
          task: task,
        });
        EventsManager.emitEvent(EGameEvent.TASK_FAILED, this);
        break;

      case ETaskState.REVERSED:
        pickSectionFromCondList(registry.actor, registry.actor, this.onReversed);
        EventsManager.emitEvent<ITaskUpdatedNotification>(EGameEvent.NOTIFICATION, {
          type: ENotificationType.TASK,
          state: ETaskState.REVERSED,
          task: task,
        });
        EventsManager.emitEvent(EGameEvent.TASK_REVERSED, this);
        break;

      case ETaskState.COMPLETED:
        pickSectionFromCondList(registry.actor, registry.actor, this.onComplete);
        giveTaskReward(this);
        EventsManager.emitEvent(EGameEvent.TASK_COMPLETED, this);
        break;
    }

    this.nextUpdateAt = 0;
    this.state = null;
    this.status = ETaskStatus.NORMAL;
  }

  public save(packet: NetPacket): void {
    openSaveMarker(packet, TaskObject.name);

    packet.w_u8(this.status);
    writeTimeToPacket(packet, this.initializedAt);
    packet.w_stringZ(tostring(this.currentTitle));
    packet.w_stringZ(tostring(this.currentDescription));
    packet.w_stringZ(tostring(this.currentTargetId));

    closeSaveMarker(packet, TaskObject.name);
  }

  public load(reader: NetProcessor): void {
    openLoadMarker(reader, TaskObject.name);

    this.status = reader.r_u8();
    this.initializedAt = readTimeFromPacket(reader);
    this.currentTitle = parseStringOptional(reader.r_stringZ());
    this.currentDescription = parseStringOptional(reader.r_stringZ()) as TLabel;
    this.currentTargetId = parseNumberOptional(reader.r_stringZ());

    closeLoadMarker(reader, TaskObject.name);
  }
}
