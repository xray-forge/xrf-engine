import { GameObject, NetPacket, NetProcessor } from "xray16/alias";
import { AnyObject, TNumberId, TStringId } from "xray16/lib";
import { $fromObject, $isNil } from "xray16/macros";

import { closeLoadMarker, closeSaveMarker, getManager, openLoadMarker, openSaveMarker } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGenericPhraseCategory, TPhrasesPriorityMap } from "@/engine/core/managers/dialogs/dialog_types";
import { dialogConfig } from "@/engine/core/managers/dialogs/DialogConfig";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";

/**
 * Manager of dialogs interaction / scripting when actor is speaking to stalker objects.
 */
export class DialogManager extends AbstractManager {
  // Phrases disabled until the next conversation with the object | object id -> phrase id -> boolean.
  public disabledPhrases: LuaTable<TNumberId, LuaTable<TStringId, boolean>> = new LuaTable();
  // Phrases disabled by quests for the rest of the game session | object id -> phrase id -> boolean.
  public questDisabledPhrases: LuaTable<TNumberId, LuaTable<TStringId, boolean>> = new LuaTable();

  public priorityTable: LuaTable<EGenericPhraseCategory, TPhrasesPriorityMap> = $fromObject({
    [EGenericPhraseCategory.HELLO]: new LuaTable(),
    [EGenericPhraseCategory.JOB]: new LuaTable(),
    [EGenericPhraseCategory.ANOMALIES]: new LuaTable(),
    [EGenericPhraseCategory.PLACE]: new LuaTable(),
    [EGenericPhraseCategory.INFORMATION]: new LuaTable(),
  } as Record<EGenericPhraseCategory, TPhrasesPriorityMap>);

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.STALKER_INTERACTION, this.onInteractWithObject, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.STALKER_INTERACTION, this.onInteractWithObject);
  }

  /**
   * Save dialogs data for provided object.
   *
   * @param object - Game object to save data for.
   * @param packet - Net packet to save data to.
   */
  public saveObjectDialogs(object: GameObject, packet: NetPacket): void {
    const objectId: TNumberId = object.id();

    openSaveMarker(packet, DialogManager.name);

    packet.w_bool(this.priorityTable.get(EGenericPhraseCategory.HELLO).has(objectId));
    packet.w_bool(this.priorityTable.get(EGenericPhraseCategory.JOB).has(objectId));
    packet.w_bool(this.priorityTable.get(EGenericPhraseCategory.ANOMALIES).has(objectId));
    packet.w_bool(this.priorityTable.get(EGenericPhraseCategory.PLACE).has(objectId));
    packet.w_bool(this.priorityTable.get(EGenericPhraseCategory.INFORMATION).has(objectId));

    closeSaveMarker(packet, DialogManager.name);
  }

  /**
   * Load object dialogs data.
   *
   * @param object - Game object to save data for.
   * @param reader - Net reader to read data from.
   */
  public loadObjectDialogs(object: GameObject, reader: NetProcessor): void {
    openLoadMarker(reader, DialogManager.name);

    reader.r_bool();
    reader.r_bool();
    reader.r_bool();
    reader.r_bool();
    reader.r_bool();

    closeLoadMarker(reader, DialogManager.name);
  }

  /**
   * Check whether provided phrase was told to object with provided ID.
   *
   * @param objectId - Target object ID.
   * @param phrase - Phrase to check.
   *
   * @returns Whether phrase was already told.
   */
  public isObjectPhraseCategoryTold(objectId: TNumberId, phrase: EGenericPhraseCategory): boolean {
    return this.priorityTable.get(phrase).get(objectId)?.told === true;
  }

  /**
   * Disable phrase for object.
   *
   * @param objectId - Target object ID.
   * @param phraseId - Target phrase ID.
   */
  public disableObjectPhrase(objectId: TNumberId, phraseId: TStringId): void {
    if ($isNil(this.disabledPhrases.get(objectId))) {
      this.disabledPhrases.set(objectId, new LuaTable());
    }

    this.disabledPhrases.get(objectId).set(phraseId, true);
  }

  /**
   * Reset disabled phrases for provided object.
   *
   * @param objectId - Target object ID.
   */
  public resetObjectPhrases(objectId: TNumberId): void {
    this.disabledPhrases.delete(objectId);
  }

  /**
   * Store currently active speaker as side effect of interaction with game object.
   * Kept after the talk window closes, as the engine closes it before opening upgrades that read the speaker.
   *
   * @param object - Game object interacting with.
   */
  public onInteractWithObject(object: GameObject): void {
    dialogConfig.ACTIVE_SPEAKER = object;
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      dialogConfig: dialogConfig,
      disabledPhrases: this.disabledPhrases,
      questDisabledPhrases: this.questDisabledPhrases,
      priorityTable: this.priorityTable,
    };

    return data;
  }
}
