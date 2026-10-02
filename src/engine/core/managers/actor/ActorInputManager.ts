import { game, get_hud, level } from "xray16";
import { GameHud, GameObject, NetPacket, NetProcessor, Time } from "xray16/alias";
import { AnyObject, Nillable, readTimeFromPacket, TDuration, TName, TNumberId, writeTimeToPacket } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { misc } from "@/engine/constants/items/misc";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import {
  EActiveItemSlot,
  EActorControlHandle,
  EActorControlPolicy,
  IActorControlDescriptor,
} from "@/engine/core/managers/actor/actor_input_types";
import { actorConfig } from "@/engine/core/managers/actor/ActorConfig";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { LuaLogger } from "@/engine/core/utils/logging";
import { isActorInNoWeaponZone } from "@/engine/core/utils/position";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage actor input, UI, and persistent control locks.
 */
export class ActorInputManager extends AbstractManager {
  private locks: LuaMap<TName, IActorControlDescriptor> = new LuaMap();

  private activeItemSlot: EActiveItemSlot = EActiveItemSlot.PRIMARY;
  private memoizedItemSlot: EActiveItemSlot = EActiveItemSlot.NONE;
  private disabledInputAt: Nillable<Time> = null;
  private disabledInputDuration: Nillable<TDuration> = null;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.onUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onFirstUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorGoOnline, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.onUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onFirstUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorGoOnline);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, ActorInputManager.name);

    if ($isNil(this.disabledInputAt)) {
      packet.w_bool(false);
    } else {
      packet.w_bool(true);
      writeTimeToPacket(packet, this.disabledInputAt);
      packet.w_u32(this.disabledInputDuration as number);
    }

    packet.w_u8(registry.actor.active_slot());
    packet.w_u8(this.memoizedItemSlot);

    packet.w_u8(table.size(this.locks));

    for (const [handle, descriptor] of this.locks) {
      packet.w_stringZ(handle);
      packet.w_stringZ(descriptor.reason);
      packet.w_u8(descriptor.policy);
      packet.w_bool(descriptor.resetSlot);
    }

    closeSaveMarker(packet, ActorInputManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, ActorInputManager.name);

    if (reader.r_bool()) {
      this.disabledInputAt = readTimeFromPacket(reader);
      this.disabledInputDuration = reader.r_u32();
    } else {
      this.disabledInputAt = null;
      this.disabledInputDuration = null;
    }

    this.activeItemSlot = reader.r_u8();
    this.memoizedItemSlot = reader.r_u8();

    this.locks = new LuaMap();

    const controlsCount: number = reader.r_u8();
    let isSlotReleased: boolean = false;

    for (const _ of $range(1, controlsCount)) {
      const handle: TName = reader.r_stringZ();
      const reason: TName = reader.r_stringZ();
      const policy: EActorControlPolicy = reader.r_u8() as EActorControlPolicy;
      const resetSlot: boolean = reader.r_bool();

      if (this.isResumedAfterLoad(handle)) {
        this.locks.set(handle, { reason, policy, resetSlot });
      } else {
        logger.info("Drop actor control lock of a sequence not resumed after load: %s", handle);
        isSlotReleased = isSlotReleased || resetSlot;
      }
    }

    // A dropped lock gives back the item slot it put away.
    if (isSlotReleased && !this.hasUiControl() && this.memoizedItemSlot !== EActiveItemSlot.NONE) {
      this.activeItemSlot = this.memoizedItemSlot;
      this.memoizedItemSlot = EActiveItemSlot.NONE;
    }

    closeLoadMarker(reader, ActorInputManager.name);

    this.reconcileControlState(false);
  }

  /**
   * Acquire or strengthen a persistent control lock.
   *
   * Repeated acquisitions keep the stronger policy and preserve any slot reset request.
   *
   * @param handle - Stable lock owner.
   * @param reason - Diagnostic reason stored with the lock.
   * @param policy - Restrictions applied while the lock is active.
   * @param resetSlot - Whether the lock may memoize and clear the active item slot.
   */
  public acquireControl(
    handle: EActorControlHandle,
    reason: TName,
    policy: EActorControlPolicy,
    resetSlot: boolean = false
  ): void {
    const existing: Nillable<IActorControlDescriptor> = this.locks.get(handle);

    if ($isNotNil(existing)) {
      existing.policy = math.max(existing.policy, policy) as EActorControlPolicy;
      existing.resetSlot = existing.resetSlot || resetSlot;
    } else {
      this.locks.set(handle, { reason, policy, resetSlot });
    }

    this.reconcileControlState(false);
  }

  /**
   * Release a control lock and reconcile the remaining locks.
   *
   * @param handle - Stable lock owner to release.
   * @param restoreUi - Whether to restore owned UI when no stronger UI lock remains.
   */
  public releaseControl(handle: EActorControlHandle, restoreUi: boolean = true): void {
    if (!this.locks.delete(handle)) {
      logger.info("Release missing actor control lock: %s", handle);

      return;
    }

    this.reconcileControlState(restoreUi);
  }

  /**
   * Release a UI lock and optionally restore the memoized item slot.
   *
   * The slot is restored only after all UI locks have been released.
   *
   * @param handle - Stable UI lock owner to release.
   * @param restoreSlot - Whether to reactivate the memoized slot after UI locks are released.
   */
  public releaseGameUiControl(handle: EActorControlHandle, restoreSlot: boolean = false): void {
    const memoizedSlot: EActiveItemSlot = this.memoizedItemSlot;

    this.releaseControl(handle, true);

    if (
      restoreSlot &&
      !this.hasUiControl() &&
      memoizedSlot !== EActiveItemSlot.NONE &&
      registry.actor.item_in_slot(memoizedSlot)
    ) {
      registry.actor.activate_slot(memoizedSlot);
    }

    if (!this.hasUiControl()) {
      this.memoizedItemSlot = EActiveItemSlot.NONE;
    }
  }

  /**
   * Temporarily disable actor input.
   *
   * @param duration - Duration of the input restriction.
   */
  public setInactiveInputTime(duration: TDuration): void {
    logger.info("Deactivate actor input: '%s'", duration);

    this.disabledInputAt = game.get_game_time();
    this.disabledInputDuration = duration;

    this.acquireControl(EActorControlHandle.TIMED, "timed", EActorControlPolicy.INPUT);
  }

  /**
   * Turn actor night vision back on when `disableActorNightVision` turned it off.
   */
  public enableActorNightVision(): void {
    logger.info("Enable actor night vision");

    const nightVision: Nillable<GameObject> = registry.actor.object(misc.device_torch);

    if (nightVision && !nightVision.night_vision_enabled() && actorConfig.IS_NIGHT_VISION_TURNED_OFF) {
      nightVision.enable_night_vision(true);
      actorConfig.IS_NIGHT_VISION_TURNED_OFF = false;
    }
  }

  /**
   * Turn actor night vision off, remembering to turn it back on.
   */
  public disableActorNightVision(): void {
    logger.info("Disable actor night vision");

    const nightVision: Nillable<GameObject> = registry.actor.object(misc.device_torch);

    if (nightVision && nightVision.night_vision_enabled()) {
      nightVision.enable_night_vision(false);
      actorConfig.IS_NIGHT_VISION_TURNED_OFF = true;
    }
  }

  /**
   * Turn actor torch back on when `disableActorTorch` turned it off.
   */
  public enableActorTorch(): void {
    logger.info("Enable actor torch");

    const torch: Nillable<GameObject> = registry.actor.object(misc.device_torch);

    if (torch && !torch.torch_enabled() && actorConfig.IS_TORCH_TURNED_OFF) {
      torch.enable_torch(true);
      actorConfig.IS_TORCH_TURNED_OFF = false;
    }
  }

  /**
   * Turn actor torch off, remembering to turn it back on.
   */
  public disableActorTorch(): void {
    logger.info("Disable actor torch");

    const torch: Nillable<GameObject> = registry.actor.object(misc.device_torch);

    if (torch && torch.torch_enabled()) {
      torch.enable_torch(false);
      actorConfig.IS_TORCH_TURNED_OFF = true;
    }
  }

  /**
   * Disable game UI, hide actor weapon, indicators and menus, and disable input.
   *
   * @param resetSlot - Whether currently active item slot should be memoized and deactivated.
   */
  public disableGameUi(resetSlot: boolean = false): void {
    this.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI, resetSlot);
  }

  /**
   * Release the scripted UI lock and restore owned UI when possible.
   *
   * @param restore - Whether to reactivate the previously memoized item slot.
   */
  public enableGameUi(restore: boolean = false): void {
    this.releaseGameUiControl(EActorControlHandle.SCRIPT_UI, restore);
  }

  /**
   * Disable game UI by hiding actor weapon, indicators and menus without disabling night vision or torch.
   */
  public disableGameUiOnly(): void {
    this.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.UI_ONLY, true);
  }

  /**
   * Reconcile input and UI with the strongest active control policy.
   *
   * @param restoreUi - Whether to restore owned UI when no UI lock remains.
   */
  private reconcileControlState(restoreUi: boolean): void {
    const policy: Nillable<EActorControlPolicy> = this.getActiveControlPolicy();

    if (policy) {
      level.disable_input();
    } else {
      level.enable_input();
    }

    if (policy === EActorControlPolicy.FULL_UI) {
      this.hideGameUi(this.hasResetSlotControl(), true);
    } else if (policy === EActorControlPolicy.UI_ONLY) {
      this.hideGameUi(this.hasResetSlotControl(), false);
    } else if (policy === EActorControlPolicy.INPUT_AND_INDICATORS) {
      level.hide_indicators_safe();
    } else if ((policy === EActorControlPolicy.INPUT || !policy) && restoreUi) {
      this.showGameUi();
    }
  }

  /**
   * Get the strongest active control policy.
   *
   * Every active policy blocks input.
   *
   * @returns The strongest policy, or null when no lock is active.
   */
  private getActiveControlPolicy(): Nillable<EActorControlPolicy> {
    let result: Nillable<EActorControlPolicy> = null;

    for (const [, descriptor] of this.locks) {
      if (!result || descriptor.policy > result) {
        result = descriptor.policy;
      }
    }

    return result;
  }

  /**
   * Script UI locks are released by scheme logic that goes on after a load, and timed locks are saved with their expiry.
   * Sleep, anabiotic, surge survival, travel and outro run on effector callbacks or timers that a load does not resume.
   *
   * @param handle - Control lock owner.
   * @returns Whether the lock owner resumes after a game load, so its saved lock is restored.
   */
  private isResumedAfterLoad(handle: TName): boolean {
    return handle === EActorControlHandle.SCRIPT_UI || handle === EActorControlHandle.TIMED;
  }

  /**
   * Check whether any active UI lock requested an active-slot reset.
   *
   * @returns Whether a lock requested an active-slot reset.
   */
  private hasResetSlotControl(): boolean {
    for (const [, descriptor] of this.locks) {
      if (descriptor.resetSlot) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check whether an active lock still owns a hidden UI presentation.
   *
   * @returns Whether a UI-only or full-UI lock remains active.
   */
  private hasUiControl(): boolean {
    const policy: Nillable<EActorControlPolicy> = this.getActiveControlPolicy();

    return policy === EActorControlPolicy.UI_ONLY || policy === EActorControlPolicy.FULL_UI;
  }

  /**
   * Hide actor-facing UI components controlled by this manager.
   *
   * @param resetSlot - Whether to memoize and clear the active item slot.
   * @param resetTools - Whether to disable night vision and the torch.
   */
  private hideGameUi(resetSlot: boolean, resetTools: boolean): void {
    const actor: GameObject = registry.actor;
    const hud: GameHud = get_hud();

    if (actor.is_talking()) {
      actor.stop_talk();
    }

    level.show_weapon(false);

    if (resetSlot && actor.active_slot() !== EActiveItemSlot.NONE) {
      this.memoizedItemSlot = actor.active_slot();
      actor.activate_slot(EActiveItemSlot.NONE);
    }

    level.hide_indicators_safe();

    hud.HideActorMenu();
    hud.HidePdaMenu();

    if (resetTools) {
      this.disableActorNightVision();
      this.disableActorTorch();
    }
  }

  /**
   * Restore actor-facing UI components owned by this manager.
   */
  private showGameUi(): void {
    level.show_weapon(true);
    level.show_indicators();
    this.enableActorNightVision();
    this.enableActorTorch();
  }

  /**
   * Update timed input locks and actor weapon visibility.
   *
   * @param delta - Time since the previous actor update.
   */
  public onUpdate(delta: TDuration): void {
    const actor: GameObject = registry.actor;

    if (
      this.disabledInputAt &&
      game.get_game_time().diffSec(this.disabledInputAt) >= (this.disabledInputDuration as number)
    ) {
      this.disabledInputAt = null;
      this.releaseControl(EActorControlHandle.TIMED, false);
    }

    if (actor.is_talking()) {
      if (!actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG) {
        logger.info("Hiding weapon in dialog");
        actor.hide_weapon();
        actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG = true;
      }
    } else {
      if (actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG) {
        logger.info("Restoring weapon in dialog");
        actor.restore_weapon();
        actorConfig.IS_WEAPON_HIDDEN_IN_DIALOG = false;
      }
    }

    if (isActorInNoWeaponZone()) {
      if (!actorConfig.IS_WEAPON_HIDDEN) {
        logger.info("Hiding weapon");
        actor.hide_weapon();
        actorConfig.IS_WEAPON_HIDDEN = true;
      }
    } else {
      if (actorConfig.IS_WEAPON_HIDDEN) {
        logger.info("Restoring weapon");
        actor.restore_weapon();
        actorConfig.IS_WEAPON_HIDDEN = false;
      }
    }
  }

  /**
   * Handle first update from actor input perspective.
   */
  public onFirstUpdate(): void {
    logger.info("Apply active item slot: %s", this.activeItemSlot);
    registry.actor.activate_slot(this.activeItemSlot);
  }

  /**
   * Reconcile actor control state after the actor goes online.
   */
  public onActorGoOnline(): void {
    this.reconcileControlState(false);
  }

  /**
   * Handle actor keyboard input pressing.
   *
   * @param key - Key code.
   * @param bind - Key binding code.
   * @returns Whether action was handled by script and engine should stop further execution of callbacks.
   */
  public onKeyPress(key: TNumberId, bind: TNumberId): boolean {
    /**
     * Place to implement quick save / quick load logics with incremental naming / rotating files.
     * For reference, check anomaly/CoC etc.
     *
     * -> scripts/level_input.script
     *    on_key_press
     *    action_quick_save
     *    action_quick_load.
     */

    return false;
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      activeSlot: registry.actor.active_slot(),
      memoizedItemSlot: this.memoizedItemSlot,
      activePolicy: this.getActiveControlPolicy(),
      locks: this.locks,
      disabledInputAt: this.disabledInputAt,
      disabledInputDuration: this.disabledInputDuration,
      actorConfig: actorConfig,
    };

    return data;
  }
}
