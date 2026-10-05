import { EActorMenuMode, EActorMenuType, GameObject, IniFile } from "xray16/alias";
import { ACTOR, consoleCommands, executeConsoleCommand } from "xray16/lib";
import { $filename } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database";
import { readIniString } from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { actorConfig } from "@/engine/core/managers/actor/ActorConfig";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager to synchronize and handle actor inventory events.
 */
export class ActorInventoryMenuManager extends AbstractManager {
  public override initialize(): void {
    const ini: IniFile = SYSTEM_INI;

    executeConsoleCommand(consoleCommands.slot_0, readIniString(ini, ACTOR, "quick_item_1") ?? "");
    executeConsoleCommand(consoleCommands.slot_1, readIniString(ini, ACTOR, "quick_item_2") ?? "");
    executeConsoleCommand(consoleCommands.slot_2, readIniString(ini, ACTOR, "quick_item_3") ?? "");
    executeConsoleCommand(consoleCommands.slot_3, readIniString(ini, ACTOR, "quick_item_4") ?? "");
  }

  /**
   * @param mode - Type of inventory to check.
   * @returns Whether current inventory mode matches provided type.
   */
  public isActiveMode(mode: EActorMenuMode): boolean {
    return actorConfig.ACTOR_MENU_MODE === mode;
  }

  /**
   * @param nextMode - Mode to set in inventory.
   */
  public setActiveMode(nextMode: EActorMenuMode): void {
    if (nextMode === EActorMenuMode.UNDEFINED || nextMode === EActorMenuMode.TALK_DIALOG_HIDE) {
      this.closeActorMenu();
    } else {
      this.openActorMenu(nextMode);
    }
  }

  /**
   * Open in-game hud menu.
   *
   * @param mode - Menu mode to show.
   */
  public openActorMenu(mode: EActorMenuMode): void {
    switch (mode) {
      case EActorMenuMode.INVENTORY:
      case EActorMenuMode.TRADE:
      case EActorMenuMode.UPGRADE:
      case EActorMenuMode.DEAD_BODY_SEARCH:
        actorConfig.ACTOR_MENU_MODE = mode;

        return this.onWindowOpen(mode);

      case EActorMenuMode.TALK_DIALOG_SHOW:
        actorConfig.ACTOR_MENU_MODE = EActorMenuMode.TALK_DIALOG;

        return this.onWindowOpen(mode);
    }
  }

  /**
   * Close currently active in-game menu.
   */
  public closeActorMenu(): void {
    switch (actorConfig.ACTOR_MENU_MODE) {
      case EActorMenuMode.INVENTORY:
      case EActorMenuMode.TRADE:
      case EActorMenuMode.UPGRADE:
      case EActorMenuMode.DEAD_BODY_SEARCH:
        this.onWindowClosed(actorConfig.ACTOR_MENU_MODE);
        break;

      case EActorMenuMode.TALK_DIALOG:
        this.onWindowClosed(EActorMenuMode.TALK_DIALOG);
        break;
    }

    actorConfig.ACTOR_MENU_MODE = EActorMenuMode.UNDEFINED;
  }

  /**
   * @param item - Item game object receiving UI focus.
   */
  public onItemFocusReceived(item: GameObject): void {
    // logger.info("Actor item focus received: %s", item?.name());
  }

  /**
   * @param item - Item game object losing UI focus.
   */
  public onItemFocusLost(item: GameObject): void {
    // logger.info("Actor item focus lost: %s", item?.name());
  }

  /**
   * @param from - Game object owner of previous list.
   * @param to - Game object owner of next list.
   * @param oldList - Type of previous list.
   * @param newList - Type of next list.
   */
  public onItemDropped(from: GameObject, to: GameObject, oldList: EActorMenuType, newList: EActorMenuType): void {
    logger.info("Actor menu inventory item dropped: %s %s %s %s", from?.name(), to?.name(), oldList, newList);
  }

  /**
   * @param mode - Type of actor menu open.
   */
  public onWindowOpen(mode: EActorMenuMode): void {
    logger.info("Actor menu open: %s", mode);
  }

  /**
   * @param mode - Type of actor menu closed.
   */
  public onWindowClosed(mode: EActorMenuMode): void {
    logger.info("Actor menu close: %s", mode);
  }
}
