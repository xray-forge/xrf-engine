import { NetPacket, NetProcessor } from "xray16/alias";
import { TName } from "xray16/lib";
import { $filename } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { loadExtension, saveExtension } from "@/engine/core/extensions";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { ActorInputManager } from "@/engine/core/managers/actor";
import { ArtefactManager } from "@/engine/core/managers/artefacts";
import { ReleaseBodyManager } from "@/engine/core/managers/death";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { PsyAntennaManager } from "@/engine/core/managers/psy";
import { GameSettingsManager } from "@/engine/core/managers/settings";
import { SimulationManager } from "@/engine/core/managers/simulation";
import { SoundManager } from "@/engine/core/managers/sounds";
import { StatisticsManager } from "@/engine/core/managers/statistics";
import { SurgeManager } from "@/engine/core/managers/surge";
import { TaskManager } from "@/engine/core/managers/tasks";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { WeatherManager } from "@/engine/core/managers/weather";
import { loadDynamicGameSave, saveDynamicGameSave } from "@/engine/core/utils/game_save";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage game saves for other managers / parts.
 */
export class SaveManager extends AbstractManager {
  /**
   * Save core managers data.
   */
  public clientSave(packet: NetPacket): void {
    logger.info("Saving client data");

    getManager(WeatherManager).save(packet);
    getManager(ReleaseBodyManager).save(packet);
    getManager(SurgeManager).save(packet);
    getManager(ArtefactManager).save(packet);
    PsyAntennaManager.save(packet);
    getManager(SoundManager).save(packet);
    getManager(StatisticsManager).save(packet);
    getManager(TreasureManager).save(packet);
    getManager(TaskManager).save(packet);
    getManager(ActorInputManager).save(packet);
    getManager(GameSettingsManager).save(packet);
    getManager(DeimosManager).save(packet);
  }

  /**
   * Load core managers data.
   */
  public clientLoad(reader: NetProcessor): void {
    logger.info("Loading client data");

    getManager(WeatherManager).load(reader);
    getManager(ReleaseBodyManager).load(reader);
    getManager(SurgeManager).load(reader);
    getManager(ArtefactManager).load(reader);
    PsyAntennaManager.load(reader);
    getManager(SoundManager).load(reader);
    getManager(StatisticsManager).load(reader);
    getManager(TreasureManager).load(reader);
    getManager(TaskManager).load(reader);
    getManager(ActorInputManager).load(reader);
    getManager(GameSettingsManager).load(reader);
    getManager(DeimosManager).load(reader);
  }

  /**
   * Write state for core managers.
   */
  public serverSave(packet: NetPacket): void {
    logger.info("Saving server data");

    getManager(SimulationManager).save(packet);
  }

  /**
   * Read state for core managers.
   */
  public serverLoad(reader: NetProcessor): void {
    logger.info("Loading server data");

    getManager(SimulationManager).load(reader);
  }

  /**
   * When game save creation starting.
   *
   * @param saveName - Name of save file, just base name with extension like `example.scop`.
   */
  public onBeforeGameSave(saveName: TName): void {
    logger.info("Before game save: %s", saveName);

    EventsManager.emitEvent(EGameEvent.GAME_SAVE, saveName, registry.dynamicData.event);

    for (const [, extension] of registry.extensions) {
      saveExtension(extension);
    }

    saveDynamicGameSave(saveName, registry.dynamicData);
  }

  /**
   * When game saved successfully.
   *
   * @param saveName - Name of save file, just base name with extension like `example.scop`.
   */
  public onGameSave(saveName: TName): void {
    logger.info("On game save: %s", saveName);

    EventsManager.emitEvent(EGameEvent.GAME_SAVED, saveName);
  }

  /**
   * When game loading starts.
   *
   * @param saveName - Name of save file, full path with disk/system folders structure.
   */
  public onGameLoad(saveName: TName): void {
    logger.info("On game load: %s", saveName);

    registry.dynamicData = loadDynamicGameSave(saveName) ?? registry.dynamicData;

    for (const [, extension] of registry.extensions) {
      loadExtension(extension);
    }

    EventsManager.emitEvent(EGameEvent.GAME_LOAD, saveName, registry.dynamicData.event);
  }

  /**
   * When game loaded successfully.
   *
   * @param saveName - Name of save file, full path with disk/system folders structure.
   */
  public onAfterGameLoad(saveName: TName): void {
    logger.info("On after game load: %s", saveName);

    EventsManager.emitEvent(EGameEvent.GAME_LOADED, saveName);
  }
}
