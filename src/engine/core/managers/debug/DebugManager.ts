import { GameObject } from "xray16/alias";
import { AnyObject, executeConsoleCommand, LuaArray, Nillable, TName, TNumberId, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { consoleCommands } from "@/engine/constants/console_commands";
import { getManager } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EDebugTab, IDebugPreferences, IDebugTarget } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { buildDebugCatalogue, TDebugCatalogue } from "@/engine/core/managers/debug/utils/debug_catalogue";
import {
  createDebugPreferences,
  loadDebugPreferences,
  saveDebugPreferences,
} from "@/engine/core/managers/debug/utils/debug_preferences";
import { pickDebugTargetOnOpen, pruneDebugTargets } from "@/engine/core/managers/debug/utils/debug_target";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import type { MainMenu } from "@/engine/core/ui/menu/MainMenu";
import { isGameStarted } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";
import { pushRecentValue } from "@/engine/core/utils/table";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Owns the debugger: its window, the object it targets and the preferences of this install.
 *
 * The debugger always opens over the main menu, as only the main menu keeps script windows working while the game is
 * paused. Its key pressed in a level opens the main menu first, and the window follows once the menu is up.
 */
export class DebugManager extends AbstractManager {
  public target: IDebugTarget = { id: null, isPinned: false, recentIds: new LuaTable() };
  public preferences: IDebugPreferences = createDebugPreferences();
  // Created on first use.
  public uiDebugger: Nillable<Debugger> = null;
  // The debugger key was pressed in a level, and the window waits for the main menu it opened.
  public isOpenRequested: boolean = false;
  // Main menu opened for the requested debugger, which shows it once the menu is up.
  public requestedMenu: Nillable<MainMenu> = null;
  // Spawnable sections, built on first use: `system.ini` does not change while the game runs.
  public catalogue: Nillable<TDebugCatalogue> = null;
  // Info portions the actor gained or lost this session, newest first.
  public recentInfoPortions: LuaArray<TName> = new LuaTable();

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    this.preferences = loadDebugPreferences();

    eventsManager.registerCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_INFO_ADDED, this.onInfoPortionChanged, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_INFO_REMOVED, this.onInfoPortionChanged, this);
    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn);
    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_UPDATE, this.onMainMenuUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_INFO_ADDED, this.onInfoPortionChanged);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_INFO_REMOVED, this.onInfoPortionChanged);
    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  /**
   * Open the debugger over a main menu.
   *
   * @param menu - Main menu the debugger opens over, shown again when it closes.
   * @param isResumingOnClose - Whether closing the debugger returns to the game rather than to the menu.
   */
  public openDebugger(menu: MainMenu, isResumingOnClose: boolean): void {
    if (!forgeConfig.DEBUG.IS_ENABLED) {
      return logger.info("Debugger is disabled");
    }

    if (isGameStarted()) {
      pruneDebugTargets(this.target);
    }

    if (!this.uiDebugger) {
      this.uiDebugger = new Debugger(this);
    }

    this.uiDebugger.open(menu, isResumingOnClose);
  }

  /**
   * @returns Spawnable sections grouped by kind.
   */
  public getCatalogue(): TDebugCatalogue {
    if (!this.catalogue) {
      this.catalogue = buildDebugCatalogue();
    }

    return this.catalogue;
  }

  /**
   * Remember the tab the debugger shows, to reopen on it.
   *
   * @param tab - Tab shown.
   */
  public selectTab(tab: EDebugTab): void {
    if (this.preferences.tab !== tab) {
      this.preferences.tab = tab;
      this.savePreferences();
    }
  }

  /**
   * Put a section first among the recent spawns.
   *
   * @param section - Section spawned.
   */
  public rememberSpawn(section: TSection): void {
    this.preferences.recentSpawns = pushRecentValue(
      this.preferences.recentSpawns,
      section,
      debugConfig.RECENT_SPAWNS_LIMIT
    );
    this.savePreferences();
  }

  /**
   * Put Lua the console ran first in its history.
   *
   * @param code - Lua run.
   */
  public rememberConsoleLine(code: string): void {
    this.preferences.consoleHistory = pushRecentValue(
      this.preferences.consoleHistory,
      code,
      debugConfig.CONSOLE_HISTORY_LIMIT
    );
    this.savePreferences();
  }

  /**
   * Write the preferences after a change.
   */
  public savePreferences(): void {
    saveDebugPreferences(this.preferences);
  }

  /**
   * Open the debugger from a level when its key is pressed, taking the object under the crosshair as the target.
   *
   * @param bind - Action bound to the pressed key.
   * @returns Whether the key opened the debugger and should not reach the game.
   */
  public onKeyPress(bind: TNumberId): boolean {
    if (bind !== debugConfig.KEY_BINDING || !forgeConfig.DEBUG.IS_ENABLED) {
      return false;
    }

    logger.info("Open debugger from level");

    pickDebugTargetOnOpen(this.target);

    this.isOpenRequested = true;
    executeConsoleCommand(consoleCommands.main_menu, "on");

    return true;
  }

  /**
   * Catch the main menu the debugger key opened. The menu announces itself while it is created, before the engine
   * shows it, so the debugger waits for the menu's first update to open over it.
   *
   * @param menu - Main menu being created.
   */
  public onMainMenuOn(menu: MainMenu): void {
    if (this.isOpenRequested) {
      this.isOpenRequested = false;
      this.requestedMenu = menu;

      getManager(EventsManager).registerCallback(EGameEvent.MAIN_MENU_UPDATE, this.onMainMenuUpdate, this);
    }
  }

  /**
   * Open the debugger requested from a level over the main menu its key opened, now shown.
   */
  public onMainMenuUpdate(): void {
    const menu: Nillable<MainMenu> = this.requestedMenu;

    getManager(EventsManager).unregisterCallback(EGameEvent.MAIN_MENU_UPDATE, this.onMainMenuUpdate);
    this.requestedMenu = null;

    if (menu) {
      this.openDebugger(menu, true);
    }
  }

  /**
   * Remember an info portion the actor gained or lost, for the quests tab to list first.
   *
   * @param object - Actor.
   * @param name - Info portion.
   */
  public onInfoPortionChanged(object: GameObject, name: TName): void {
    this.recentInfoPortions = pushRecentValue(this.recentInfoPortions, name, debugConfig.RECENT_INFO_PORTIONS_LIMIT);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   * @returns Dumped data.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      target: this.target,
      preferences: this.preferences,
    };

    return data;
  }
}
