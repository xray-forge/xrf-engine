import { $filename } from "xray16/macros";

import { initializeManager } from "@/engine/core/database";
import { TAbstractCoreManagerConstructor } from "@/engine/core/managers/abstract";
import { ActorInputManager, ActorInventoryMenuManager } from "@/engine/core/managers/actor";
import { ArtefactManager } from "@/engine/core/managers/artefacts";
import { DatabaseManager } from "@/engine/core/managers/database";
import { ReleaseBodyManager } from "@/engine/core/managers/death";
import { DebugManager } from "@/engine/core/managers/debug";
import { DialogManager } from "@/engine/core/managers/dialogs";
import { EventsManager } from "@/engine/core/managers/events";
import { LoadScreenManager } from "@/engine/core/managers/interface";
import { LoadoutManager } from "@/engine/core/managers/loadout";
import { MapDisplayManager } from "@/engine/core/managers/map";
import { MusicManager } from "@/engine/core/managers/music";
import { NotificationManager } from "@/engine/core/managers/notifications";
import { PdaManager } from "@/engine/core/managers/pda";
import { PhantomManager } from "@/engine/core/managers/psy";
import { SaveManager } from "@/engine/core/managers/save";
import { GameSettingsManager } from "@/engine/core/managers/settings";
import { SimulationManager } from "@/engine/core/managers/simulation";
import { SleepManager } from "@/engine/core/managers/sleep";
import { SoundManager } from "@/engine/core/managers/sounds";
import { StatisticsManager } from "@/engine/core/managers/statistics";
import { TaskManager } from "@/engine/core/managers/tasks";
import { TradeManager } from "@/engine/core/managers/trade";
import { TravelManager } from "@/engine/core/managers/travel";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { UpgradesManager } from "@/engine/core/managers/upgrades";
import { WeatherManager } from "@/engine/core/managers/weather";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Register game managers and dispose existing ones.
 */
export function registerManagers(): void {
  const managers: Array<TAbstractCoreManagerConstructor> = [
    ActorInputManager,
    ActorInventoryMenuManager,
    ArtefactManager,
    DatabaseManager,
    DebugManager,
    DialogManager,
    EventsManager,
    GameSettingsManager,
    LoadScreenManager,
    LoadoutManager,
    MapDisplayManager,
    MusicManager,
    NotificationManager,
    PdaManager,
    PhantomManager,
    ReleaseBodyManager,
    SaveManager,
    SimulationManager,
    SleepManager,
    SoundManager,
    StatisticsManager,
    TaskManager,
    TradeManager,
    TravelManager,
    TreasureManager,
    UpgradesManager,
    WeatherManager,
  ];

  logger.info("Register game managers: %s", managers.length);

  for (const manager of managers) {
    initializeManager(manager);
  }
}
