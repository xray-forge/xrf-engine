import { level } from "xray16";
import { ServerObject } from "xray16/alias";
import { LuaArray, Nillable, TCount, TIndex, TLabel, TNumberId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { IDebugSimulationRecord } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { formatDebugGameDuration, getDebugObjectLevelName } from "@/engine/core/managers/debug/utils/debug_inspect";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import type { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";

/**
 * @param id - Object id.
 * @returns Name of the object, or a note when it no longer exists.
 */
function getObjectName(id: Nillable<TNumberId>): TLabel {
  const serverObject: Nillable<ServerObject> = $isNil(id) ? null : registry.simulator.object(id);

  return $isNil(serverObject) ? `nothing (${id})` : serverObject.name();
}

/**
 * Records what the simulation does while recording is on: squads created, assigned, moving, staying, losing members and
 * released, and terrains respawning. Subscribes to the simulation events only while recording, so it costs nothing
 * otherwise, and keeps the latest records in a ring.
 */
export class DebugSimulationRecorder {
  public isRecording: boolean = false;
  // Ring of the latest records, `next` the slot the next record takes.
  public records: LuaArray<IDebugSimulationRecord> = new LuaTable();
  public next: TIndex = 1;
  public serial: TCount = 0;
  // Last recorded action of each squad, as `type target`: scripted squads renew the same stay on every update.
  public actions: LuaTable<TNumberId, TLabel> = new LuaTable();

  /**
   * Start recording.
   */
  public start(): void {
    if (this.isRecording) {
      return;
    }

    const eventsManager: EventsManager = getManager(EventsManager);

    this.isRecording = true;

    eventsManager.registerCallback(EGameEvent.SQUAD_REGISTERED, this.onSquadRegistered, this);
    eventsManager.registerCallback(EGameEvent.SQUAD_UNREGISTERED, this.onSquadUnregistered, this);
    eventsManager.registerCallback(EGameEvent.SQUAD_RELEASED, this.onSquadReleased, this);
    eventsManager.registerCallback(EGameEvent.SQUAD_TERRAIN_ASSIGNED, this.onSquadTerrainAssigned, this);
    eventsManager.registerCallback(EGameEvent.SQUAD_ACTION_SELECTED, this.onSquadActionSelected, this);
    eventsManager.registerCallback(EGameEvent.SQUAD_MEMBER_DIED, this.onSquadMemberDied, this);
    eventsManager.registerCallback(EGameEvent.SMART_TERRAIN_SQUAD_RESPAWNED, this.onTerrainSquadRespawned, this);
  }

  /**
   * Stop recording, keeping the records.
   */
  public stop(): void {
    if (!this.isRecording) {
      return;
    }

    const eventsManager: EventsManager = getManager(EventsManager);

    this.isRecording = false;

    eventsManager.unregisterCallback(EGameEvent.SQUAD_REGISTERED, this.onSquadRegistered);
    eventsManager.unregisterCallback(EGameEvent.SQUAD_UNREGISTERED, this.onSquadUnregistered);
    eventsManager.unregisterCallback(EGameEvent.SQUAD_RELEASED, this.onSquadReleased);
    eventsManager.unregisterCallback(EGameEvent.SQUAD_TERRAIN_ASSIGNED, this.onSquadTerrainAssigned);
    eventsManager.unregisterCallback(EGameEvent.SQUAD_ACTION_SELECTED, this.onSquadActionSelected);
    eventsManager.unregisterCallback(EGameEvent.SQUAD_MEMBER_DIED, this.onSquadMemberDied);
    eventsManager.unregisterCallback(EGameEvent.SMART_TERRAIN_SQUAD_RESPAWNED, this.onTerrainSquadRespawned);
  }

  /**
   * Forget every record.
   */
  public clear(): void {
    this.records = new LuaTable();
    this.actions = new LuaTable();
    this.next = 1;
  }

  /**
   * @param id - Squad or smart terrain id, `null` for every record.
   * @param limit - Most records to return.
   * @returns The records, of the object when one is given, newest first.
   */
  public getRecords(
    id: Nillable<TNumberId> = null,
    limit: TCount = debugConfig.SIMULATION_RECORDS_LIMIT
  ): LuaArray<IDebugSimulationRecord> {
    const result: LuaArray<IDebugSimulationRecord> = new LuaTable();
    const count: TCount = this.records.length();

    for (const step of $range(1, count)) {
      // Walks back from the newest record, wrapping around the ring.
      const record: IDebugSimulationRecord = this.records.get(((this.next - step - 1 + count) % count) + 1);

      if ($isNil(id) || record.id === id) {
        table.insert(result, record);

        if (result.length() >= limit) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Record an event, dropping the oldest record once the ring is full.
   *
   * @param serverObject - Squad or smart terrain the event is about.
   * @param text - What happened, after the object's name.
   */
  public record(serverObject: ServerObject, text: TLabel): void {
    this.serial += 1;

    this.records.set(this.next, {
      serial: this.serial,
      time: string.format("%02d:%02d", level.get_time_hours(), level.get_time_minutes()),
      id: serverObject.id,
      name: serverObject.name(),
      level: getDebugObjectLevelName(serverObject),
      text,
    });

    this.next = (this.next % debugConfig.SIMULATION_RECORDS_LIMIT) + 1;
  }

  public onSquadRegistered(squad: Squad): void {
    this.record(squad, `created`);
  }

  public onSquadUnregistered(squad: Squad): void {
    this.actions.delete(squad.id);
    this.record(squad, `removed`);
  }

  public onSquadReleased(squad: Squad): void {
    this.record(squad, `released`);
  }

  public onSquadTerrainAssigned(
    squad: Squad,
    terrainId: Nillable<TNumberId>,
    previousTerrainId: Nillable<TNumberId>
  ): void {
    if ($isNil(terrainId)) {
      this.record(squad, `leaves ${getObjectName(previousTerrainId)}`);
    } else if ($isNil(previousTerrainId)) {
      this.record(squad, `joins ${getObjectName(terrainId)}`);
    } else {
      this.record(squad, `joins ${getObjectName(terrainId)}, from ${getObjectName(previousTerrainId)}`);
    }
  }

  public onSquadActionSelected(squad: Squad): void {
    const action: TLabel = `${squad.currentAction?.type} ${squad.assignedTargetId}`;

    if (this.actions.get(squad.id) === action) {
      return;
    }

    this.actions.set(squad.id, action);

    if (squad.currentAction?.type === ESquadActionType.STAY_ON_TARGET) {
      this.record(
        squad,
        `stays at ${getObjectName(squad.currentTargetId)} for ${formatDebugGameDuration(
          (squad.currentAction as SquadStayOnTargetAction).actionIdleTime
        )}`
      );
    } else {
      this.record(squad, `heads to ${getObjectName(squad.assignedTargetId)}`);
    }
  }

  public onSquadMemberDied(squad: Squad, object: ServerObject): void {
    this.record(squad, `lost ${object.name()}, ${squad.npc_count()} left`);
  }

  public onTerrainSquadRespawned(terrain: SmartTerrain, squad: Squad): void {
    this.record(terrain, `respawned ${squad.name()}, ${squad.respawnPointSection}`);
  }
}
