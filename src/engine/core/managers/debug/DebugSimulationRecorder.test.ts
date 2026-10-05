import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ServerHumanObject } from "xray16/alias";
import { MockAlifeHumanStalker } from "xray16/mocks";

import { getManager, registerSimulator } from "@/engine/core/database";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { DebugSimulationRecorder } from "@/engine/core/managers/debug/DebugSimulationRecorder";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * @param recorder - Recorder to read.
 * @returns Its records as `name text`, newest first.
 */
function getTexts(recorder: DebugSimulationRecorder): Array<string> {
  const texts: Array<string> = [];

  for (const [, record] of recorder.getRecords()) {
    texts.push(`${record.name} ${record.text}`);
  }

  return texts;
}

/**
 * @param name - Squad name.
 * @returns Squad with the name.
 */
function mockNamedSquad(name: string): Squad {
  const squad: Squad = MockSquad.mock();

  jest.spyOn(squad, "name").mockImplementation(() => name);

  return squad;
}

const recordsLimit: number = debugConfig.SIMULATION_RECORDS_LIMIT;

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
});

afterEach(() => {
  debugConfig.SIMULATION_RECORDS_LIMIT = recordsLimit;
});

describe("DebugSimulationRecorder", () => {
  it("should record simulation events only while recording", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const recorder: DebugSimulationRecorder = new DebugSimulationRecorder();
    const squad: Squad = mockNamedSquad("test_squad");
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_smart");
    const member: ServerHumanObject = MockAlifeHumanStalker.mock({ name: "test_member" });

    squad.respawnPointSection = "test_respawn";

    eventsManager.emitEvent(EGameEvent.SQUAD_REGISTERED, squad);
    expect(recorder.getRecords().length()).toBe(0);

    recorder.start();
    recorder.start();

    eventsManager.emitEvent(EGameEvent.SQUAD_REGISTERED, squad);
    eventsManager.emitEvent(EGameEvent.SQUAD_TERRAIN_ASSIGNED, squad, terrain.id, null);
    squad.currentTargetId = terrain.id;
    squad.currentAction = new SquadStayOnTargetAction(squad);
    (squad.currentAction as SquadStayOnTargetAction).actionIdleTime = 90 * 60;
    eventsManager.emitEvent(EGameEvent.SQUAD_ACTION_SELECTED, squad);
    // A scripted squad renews the same stay on every update.
    eventsManager.emitEvent(EGameEvent.SQUAD_ACTION_SELECTED, squad);
    eventsManager.emitEvent(EGameEvent.SQUAD_MEMBER_DIED, squad, member);
    eventsManager.emitEvent(EGameEvent.SMART_TERRAIN_SQUAD_RESPAWNED, terrain, squad);
    eventsManager.emitEvent(EGameEvent.SQUAD_TERRAIN_ASSIGNED, squad, null, terrain.id);
    eventsManager.emitEvent(EGameEvent.SQUAD_RELEASED, squad);
    eventsManager.emitEvent(EGameEvent.SQUAD_UNREGISTERED, squad);

    expect(recorder.isRecording).toBe(true);
    expect(getTexts(recorder)).toEqual([
      "test_squad removed",
      "test_squad released",
      "test_squad leaves test_smart",
      "test_smart respawned test_squad, test_respawn",
      "test_squad lost test_member, 0 left",
      "test_squad stays at test_smart for 1h 30m",
      "test_squad joins test_smart",
      "test_squad created",
    ]);

    recorder.stop();
    eventsManager.emitEvent(EGameEvent.SQUAD_REGISTERED, squad);

    expect(recorder.isRecording).toBe(false);
    expect(recorder.getRecords().length()).toBe(8);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SQUAD_ACTION_SELECTED)).toBe(0);
  });

  it("should keep the latest records in a ring, and read them by object", () => {
    const recorder: DebugSimulationRecorder = new DebugSimulationRecorder();
    const first: Squad = mockNamedSquad("first");
    const second: Squad = mockNamedSquad("second");

    debugConfig.SIMULATION_RECORDS_LIMIT = 3;

    recorder.record(first, "1");
    recorder.record(second, "2");
    recorder.record(first, "3");
    recorder.record(second, "4");

    expect(getTexts(recorder)).toEqual(["second 4", "first 3", "second 2"]);
    expect(recorder.getRecords(first.id).length()).toBe(1);
    expect(recorder.getRecords(second.id, 1).get(1).text).toBe("4");
    expect(recorder.getRecords().get(1).serial).toBe(4);

    recorder.clear();
    recorder.record(first, "5");

    expect(getTexts(recorder)).toEqual(["first 5"]);
  });
});
