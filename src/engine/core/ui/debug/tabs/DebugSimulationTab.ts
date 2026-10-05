import { CUI3tButton, CUIScrollView, CUITabControl, LuabindClass } from "xray16";
import { LuaArray, Nillable, TLabel, TNumberId, TPath } from "xray16/lib";
import { $fromArray, $isNil, $isNotNil } from "xray16/macros";

import {
  EDebugOverlayView,
  EDebugSimulationView,
  EDebugTab,
  IDebugSimulationEntry,
} from "@/engine/core/managers/debug/debug_types";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import type { DebugSimulationRecorder } from "@/engine/core/managers/debug/DebugSimulationRecorder";
import { isDebugOverlayViewShown } from "@/engine/core/managers/debug/utils/debug_overlay";
import {
  buildDebugSimulationEntries,
  getDebugSimulationSquad,
  getDebugSimulationTerrain,
} from "@/engine/core/managers/debug/utils/debug_simulation";
import {
  clearDebugTerrainSquads,
  respawnDebugTerrainSquad,
  sendDebugSquadToTarget,
} from "@/engine/core/managers/debug/utils/debug_simulation_actions";
import { inspectDebugSimulationLevel } from "@/engine/core/managers/debug/utils/debug_simulation_level";
import { inspectDebugSquad } from "@/engine/core/managers/debug/utils/debug_simulation_squad";
import { inspectDebugTerrain } from "@/engine/core/managers/debug/utils/debug_simulation_terrain";
import {
  releaseDebugTarget,
  teleportActorToDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_target_actions";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugBrowserTab } from "@/engine/core/ui/debug/tabs/DebugBrowserTab";
import { isGameStarted } from "@/engine/core/utils/game";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugSimulationTab.component";

/**
 * Simulation tab: squads, smart terrains and levels of the A-Life simulation, with why squads pick their targets and
 * what to do with the one selected.
 */
@LuabindClass()
export class DebugSimulationTab extends DebugBrowserTab<IDebugSimulationEntry> {
  public uiViews!: CUITabControl;
  public uiFields!: CUIScrollView;
  public uiRecordButton!: CUI3tButton;
  public uiPinButton!: CUI3tButton;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.SIMULATION, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "browser_background",
      "fields_background",
      "heading_go",
      "heading_squad",
      "send_hint",
      "heading_terrain",
      "heading_events"
    );

    this.initializeBrowser();

    this.uiViews = this.initializeTabControl("views", () => this.onViewChanged());
    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("target_button", () => this.onTarget());
    this.initializeButton("teleport_button", () => this.onTeleport());
    this.uiPinButton = this.initializeButton("pin_button", () => this.onPin());
    this.initializeButton("send_button", () => this.onSendToTarget());
    this.initializeButton("release_button", () => this.onSquadAction((squad) => releaseDebugTarget(squad.id)));
    this.initializeButton("respawn_button", () => this.onTerrainAction(respawnDebugTerrainSquad));
    this.initializeButton("clear_button", () => this.onTerrainAction(clearDebugTerrainSquads));
    this.uiRecordButton = this.initializeButton("record_button", () => this.onRecordToggled());
    this.initializeButton("clear_events_button", () => this.onClearEvents());

    this.uiViews.SetActiveTab(this.owner.manager.preferences.simulationView);
  }

  /**
   * Rebuild the rows, as the simulation changes while the debugger is closed.
   */
  public override refresh(): void {
    const manager: DebugManager = this.owner.manager;

    this.fillEntries();
    this.refreshBrowser();
    this.refreshSelection();

    this.uiRecordButton
      .TextControl()
      .SetText(manager.simulationRecorder.isRecording ? "stop recording" : "start recording");
    this.uiPinButton
      .TextControl()
      .SetText(
        $isNotNil(manager.pinnedSimulationId) && manager.pinnedSimulationId === this.selected?.id
          ? "unpin from overlay"
          : "pin to overlay"
      );
  }

  /**
   * Show the view picked in the views strip.
   */
  public onViewChanged(): void {
    const view: EDebugSimulationView = this.uiViews.GetActiveId() as EDebugSimulationView;

    if (view !== this.owner.manager.preferences.simulationView) {
      this.owner.manager.preferences.simulationView = view;
      this.owner.manager.savePreferences();
    }

    this.pager.page = 1;
    this.selected = null;
    this.refresh();
  }

  /**
   * Make the selected squad or terrain the debugger target.
   */
  public onTarget(): void {
    if ($isNil(this.selected?.id)) {
      return this.owner.report("select a squad or a smart terrain to target");
    }

    this.owner.setTarget(this.selected.id);
    this.owner.report(`targeted ${this.selected.label}`);
  }

  /**
   * Teleport to the selected squad or terrain, closing the debugger.
   */
  public onTeleport(): void {
    if (!isGameStarted()) {
      return this.owner.report("no game running");
    } else if ($isNil(this.selected?.id)) {
      return this.owner.report("select a squad or a smart terrain to teleport to");
    }

    this.owner.report(teleportActorToDebugTarget(this.selected.id));
    this.owner.resume();
  }

  /**
   * Make the overlay's simulation view follow the selected squad or terrain, or stop following it.
   */
  public onPin(): void {
    const manager: DebugManager = this.owner.manager;
    const selected: Nillable<IDebugSimulationEntry> = this.selected;

    if ($isNil(selected?.id)) {
      return this.owner.report("select a squad or a smart terrain to pin");
    } else if (manager.pinnedSimulationId === selected.id) {
      manager.pinSimulationObject(null);

      return this.owner.onAction("unpinned from the overlay");
    }

    manager.pinSimulationObject(selected.id);

    this.owner.onAction(
      isDebugOverlayViewShown(manager.preferences, EDebugOverlayView.SIMULATION)
        ? `the overlay follows ${selected.label}`
        : `pinned ${selected.label}, show the simulation view in the overlay tab`
    );
  }

  /**
   * Start or stop recording simulation events.
   */
  public onRecordToggled(): void {
    const recorder: DebugSimulationRecorder = this.owner.manager.simulationRecorder;

    if (recorder.isRecording) {
      recorder.stop();
      this.owner.onAction("stopped recording simulation events");
    } else {
      recorder.start();
      this.owner.onAction("recording simulation events while the game runs");
    }
  }

  /**
   * Forget the recorded simulation events.
   */
  public onClearEvents(): void {
    this.owner.manager.simulationRecorder.clear();
    this.owner.onAction("cleared simulation events");
  }

  /**
   * Send the selected squad to the debugger target.
   */
  public onSendToTarget(): void {
    const targetId: Nillable<TNumberId> = this.owner.manager.target.id;

    this.onSquadAction((squad) =>
      $isNil(targetId) ? "target a smart terrain, a squad or the actor first" : sendDebugSquadToTarget(squad, targetId)
    );
  }

  /**
   * Run an action on the selected squad.
   *
   * @param action - Action returning its result message.
   */
  public onSquadAction(action: (squad: Squad) => TLabel): void {
    const squad: Nillable<Squad> = $isNil(this.selected?.id) ? null : getDebugSimulationSquad(this.selected.id);

    if (!isGameStarted()) {
      this.owner.report("no game running");
    } else if ($isNil(squad)) {
      this.owner.report("select a squad");
    } else {
      this.owner.onAction(action(squad));
    }
  }

  /**
   * Run an action on the selected smart terrain.
   *
   * @param action - Action returning its result message.
   */
  public onTerrainAction(action: (terrain: SmartTerrain) => TLabel): void {
    const terrain: Nillable<SmartTerrain> = $isNil(this.selected?.id)
      ? null
      : getDebugSimulationTerrain(this.selected.id);

    if (!isGameStarted()) {
      this.owner.report("no game running");
    } else if ($isNil(terrain)) {
      this.owner.report("select a smart terrain");
    } else {
      this.owner.onAction(action(terrain));
    }
  }

  protected override buildEntries(): LuaArray<IDebugSimulationEntry> {
    return isGameStarted()
      ? buildDebugSimulationEntries(
          this.owner.manager.preferences.simulationView,
          this.owner.manager.simulationRecorder.getRecords()
        )
      : new LuaTable();
  }

  protected override isSameEntry(first: IDebugSimulationEntry, second: IDebugSimulationEntry): boolean {
    return first.id === second.id && first.level === second.level && first.serial === second.serial;
  }

  protected override refreshSelection(): void {
    const id: Nillable<TNumberId> = this.selected?.id;
    const squad: Nillable<Squad> = $isNil(id) ? null : getDebugSimulationSquad(id);
    const terrain: Nillable<SmartTerrain> = $isNil(id) ? null : getDebugSimulationTerrain(id);

    if ($isNil(this.selected)) {
      this.fillFieldList(this.uiFields, $fromArray([{ label: "selected", value: "nothing" }]));
    } else if (squad) {
      this.fillFieldList(this.uiFields, inspectDebugSquad(squad));
    } else if (terrain) {
      this.fillFieldList(this.uiFields, inspectDebugTerrain(terrain));
    } else if ($isNil(id)) {
      this.fillFieldList(this.uiFields, inspectDebugSimulationLevel(this.selected.level));
    } else {
      this.fillFieldList(this.uiFields, $fromArray([{ label: "selected", value: "gone from the simulation" }]));
    }
  }
}
