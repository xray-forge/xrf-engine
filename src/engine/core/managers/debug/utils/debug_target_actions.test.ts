import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { restoreObjectCondition } from "xray16/lib";
import { MockAlifeHumanStalker, MockAlifeObject, MockAlifeSimulator, MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerObject, registerSimulator, registry } from "@/engine/core/database";
import {
  EDebugTargetReport,
  getDebugInteractionBlocker,
  healDebugTarget,
  killDebugTarget,
  logDebugTargetReport,
  pullDebugTargetToActor,
  releaseDebugTarget,
  setDebugTargetRelation,
  talkToDebugTarget,
  teleportActorToDebugTarget,
  tradeWithDebugTarget,
  woundDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_target_actions";
import { logObjectPlannerState } from "@/engine/core/utils/debug/debug_log";
import { setObjectWounded } from "@/engine/core/utils/object";
import { isOnLoadedLevel, teleportActorNearPosition } from "@/engine/core/utils/position";
import { ERelation, setGameObjectRelation } from "@/engine/core/utils/relation";
import { releaseObject } from "@/engine/core/utils/spawn";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/debug/debug_log");
jest.mock("xray16/lib", () => ({
  ...(jest.requireActual("xray16/lib") as object),
  restoreObjectCondition: jest.fn(),
}));
jest.mock("@/engine/core/utils/object/object_wounds");
jest.mock("@/engine/core/utils/relation/relation_set");
jest.mock("@/engine/core/utils/spawn", () => ({ releaseObject: jest.fn() }));
jest.mock("@/engine/core/utils/position", () => ({
  ...(jest.requireActual("@/engine/core/utils/position") as object),
  isOnLoadedLevel: jest.fn(() => true),
  teleportActorNearPosition: jest.fn(),
}));

/**
 * @param config - Stalker mock configuration.
 * @param config.alive - Whether the stalker is alive.
 * @param config.distance - Distance from the actor, along the x axis.
 * @returns Online, registered stalker with its server object.
 */
function mockOnlineStalker(config: { alive?: boolean; distance?: number } = {}): GameObject {
  const object: GameObject = MockGameObject.mockStalker({
    alive: config.alive ?? true,
    name: "test_stalker",
    position: MockVector.mock(config.distance ?? 1, 0, 0),
  });

  MockAlifeHumanStalker.mock({ id: object.id(), name: "test_stalker" });
  registerObject(object);

  return object;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor({ position: MockVector.mock(0, 0, 0) });
  resetFunctionMock(level.vertex_id);
});

describe("getDebugInteractionBlocker", () => {
  it("should let the actor reach a live stalker close by", () => {
    expect(getDebugInteractionBlocker(mockOnlineStalker({ distance: 2 }).id())).toBeNull();
  });

  it("should explain why the actor cannot reach the target", () => {
    const offline: ServerObject = MockAlifeObject.mock({ name: "offline_object" });

    expect(getDebugInteractionBlocker(offline.id)).toMatch(/is not a live stalker online$/);
    expect(getDebugInteractionBlocker(mockOnlineStalker({ alive: false }).id())).toMatch(
      /is not a live stalker online$/
    );
    expect(getDebugInteractionBlocker(mockOnlineStalker({ distance: 10 }).id())).toBe(
      "test_stalker is 10 m away: pull it to the actor or teleport to it first"
    );
  });
});

describe("tradeWithDebugTarget", () => {
  it("should open trading with the target", () => {
    const object: GameObject = mockOnlineStalker();

    expect(tradeWithDebugTarget(object.id())).toBe("trading with test_stalker");
    expect(object.start_trade).toHaveBeenCalledWith(registry.actor);
  });
});

describe("talkToDebugTarget", () => {
  it("should start a dialog with the target", () => {
    const object: GameObject = mockOnlineStalker();

    expect(talkToDebugTarget(object.id())).toBe("talking to test_stalker");
    expect(registry.actor.run_talk_dialog).toHaveBeenCalledWith(object, false);
  });
});

describe("killDebugTarget", () => {
  it("should explain why it cannot run", () => {
    const offline: ServerObject = MockAlifeObject.mock({ name: "offline_object" });
    const item: GameObject = MockGameObject.mock({ name: "test_item" });

    MockAlifeObject.mock({ id: item.id(), name: "test_item" });
    registerObject(item);

    expect(killDebugTarget(offline.id)).toBe(`offline_object (${offline.id}) is offline`);
    expect(killDebugTarget(item.id())).toBe(`test_item (${item.id()}) is not a creature`);
    expect(killDebugTarget(mockOnlineStalker({ alive: false }).id())).toBe("test_stalker is dead");
  });

  it("should kill live creatures", () => {
    const object: GameObject = mockOnlineStalker();

    expect(killDebugTarget(object.id())).toBe("killed test_stalker");
    expect(object.kill).toHaveBeenCalledWith(object);
  });
});

describe("woundDebugTarget", () => {
  it("should wound live creatures", () => {
    const object: GameObject = mockOnlineStalker();

    expect(woundDebugTarget(object.id())).toBe("wounded test_stalker");
    expect(setObjectWounded).toHaveBeenCalledWith(object);
  });
});

describe("healDebugTarget", () => {
  it("should restore live creatures", () => {
    const object: GameObject = mockOnlineStalker();

    expect(healDebugTarget(object.id())).toBe("healed test_stalker");
    expect(restoreObjectCondition).toHaveBeenCalledWith(object);
  });
});

describe("setDebugTargetRelation", () => {
  it("should set the relation towards the actor", () => {
    const object: GameObject = mockOnlineStalker();

    expect(setDebugTargetRelation(object.id(), ERelation.ENEMY)).toBe("test_stalker is now enemy to the actor");
    expect(setGameObjectRelation).toHaveBeenCalledWith(object, registry.actor, ERelation.ENEMY);
  });
});

describe("logDebugTargetReport", () => {
  it("should write reports of online objects", () => {
    const object: GameObject = mockOnlineStalker();

    expect(logDebugTargetReport(object.id(), EDebugTargetReport.PLANNER)).toBe("logged the planner of test_stalker");
    expect(logObjectPlannerState).toHaveBeenCalledWith(object);
  });
});

describe("teleportActorToDebugTarget", () => {
  it("should teleport to targets on the loaded level", () => {
    const object: GameObject = mockOnlineStalker();
    const offline: ServerObject = MockAlifeObject.mock({ name: "far_object" });

    expect(teleportActorToDebugTarget(60_000)).toBe("gone (60000) does not exist");

    expect(teleportActorToDebugTarget(object.id())).toBe("teleported to test_stalker");
    expect(teleportActorNearPosition).toHaveBeenCalledWith(object.position());

    replaceFunctionMock(isOnLoadedLevel, () => false);

    expect(teleportActorToDebugTarget(offline.id)).toBe("far_object is on another level");
  });
});

describe("pullDebugTargetToActor", () => {
  it("should move creatures and offline objects in front of the actor", () => {
    const object: GameObject = mockOnlineStalker();
    const offline: ServerObject = MockAlifeObject.mock({ name: "offline_object" });

    replaceFunctionMock(level.vertex_id, () => 100);

    expect(pullDebugTargetToActor(object.id())).toBe("pulled test_stalker to the actor");
    expect(object.set_npc_position).toHaveBeenCalled();

    expect(pullDebugTargetToActor(offline.id)).toBe("pulled offline_object to the actor");
    expect(MockAlifeSimulator.getInstance().teleport_object).toHaveBeenCalledWith(
      offline.id,
      registry.actor.game_vertex_id(),
      100,
      expect.anything()
    );
  });
});

describe("releaseDebugTarget", () => {
  it("should release anything but the actor", () => {
    const serverObject: ServerObject = MockAlifeObject.mock({ name: "test_object" });

    expect(releaseDebugTarget(serverObject.id)).toBe(`released test_object (${serverObject.id})`);
    expect(releaseObject).toHaveBeenCalledWith(serverObject.id);

    expect(releaseDebugTarget(60_000)).toBe("gone (60000) does not exist");
  });
});
