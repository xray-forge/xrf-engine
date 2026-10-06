import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CALifeSmartTerrainTask } from "xray16";
import { ServerObject } from "xray16/alias";
import { FALSE, TRUE } from "xray16/lib";
import { EMockPacketDataType, MockAlifeHumanStalker, MockNetProcessor } from "xray16/mocks";

import { getManager, registry } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SaveManager } from "@/engine/core/managers/save/SaveManager";
import { simulationActivities } from "@/engine/core/managers/simulation/activity";
import { ESimulationTargetRejection } from "@/engine/core/managers/simulation/types";
import { assignSimulationSquadToTerrain } from "@/engine/core/managers/simulation/utils";
import { Actor } from "@/engine/core/objects/creature/Actor";
import { mockRegisteredActor, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/simulation/utils/simulation_squads", () => ({
  assignSimulationSquadToTerrain: jest.fn(),
}));

describe("Actor server object", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly emit lifecycle events", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const actor: Actor = new Actor("actor");

    const onActorRegister = jest.fn();
    const onActorUnregister = jest.fn();

    eventsManager.registerCallback(EGameEvent.ACTOR_REGISTER, onActorRegister);
    eventsManager.registerCallback(EGameEvent.ACTOR_UNREGISTER, onActorUnregister);

    actor.on_register();

    expect(onActorRegister).toHaveBeenCalledWith(actor);
    expect(onActorUnregister).not.toHaveBeenCalled();

    actor.on_unregister();

    expect(onActorRegister).toHaveBeenCalledWith(actor);
    expect(onActorUnregister).toHaveBeenCalledWith(actor);
  });

  it("should correctly emit death events", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const actor: Actor = new Actor("actor");
    const killer: ServerObject = MockAlifeHumanStalker.mock();

    const onActorDeath = jest.fn();

    eventsManager.registerCallback(EGameEvent.ACTOR_DEATH, onActorDeath);

    actor.on_death(killer);

    expect(onActorDeath).toHaveBeenCalledWith(actor, killer);
  });

  it("should correctly handle save-load in appropriate manager", () => {
    const manager: SaveManager = getManager(SaveManager);
    const actor: Actor = new Actor("actor");
    const processor: MockNetProcessor = new MockNetProcessor();

    jest.spyOn(manager, "serverSave").mockImplementation(jest.fn());
    jest.spyOn(manager, "serverLoad").mockImplementation(jest.fn());

    actor.STATE_Write(processor.asNetPacket());

    expect(manager.serverSave).toHaveBeenCalledWith(processor);
    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.STRING, EMockPacketDataType.U16]);
    expect(processor.dataList).toEqual(["state_write_from_Actor", 0]);

    actor.STATE_Read(processor.asNetPacket(), 0);

    expect(manager.serverLoad).toHaveBeenCalledWith(processor);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should generate an ALife task for its current graph vertices", () => {
    const actor: Actor = new Actor("actor");

    (actor as unknown as { m_game_vertex_id: number }).m_game_vertex_id = 131;
    (actor as unknown as { m_level_vertex_id: number }).m_level_vertex_id = 313;

    expect(actor.getSimulationTask()).toEqual(new CALifeSmartTerrainTask(131, 313));
  });

  it("should check simulation availability against its configured condition list", () => {
    mockRegisteredActor();

    const actor: Actor = new Actor("actor");

    expect(actor.isSimulationAvailable()).toBe(true);

    actor.isSimulationAvailableConditionList = parseConditionsList(FALSE);
    expect(actor.isSimulationAvailable()).toBe(false);

    actor.isSimulationAvailableConditionList = parseConditionsList(TRUE);
    registry.activeSmartTerrainId = null;
    expect(actor.isSimulationAvailable()).toBe(true);
  });

  it("should exclude nearby smart terrains until they participate in simulation", () => {
    mockRegisteredActor();

    const actor: Actor = new Actor("actor");

    registry.smartTerrainNearest.id = 903;
    registry.smartTerrainNearest.distanceSqr = 1;
    expect(actor.isSimulationAvailable()).toBe(false);

    registry.simulationObjects.set(903, actor);
    expect(actor.isSimulationAvailable()).toBe(true);
  });

  it("should mark the actor target as reached only after the actor dies", () => {
    const { actorGameObject } = mockRegisteredActor();
    const actor: Actor = new Actor("actor");

    expect(actor.isReachedBySimulationObject()).toBe(false);

    jest.spyOn(actorGameObject, "alive").mockReturnValue(false);
    expect(actor.isReachedBySimulationObject()).toBe(true);
  });

  it("should say why a squad may not go for it, by the squad faction activity", () => {
    const actor: Actor = new Actor("actor");
    const squad = MockSquad.mock();

    jest.spyOn(simulationActivities, "get").mockReturnValue({ actor: () => true } as never);
    expect(actor.isValidSimulationTarget(squad)).toEqual([true, null]);

    jest.spyOn(simulationActivities, "get").mockReturnValue({ actor: () => false } as never);
    expect(actor.isValidSimulationTarget(squad)).toEqual([false, ESimulationTargetRejection.NOT_WANTED]);

    jest.spyOn(simulationActivities, "get").mockReturnValue({ actor: null } as never);
    expect(actor.isValidSimulationTarget(squad)).toEqual([false, ESimulationTargetRejection.NO_FACTION_RULE]);
  });

  it("should reset selected squad members and clear the terrain assignment", () => {
    const actor: Actor = new Actor("actor");
    const squad = MockSquad.mock();
    const first = MockAlifeHumanStalker.mock();
    const second = MockAlifeHumanStalker.mock();

    squad.mockAddMember(first);
    squad.mockAddMember(second);
    squad.assignedTargetId = actor.id;
    jest.spyOn(squad, "setLocationTypes").mockImplementation(jest.fn());
    registry.offlineObjects.set(first.id, { levelVertexId: 100, activeSection: "first" });
    registry.offlineObjects.set(second.id, { levelVertexId: 200, activeSection: "second" });

    actor.onSimulationTargetSelected(squad);

    expect(squad.setLocationTypes).toHaveBeenCalledWith();
    expect(registry.offlineObjects.get(first.id)).toEqual({ levelVertexId: null, activeSection: null });
    expect(registry.offlineObjects.get(second.id)).toEqual({ levelVertexId: null, activeSection: null });
    expect(assignSimulationSquadToTerrain).toHaveBeenCalledWith(squad, null);
  });
});
