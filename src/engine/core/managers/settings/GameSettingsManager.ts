import { level } from "xray16";
import { NetPacket, NetProcessor } from "xray16/alias";
import {
  AnyObject,
  consoleCommands,
  EGameDifficulty,
  executeConsoleCommand,
  gameDifficultiesByNumber,
} from "xray16/lib";

import { closeLoadMarker, closeSaveMarker, getManager, openLoadMarker, openSaveMarker } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";

/**
 * Manage game settings and options.
 */
export class GameSettingsManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, GameSettingsManager.name);

    packet.w_u8(level.get_game_difficulty());

    closeSaveMarker(packet, GameSettingsManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, GameSettingsManager.name);

    executeConsoleCommand(
      consoleCommands.g_game_difficulty,
      gameDifficultiesByNumber[reader.r_u8() as EGameDifficulty]
    );

    closeLoadMarker(reader, GameSettingsManager.name);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      gameDifficulty: level.get_game_difficulty(),
    };

    return data;
  }
}
