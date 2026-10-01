import { anim, cond } from "xray16";
import { Cond } from "xray16/alias";
import { LuaArray, TDuration, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry, setMonsterState } from "@/engine/core/database";
import { parseStringsList, pickSectionFromCondList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITipNotification } from "@/engine/core/managers/notifications/notifications_types";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemeMobRemarkState } from "@/engine/core/schemes/monster/mob_remark/mob_remark_types";
import { scriptCaptureMonster, scriptCommandMonster } from "@/engine/core/schemes/runtime";

/**
 * Controller handling monster remark scheme behaviour for an object.
 */
export class MobRemarkController extends AbstractSchemeController<ISchemeMobRemarkState> {
  public isTipSent: boolean = false;
  public isActionEndSignalled: boolean = false;

  public override activate(): void {
    this.state.signals = new LuaTable();
    this.isTipSent = false;
    this.isActionEndSignalled = false;

    this.object.disable_talk();

    setMonsterState(this.object, this.state.state);
    scriptCaptureMonster(this.object, !this.state.noReset);

    const animationsList: LuaArray<TName> = parseStringsList(this.state.anim);
    const timesList: LuaArray<TName> = this.state.time ? parseStringsList(this.state.time) : new LuaTable();

    for (const [index, animation] of animationsList) {
      const timeout: TDuration = $isNil(timesList.get(index)) ? 0 : tonumber(timesList.get(index))!;
      const condition: Cond = timeout === 0 ? new cond(cond.anim_end) : new cond(cond.time_end, timeout);

      if (this.state.animationMovement) {
        scriptCommandMonster(this.object, new anim(animation, true), condition);
      } else {
        scriptCommandMonster(this.object, new anim(animation), condition);
      }
    }
  }

  public update(): void {
    // Sync dialog / speaking state.
    if (
      this.state.dialogCondition &&
      $isNotNil(pickSectionFromCondList(registry.actor, this.object, this.state.dialogCondition.condlist))
    ) {
      if (!this.object.is_talk_enabled()) {
        this.object.enable_talk();
      }
    } else {
      if (this.object.is_talk_enabled()) {
        this.object.disable_talk();
      }
    }

    // Send tip notification it needed.
    if (!this.isTipSent) {
      this.isTipSent = true;

      if (this.state.tip) {
        EventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
          type: ENotificationType.TIP,
          caption: this.state.tip,
        });
      }
    }

    if (!this.isActionEndSignalled && this.object.get_script() && !this.object.action()) {
      this.isActionEndSignalled = true;
      this.state.signals!.set("action_end", true);
    }
  }
}
