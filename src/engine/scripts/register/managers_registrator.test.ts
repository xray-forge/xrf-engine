import { beforeEach, describe, expect, it } from "@jest/globals";
import { AnyObject } from "xray16/lib";

import { registry } from "@/engine/core/database";
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
import { SurgeManager } from "@/engine/core/managers/surge";
import { TaskManager } from "@/engine/core/managers/tasks";
import { TradeManager } from "@/engine/core/managers/trade";
import { TravelManager } from "@/engine/core/managers/travel";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { UpgradesManager } from "@/engine/core/managers/upgrades";
import { WeatherManager } from "@/engine/core/managers/weather";
import { registerManagers } from "@/engine/scripts/register/managers_registrator";
import { resetRegistry } from "@/fixtures/engine";

describe("managers_registrator entry point", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("registerSchemeModules should correctly re-register required managers", () => {
    registerManagers();

    expect((registry.managers as AnyObject).size).toBe(28);

    [
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
      SurgeManager,
      TaskManager,
      TradeManager,
      TravelManager,
      TreasureManager,
      UpgradesManager,
      WeatherManager,
    ].forEach((it) => expect(registry.managers.has(it)).toBe(true));
  });
});
