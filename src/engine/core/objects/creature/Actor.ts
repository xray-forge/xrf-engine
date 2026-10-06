import { CALifeSmartTerrainTask, cse_alife_creature_actor, LuabindClass } from "xray16";
import { ALifeSmartTerrainTask, GameObject, NetPacket, ServerObject } from "xray16/alias";
import { ACTOR, Nillable, TName, TRate, TRUE, TSize } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openSaveMarker,
  registerActorServer,
  registerStoryLink,
  registry,
  softResetOfflineObject,
  unregisterActorServer,
  unregisterStoryLinkByObjectId,
} from "@/engine/core/database";
import { openLoadMarker } from "@/engine/core/database/save_markers";
import { registerSimulationObject, unregisterSimulationObject } from "@/engine/core/database/simulation";
import { parseConditionsList, pickSectionFromCondList, TConditionList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SaveManager } from "@/engine/core/managers/save/SaveManager";
import { simulationActivities } from "@/engine/core/managers/simulation/activity";
import {
  ESimulationTargetRejection,
  ISimulationTarget,
  TSimulationActivityPrecondition,
} from "@/engine/core/managers/simulation/types";
import { assignSimulationSquadToTerrain, getSimulationTerrainByName } from "@/engine/core/managers/simulation/utils";
import { ESmartTerrainStatus } from "@/engine/core/objects/smart_terrain/smart_terrain_types";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { Squad } from "@/engine/core/objects/squad/Squad";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Actor server representation.
 * Generic registration logic and extension for simulation implementation.
 */
@LuabindClass()
export class Actor extends cse_alife_creature_actor implements ISimulationTarget {
  public isSimulationAvailableConditionList: TConditionList = parseConditionsList(TRUE);
  public simulationProperties!: LuaTable<TName, TRate>;

  public override on_register(): void {
    super.on_register();

    logger.info("Register actor: %s %s %s", this.id, this.name(), this.section_name());

    registerActorServer(this);
    registerStoryLink(this.id, ACTOR);
    registerSimulationObject(this);

    EventsManager.emitEvent(EGameEvent.ACTOR_REGISTER, this);
  }

  public override on_unregister(): void {
    logger.info("Unregister actor");

    EventsManager.emitEvent(EGameEvent.ACTOR_UNREGISTER, this);

    unregisterActorServer();
    unregisterStoryLinkByObjectId(this.id);
    unregisterSimulationObject(this);

    super.on_unregister();
  }

  public override STATE_Write(packet: NetPacket): void {
    super.STATE_Write(packet);

    openSaveMarker(packet, Actor.__name);
    getManager(SaveManager).serverSave(packet);
    closeSaveMarker(packet, Actor.__name);
  }

  public override STATE_Read(packet: NetPacket, size: TSize): void {
    super.STATE_Read(packet, size);

    openLoadMarker(packet, Actor.__name);
    getManager(SaveManager).serverLoad(packet);
    closeLoadMarker(packet, Actor.__name);
  }

  public override on_death(killer: ServerObject): void {
    super.on_death(killer);

    logger.info("On actor death: %s %s %s", this.name(), killer.id, killer?.name());

    EventsManager.emitEvent(EGameEvent.ACTOR_DEATH, this, killer);
  }

  /**
   * @returns Generic simulation task based on current game graph IDs.
   */
  public getSimulationTask(): ALifeSmartTerrainTask {
    return new CALifeSmartTerrainTask(this.m_game_vertex_id, this.m_level_vertex_id);
  }

  /**
   * @returns Whether squad completed assigned task to `kill?` actor.
   */
  public isReachedBySimulationObject(): boolean {
    return !registry.actor.alive();
  }

  /**
   * Whether actor is available for simulation.
   * Exclude from participation when in some safe zones.
   */
  public isSimulationAvailable(): boolean {
    if (pickSectionFromCondList(registry.actor, this, this.isSimulationAvailableConditionList) !== TRUE) {
      return false;
    }

    if (
      registry.smartTerrainNearest.distanceSqr < 2_500 && // 50*50
      !registry.simulationObjects.has(registry.smartTerrainNearest.id!)
    ) {
      return false;
    }

    for (const [zoneName, terrainName] of registry.noCombatZones) {
      const zone: Nillable<GameObject> = registry.zones.get(zoneName);

      if (zone?.inside(this.position)) {
        const terrain: Nillable<SmartTerrain> = getSimulationTerrainByName(terrainName);

        if (terrain && terrain.terrainControl?.status !== ESmartTerrainStatus.ALARM) {
          return false;
        }
      }
    }

    if ($isNil(registry.activeSmartTerrainId)) {
      return true;
    }

    const activeTerrain: SmartTerrain = registry.simulator.object<SmartTerrain>(
      registry.activeSmartTerrainId
    ) as SmartTerrain;

    if (
      activeTerrain.terrainControl?.status === ESmartTerrainStatus.NORMAL &&
      registry.zones.get(activeTerrain.terrainControl.noWeaponZone)?.inside(this.position)
    ) {
      return false;
    }

    return true;
  }

  /**
   * @param squad - Squad weighing the actor as a target.
   * @returns Whether the squad may go for the actor, and why not when it may not.
   */
  public isValidSimulationTarget(squad: Squad): LuaMultiReturn<[boolean, Nillable<ESimulationTargetRejection>]> {
    const rule: Nillable<TSimulationActivityPrecondition> = simulationActivities.get(squad.faction)?.actor;

    if ($isNil(rule)) {
      return $multi(false, ESimulationTargetRejection.NO_FACTION_RULE);
    }

    if (rule(squad, this)) {
      return $multi(true, null);
    }

    return $multi(false, ESimulationTargetRejection.NOT_WANTED);
  }

  /**
   * When squad already reached actor.
   */
  public onSimulationTargetDeselected(squad: Squad): void {
    /**
     * Nothing.
     */
  }

  /**
   * When squad reaches actor.
   */
  public onSimulationTargetSelected(squad: Squad): void {
    squad.setLocationTypes();

    for (const squadMember of squad.squad_members()) {
      softResetOfflineObject(squadMember.id);
    }

    assignSimulationSquadToTerrain(squad, null);
  }
}
