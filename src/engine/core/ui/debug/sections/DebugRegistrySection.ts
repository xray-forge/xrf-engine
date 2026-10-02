import { CUI3tButton, CUICheckButton, CUIListBox, CUIStatic, LuabindClass, ui_events } from "xray16";
import { AlifeSimulator } from "xray16/alias";
import { Nillable, TCount, TPath } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { AbstractDebugSection } from "@/engine/core/ui/debug/sections/AbstractDebugSection";
import { LuaLogger } from "@/engine/core/utils/logging";
import { EElementType, initializeElement, resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\debug\\DebugRegistrySection.component";

/**
 * Debugging of game objects registry / database.
 */
@LuabindClass()
export class DebugRegistrySection extends AbstractDebugSection {
  public uiLogGeneralReportButton!: CUI3tButton;
  public uiRegistryCountLabel!: CUIStatic;
  public uiRegistryFilterOnline: CUICheckButton = null!;

  public uiRegistryList!: CUIListBox;

  public filterIsOnline: boolean = true;

  public initializeControls(): void {
    resolveXmlFile(base, this.xml);

    initializeElement(this.xml, EElementType.FRAME, "registry_list_frame", this);

    this.uiRegistryCountLabel = initializeElement(this.xml, EElementType.STATIC, "registry_filter_count", this);
    this.uiLogGeneralReportButton = initializeElement(this.xml, EElementType.BUTTON, "log_general_report", this, {
      context: this.owner,
      [ui_events.BUTTON_CLICKED]: () => this.onPrintGeneralReport(),
    });

    this.uiRegistryFilterOnline = initializeElement(
      this.xml,
      EElementType.CHECK_BUTTON,
      "registry_filter_online",
      this,
      {
        context: this.owner,
        [ui_events.CHECK_BUTTON_RESET]: () => this.onToggleFilterOnline(),
        [ui_events.CHECK_BUTTON_SET]: () => this.onToggleFilterOnline(),
      }
    );

    this.uiRegistryList = initializeElement(this.xml, EElementType.LIST_BOX, "registry_list", this, {
      context: this.owner,
      [ui_events.LIST_ITEM_SELECT]: () => this.onSelectedObjectChange(),
    });
  }

  public override initializeState(): void {
    const simulator: Nillable<AlifeSimulator> = registry.simulator;

    this.uiRegistryFilterOnline.SetCheck(this.filterIsOnline);

    if ($isNotNil(simulator)) {
      let total: TCount = 0;

      this.uiRegistryList.Clear();

      simulator.iterate_objects((it): void => {
        const isValid: boolean = this.filterIsOnline ? it.online : true;

        if (isValid) {
          total += 1;

          this.uiRegistryList.AddTextItem(
            string.format(
              "#%s# - %s - %s - %s - %s",
              it.id,
              it.clsid(),
              it.online ? "online" : "offline",
              it.name(),
              it.section_name()
            )
          );
        }
      });

      this.uiRegistryCountLabel.SetText(string.format("Total: %s", total));
    }
  }

  /**
   * Report state of the registry.
   */
  public onPrintGeneralReport(): void {
    logger.pushSeparator();
    logger.info("General report of registry:");
    logger.info("Collections in registry: %s", Object.keys(registry).length);
    logger.info("Actor exists: %s", $isNotNil(registry.actor));
    logger.info("Managers exists: %s", Object.keys(registry.managers).length);
    logger.info("Schemes exists: %s", Object.keys(registry.schemes).length);
    logger.info("Actor combat: %s", Object.keys(registry.actorCombat).length);
    logger.info("Objects registered: %s", Object.keys(registry.objects).length);
    logger.info("Offline objects registered: %s", Object.keys(registry.offlineObjects).length);
    logger.info("Simulation objects registered: %s", Object.keys(registry.simulationObjects).length);
    logger.info("Story links: %s", Object.keys(registry.storyLink.idBySid).length);
    logger.info("Stalkers registered: %s", Object.keys(registry.stalkers).length);
    logger.info("Trade states registered: %s", Object.keys(registry.trade).length);
    logger.info("Camp stories registered: %s", Object.keys(registry.camps).length);
    logger.info("Crows count: %s", registry.crows.count);
    logger.info("Helicopter enemies registered: %s", Object.keys(registry.helicopter.enemies).length);
    logger.info("Helicopter registered: %s", Object.keys(registry.helicopter.storage).length);
    logger.info("Anomalies registered: %s", Object.keys(registry.anomalyZones).length);
    logger.info("Zones registered: %s", Object.keys(registry.zones).length);
    logger.info("Silence zones registered: %s", Object.keys(registry.silenceZones).length);
    logger.info("No weapon zones registered: %s", Object.keys(registry.noWeaponZones).length);
    logger.info("Light zones registered: %s", Object.keys(registry.lightZones).length);
    logger.info("Smart terrains registered: %s", Object.keys(registry.smartTerrains).length);
    logger.info("Smart covers registered: %s", Object.keys(registry.smartCovers).length);
    logger.info("Animated doors registered: %s", Object.keys(registry.doors).length);
    logger.info("Save markers registered: %s", Object.keys(registry.saveMarkers).length);
    logger.info("Signal lights registered: %s", Object.keys(registry.signalLights).length);
    logger.info("Spawned vertexes registered: %s", Object.keys(registry.spawnedVertexes).length);

    const eventsManager: EventsManager = getManager(EventsManager);

    logger.info("Event handlers exist: %s", Object.keys(eventsManager.subscribers).length);
    Object.keys(eventsManager.subscribers).forEach((key) => {
      const event: EGameEvent = key as unknown as EGameEvent;

      logger.info("*: %s %s", EGameEvent[event], eventsManager.getEventSubscribersCount(event));
    });

    logger.pushSeparator();
  }

  public onSelectedObjectChange(): void {
    logger.info("Selected another item");
  }

  public onToggleFilterOnline(): void {
    this.filterIsOnline = this.uiRegistryFilterOnline.GetCheck();
    this.initializeState();

    logger.info("Changed online filter: %s", this.filterIsOnline);
  }
}
