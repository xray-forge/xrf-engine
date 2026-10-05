import { CUIScrollView, level, LuabindClass } from "xray16";
import { GameObject } from "xray16/alias";
import { Nillable, TLabel, TNumberId, TPath } from "xray16/lib";
import { $fromArray, $isNil, $isNotNil } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { inspectDebugTarget } from "@/engine/core/managers/debug/utils/debug_inspect";
import { clearDebugTarget } from "@/engine/core/managers/debug/utils/debug_target";
import {
  EDebugTargetReport,
  getDebugInteractionBlocker,
  healDebugTarget,
  killDebugTarget,
  logDebugTargetReport,
  pullDebugTargetToActor,
  releaseDebugTarget,
  setDebugTargetRelation,
  talkToDebugTarget,
  teleportActorToDebugTarget,
  tradeWithDebugTarget,
  woundDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_target_actions";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { isCreature } from "@/engine/core/utils/class_ids";
import { isGameStarted } from "@/engine/core/utils/game";
import { getNearestGameObject } from "@/engine/core/utils/registry";
import { ERelation } from "@/engine/core/utils/relation";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugTargetTab.component";

/**
 * Target tab: what the target is, and actions on it.
 */
@LuabindClass()
export class DebugTargetTab extends DebuggerTab {
  public uiFields!: CUIScrollView;
  // Interaction waiting for the game to run again, as the closing main menu would take its window with it.
  public pendingInteraction: Nillable<(id: TNumberId) => TLabel> = null;
  public pendingInteractionId: Nillable<TNumberId> = null;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.TARGET, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "fields_background",
      "heading_target",
      "heading_world",
      "heading_interact",
      "heading_condition",
      "heading_relation",
      "heading_log"
    );

    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("crosshair_button", () => this.onSelectObject(level.get_target_obj()));
    this.initializeButton("nearest_button", () => this.onSelectObject(getNearestGameObject((it) => isCreature(it))));
    this.initializeButton("clear_button", () => this.onClear());

    this.initializeButton("teleport_button", () => this.onAction(teleportActorToDebugTarget, true));
    this.initializeButton("pull_button", () => this.onAction(pullDebugTargetToActor));
    this.initializeButton("release_button", () => this.onRelease());

    this.initializeButton("talk_button", () => this.onInteraction(talkToDebugTarget));
    this.initializeButton("trade_button", () => this.onInteraction(tradeWithDebugTarget));

    this.initializeButton("heal_button", () => this.onAction(healDebugTarget));
    this.initializeButton("wound_button", () => this.onAction(woundDebugTarget));
    this.initializeButton("kill_button", () => this.onAction(killDebugTarget));

    this.initializeButton("friend_button", () => this.onAction((id) => setDebugTargetRelation(id, ERelation.FRIEND)));
    this.initializeButton("neutral_button", () => this.onAction((id) => setDebugTargetRelation(id, ERelation.NEUTRAL)));
    this.initializeButton("enemy_button", () => this.onAction((id) => setDebugTargetRelation(id, ERelation.ENEMY)));

    this.initializeButton("log_state_button", () => this.onLog(EDebugTargetReport.STATE));
    this.initializeButton("log_planner_button", () => this.onLog(EDebugTargetReport.PLANNER));
    this.initializeButton("log_inventory_button", () => this.onLog(EDebugTargetReport.INVENTORY));
    this.initializeButton("log_relations_button", () => this.onLog(EDebugTargetReport.RELATIONS));
    this.initializeButton("log_state_controller_button", () => this.onLog(EDebugTargetReport.STATE_CONTROLLER));
  }

  public override refresh(): void {
    const id: Nillable<TNumberId> = this.owner.manager.target.id;

    if (!isGameStarted()) {
      this.fillFieldList(this.uiFields, $fromArray([{ label: "target", value: "no game running" }]));
    } else if ($isNil(id)) {
      this.fillFieldList(this.uiFields, $fromArray([{ label: "target", value: "none, pick one" }]));
    } else {
      this.fillFieldList(this.uiFields, inspectDebugTarget(id));
    }
  }

  /**
   * Make an object the target.
   *
   * @param object - Object to target, missing when there was none to pick.
   */
  public onSelectObject(object: Nillable<GameObject>): void {
    if (!isGameStarted()) {
      return this.owner.report("no game running");
    } else if ($isNil(object)) {
      return this.owner.report("nothing to target");
    }

    this.owner.setTarget(object.id());
    this.owner.report(`targeted ${object.name()}`);
  }

  /**
   * Forget the target.
   */
  public onClear(): void {
    clearDebugTarget(this.owner.manager.target);
    this.owner.onAction("target cleared");
  }

  /**
   * Run an action on the target.
   *
   * @param action - Action taking the target id and returning its result message.
   * @param isResuming - Whether the action needs the game running to be seen, closing the debugger after it.
   */
  public onAction(action: (id: TNumberId) => TLabel, isResuming: boolean = false): void {
    const id: Nillable<TNumberId> = this.owner.manager.target.id;

    if (!isGameStarted() || $isNil(id)) {
      return this.owner.report("no target");
    }

    const message: TLabel = action(id);

    if (isResuming) {
      this.owner.report(message);
      this.owner.resume();
    } else {
      this.owner.onAction(message);
    }
  }

  /**
   * Close the debugger, then run an action that opens a game window on the target once the game runs again.
   *
   * @param action - Action taking the target id and returning its result message.
   */
  public onInteraction(action: (id: TNumberId) => TLabel): void {
    const id: Nillable<TNumberId> = this.owner.manager.target.id;

    if (!isGameStarted() || $isNil(id)) {
      return this.owner.report("no target");
    }

    const blocker: Nillable<TLabel> = getDebugInteractionBlocker(id);

    if ($isNotNil(blocker)) {
      return this.owner.report(blocker);
    }

    this.pendingInteraction = action;
    this.pendingInteractionId = id;

    getManager(EventsManager).registerCallback(EGameEvent.ACTOR_UPDATE, this.onGameResumed, this);
    this.owner.resume();
  }

  /**
   * Run the interaction waiting for the game to run again.
   */
  public onGameResumed(): void {
    const action: Nillable<(id: TNumberId) => TLabel> = this.pendingInteraction;
    const id: Nillable<TNumberId> = this.pendingInteractionId;

    getManager(EventsManager).unregisterCallback(EGameEvent.ACTOR_UPDATE, this.onGameResumed);
    this.pendingInteraction = null;
    this.pendingInteractionId = null;

    if ($isNotNil(action) && $isNotNil(id)) {
      this.owner.report(action(id));
    }
  }

  /**
   * Release the target, which also ends targeting it.
   */
  public onRelease(): void {
    this.onAction((id) => {
      const message: TLabel = releaseDebugTarget(id);

      clearDebugTarget(this.owner.manager.target);

      return message;
    });
  }

  /**
   * Write a report on the target to the log.
   *
   * @param report - Report to write.
   */
  public onLog(report: EDebugTargetReport): void {
    this.onAction((id) => logDebugTargetReport(id, report));
  }
}
