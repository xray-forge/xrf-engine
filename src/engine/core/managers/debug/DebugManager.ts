import { get_hud } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, executeConsoleCommand, LuaArray, Nillable, TName, TNumberId, TSection } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { consoleCommands } from "@/engine/constants/console_commands";
import { getManager, registry } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { AbstractManager } from "@/engine/core/managers/abstract";
import {
  EDebugOverlaySlot,
  EDebugOverlayView,
  EDebugTab,
  IDebugFlow,
  IDebugFlowResult,
  IDebugPreferences,
  IDebugTarget,
} from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { buildDebugCatalogue, TDebugCatalogue } from "@/engine/core/managers/debug/utils/debug_catalogue";
import { runDebugFlow } from "@/engine/core/managers/debug/utils/debug_flows";
import {
  createDebugPreferences,
  loadDebugPreferences,
  saveDebugPreferences,
} from "@/engine/core/managers/debug/utils/debug_preferences";
import { pickDebugTargetOnOpen, pruneDebugTargets } from "@/engine/core/managers/debug/utils/debug_target";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugOverlay } from "@/engine/core/ui/debug/DebugOverlay";
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
  // Overlay drawn over the level while it is enabled, made anew for each level.
  public uiOverlay: Nillable<DebugOverlay> = null;
  // Flow the overlay follows, and its last quiet run.
  public pinnedFlow: Nillable<IDebugFlow> = null;
  public pinnedFlowResult: Nillable<IDebugFlowResult> = null;
  // Whether the pinned flow's last run predates an info portion change.
  public isPinnedFlowStale: boolean = false;

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    this.preferences = loadDebugPreferences();

    eventsManager.registerCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onActorFirstUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_OFFLINE, this.hideOverlay, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_INFO_ADDED, this.onInfoPortionChanged, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_INFO_REMOVED, this.onInfoPortionChanged, this);
    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_ON, this.onMainMenuOn);
    eventsManager.unregisterCallback(EGameEvent.MAIN_MENU_UPDATE, this.onMainMenuUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onActorFirstUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_OFFLINE, this.hideOverlay);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_INFO_ADDED, this.onInfoPortionChanged);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_INFO_REMOVED, this.onInfoPortionChanged);
    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);

    this.hideOverlay();
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
   * Turn the overlay on or off, remembering it for later sessions.
   *
   * @param isEnabled - Whether the overlay shows.
   */
  public setOverlayEnabled(isEnabled: boolean): void {
    this.preferences.isOverlayEnabled = isEnabled;
    this.savePreferences();

    if (isEnabled && $isNotNil(registry.actor)) {
      this.showOverlay();
    } else {
      this.hideOverlay();
    }
  }

  /**
   * Show the next view in an overlay slot.
   *
   * @param slot - Overlay slot.
   * @returns View the slot shows now.
   */
  public cycleOverlayView(slot: EDebugOverlaySlot): EDebugOverlayView {
    const views: LuaArray<EDebugOverlayView> = debugConfig.OVERLAY_VIEWS;
    // The last view, and one a later build no longer has, wrap to the first.
    let next: EDebugOverlayView = views.get(1);

    for (const index of $range(1, views.length() - 1)) {
      if (views.get(index) === this.preferences.overlayViews[slot]) {
        next = views.get(index + 1);
      }
    }

    this.preferences.overlayViews[slot] = next;
    this.savePreferences();
    this.refreshOverlay();

    return next;
  }

  /**
   * Make a flow the one the overlay follows, or stop following one.
   *
   * @param flow - Flow to follow, `null` to stop.
   */
  public pinFlow(flow: Nillable<IDebugFlow>): void {
    this.pinnedFlow = flow;
    this.pinnedFlowResult = null;
    this.refreshPinnedFlow();
  }

  /**
   * Run the pinned flow quietly, without travel, to show where its walk stands. A run that fails to load, as after
   * flows are cleaned, unpins the flow.
   */
  public refreshPinnedFlow(): void {
    const flow: Nillable<IDebugFlow> = this.pinnedFlow;

    this.isPinnedFlowStale = false;

    if ($isNil(flow) || !isGameStarted() || $isNil(registry.actor)) {
      return;
    }

    const [isCompleted, result] = pcall(() => runDebugFlow(flow, false, false));

    if (isCompleted) {
      this.pinnedFlowResult = result;
    } else {
      logger.info("Cannot run pinned flow %s: %s", flow.identity, result);
      this.pinnedFlow = null;
      this.pinnedFlowResult = null;
    }

    this.refreshOverlay();
  }

  /**
   * Show what the overlay panels follow now.
   */
  public refreshOverlay(): void {
    this.uiOverlay?.refresh(this.preferences.overlayViews, {
      targetId: this.target.id,
      flow: this.pinnedFlow,
      flowResult: this.pinnedFlowResult,
    });
  }

  /**
   * Draw the overlay over the level, refreshing it twice a second and the pinned flow every ten seconds, or sooner after
   * an info portion change.
   */
  public showOverlay(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    if ($isNil(this.uiOverlay)) {
      this.uiOverlay = new DebugOverlay();
      get_hud().AddDialogToRender(this.uiOverlay);
    }

    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE_500, this.onOverlayUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE_10000, this.refreshPinnedFlow, this);

    this.refreshOverlay();
  }

  /**
   * Stop drawing the overlay. Leaving a level hides it too, as the level's HUD goes with it.
   */
  public hideOverlay(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE_500, this.onOverlayUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE_10000, this.refreshPinnedFlow);

    if ($isNotNil(this.uiOverlay)) {
      // A level being unloaded may have dropped its HUD already, and the overlay with it.
      get_hud()?.RemoveDialogToRender(this.uiOverlay);
      this.uiOverlay = null;
    }
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
    // A dialog can change several in a row, so the overlay's next refresh runs the flow once for all of them.
    this.isPinnedFlowStale = $isNotNil(this.pinnedFlow);
  }

  /**
   * Refresh the overlay, running the pinned flow first when it is stale.
   */
  public onOverlayUpdate(): void {
    if (this.isPinnedFlowStale) {
      this.refreshPinnedFlow();
    } else {
      this.refreshOverlay();
    }
  }

  /**
   * Show the overlay over a level just loaded, when it is enabled.
   */
  public onActorFirstUpdate(): void {
    if (this.preferences.isOverlayEnabled && forgeConfig.DEBUG.IS_ENABLED) {
      this.showOverlay();
    }
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
