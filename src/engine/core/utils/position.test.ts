import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game_graph, level, patrol } from "xray16";
import {
  ESoundObjectType,
  GameObject,
  Patrol,
  ServerHumanObject,
  ServerObject,
  ServerSmartZoneObject,
  Vector,
} from "xray16/alias";
import { MAX_LEVEL_VERTEX_ID, MAX_U16, MAX_U32, TCount, ZERO_VECTOR } from "xray16/lib";
import {
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockAlifeSmartZone,
  MockGameObject,
  MockSoundObject,
  MockVector,
} from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerObject, registerSimulator, registerStoryLink, registerZone, registry } from "@/engine/core/database";
import {
  areObjectsOnSameLevel,
  getActorPosition,
  getGameLevelName,
  getGameVertexLevelId,
  getObjectTerrain,
  getPositionLevelVertexId,
  getServerDistanceBetween,
  isActorInNoWeaponZone,
  isObjectInActorFrustum,
  isObjectInSilenceZone,
  isObjectInSmartTerrain,
  isObjectOnLevel,
  isOnLoadedLevel,
  resetPositionCache,
  sendToNearestAccessibleVertex,
  sendToVertexIfAccessible,
  teleportActorNearPosition,
  teleportActorToPatrol,
  teleportActorToStoryObject,
  teleportActorWithEffects,
  teleportObjectToVertex,
} from "@/engine/core/utils/position";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  MockSoundObject.resetRegistry();
  resetPositionCache();
});

describe("isObjectInSmartTerrain", () => {
  it("should check object inside smart terrain", () => {
    const terrain: ServerSmartZoneObject = MockAlifeSmartZone.mock({ name: "test-smart" });
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    actorServerObject.m_smart_terrain_id = terrain.id;

    expect(isObjectInSmartTerrain(actorGameObject, "test-smart")).toBe(true);
    expect(isObjectInSmartTerrain(actorGameObject, "test-smart-another")).toBe(false);
    expect(isObjectInSmartTerrain(actorGameObject, "another")).toBe(false);
  });
});

describe("isObjectInSilenceZone", () => {
  it("should check if object is in silence zone", () => {
    const object: GameObject = MockGameObject.mock();
    const zone: GameObject = MockGameObject.mock();

    jest.spyOn(zone, "inside").mockImplementation(() => true);

    expect(isObjectInSilenceZone(object)).toBe(false);

    registerZone(zone);
    registry.silenceZones.set(zone.id(), zone.name());

    expect(isObjectInSilenceZone(object)).toBe(true);

    jest.spyOn(zone, "inside").mockImplementation(() => false);

    expect(isObjectInSilenceZone(object)).toBe(false);
  });
});

describe("isObjectOnLevel", () => {
  it("should check object on level", () => {
    const first: ServerObject = MockAlifeObject.mock({ gameVertexId: 350 });
    const second: ServerObject = MockAlifeObject.mock({ gameVertexId: 152 });

    expect(isObjectOnLevel(null, "zaton")).toBe(false);
    expect(isObjectOnLevel(first, "pripyat")).toBe(true);

    expect(game_graph().vertex(first.m_game_vertex_id).level_id()).toBe(3);
    expect(registry.simulator.level_name).toHaveBeenCalledWith(3);

    expect(isObjectOnLevel(second, "zaton")).toBe(true);
    expect(isObjectOnLevel(second, "pripyat")).toBe(false);

    expect(game_graph().vertex(second.m_game_vertex_id).level_id()).toBe(1);
    expect(registry.simulator.level_name).toHaveBeenCalledWith(1);
  });
});

describe("getActorPosition", () => {
  it("should hand back a copy that a later move cannot rewrite", () => {
    const { actorGameObject } = mockRegisteredActor();

    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(1, 2, 3));

    const position: Vector = getActorPosition();

    expect(position).toEqual(MockVector.mock(1, 2, 3));
    expect(position).not.toBe(actorGameObject.position());
  });
});

describe("areObjectsOnSameLevel", () => {
  it("should check objects on level", () => {
    expect(areObjectsOnSameLevel(MockAlifeObject.mock(), MockAlifeObject.mock())).toBe(true);
    expect(areObjectsOnSameLevel(MockAlifeObject.mock(), MockAlifeObject.mock({ gameVertexId: 330 }))).toBe(false);
    expect(
      areObjectsOnSameLevel(MockAlifeObject.mock({ gameVertexId: 200 }), MockAlifeObject.mock({ gameVertexId: 200 }))
    ).toBe(true);
  });
});

describe("getGameVertexLevelId", () => {
  it("should memoize level id lookups per game vertex", () => {
    const vertexSpy = jest.spyOn(game_graph(), "vertex");

    expect(getGameVertexLevelId(350)).toBe(3);

    const crossings: number = vertexSpy.mock.calls.length;

    // Memo hit - no additional graph crossings.
    expect(getGameVertexLevelId(350)).toBe(3);
    expect(vertexSpy.mock.calls).toHaveLength(crossings);
  });
});

describe("getGameLevelName", () => {
  it("should memoize level name lookups per level id", () => {
    expect(getGameLevelName(3)).toBe("pripyat");

    const crossings: number = (registry.simulator.level_name as unknown as jest.Mock).mock.calls.length;

    // Memo hit - no additional simulator crossings.
    expect(getGameLevelName(3)).toBe("pripyat");
    expect((registry.simulator.level_name as unknown as jest.Mock).mock.calls).toHaveLength(crossings);
  });
});

describe("getServerDistanceBetween", () => {
  it("should memoize distances by symmetric vertex pair until reset", () => {
    const first: ServerObject = MockAlifeObject.mock({ gameVertexId: 100 });
    const second: ServerObject = MockAlifeObject.mock({ gameVertexId: 101 });

    MockVector.DEFAULT_DISTANCE = 20;

    expect(getServerDistanceBetween(first, second)).toBe(20);

    // Underlying changes are invisible while memoized, key is symmetric.
    MockVector.DEFAULT_DISTANCE = 50;

    expect(getServerDistanceBetween(first, second)).toBe(20);
    expect(getServerDistanceBetween(second, first)).toBe(20);

    resetPositionCache();

    expect(getServerDistanceBetween(first, second)).toBe(50);
  });
});

describe("sendToNearestAccessibleVertex", () => {
  it("should correctly send object to nearest accesible vertex", () => {
    const first: GameObject = MockGameObject.mock();

    expect(sendToNearestAccessibleVertex(first, 150)).toBe(150);
    expect(first.accessible).toHaveBeenCalled();
    expect(first.set_dest_level_vertex_id).toHaveBeenCalledWith(150);

    const second: GameObject = MockGameObject.mock();

    jest.spyOn(second, "accessible").mockImplementation(() => false);
    jest.spyOn(second, "accessible_nearest").mockImplementation(() => $multi(14325, ZERO_VECTOR));

    expect(sendToNearestAccessibleVertex(second, 150)).toBe(14325);
    expect(second.accessible).toHaveBeenCalled();
    expect(second.accessible_nearest).toHaveBeenCalledWith({ x: 15, y: 14, z: 16 }, { x: 0, y: 0, z: 0 });
    expect(second.set_dest_level_vertex_id).toHaveBeenCalledWith(14325);

    const third: GameObject = MockGameObject.mock();

    jest.spyOn(third, "level_vertex_id").mockImplementation(() => 1442);

    expect(sendToNearestAccessibleVertex(third, MAX_U32)).toBe(1442);
    expect(sendToNearestAccessibleVertex(third, MAX_U32 + 10)).toBe(1442);
    expect(sendToNearestAccessibleVertex(third, MAX_U32 * 2)).toBe(1442);
  });
});

describe("sendToVertexIfAccessible", () => {
  it("should send object to an accessible vertex", () => {
    const object: GameObject = MockGameObject.mock();

    expect(sendToVertexIfAccessible(object, 150)).toBe(true);
    expect(object.accessible).toHaveBeenCalledWith(150);
    expect(object.set_dest_level_vertex_id).toHaveBeenCalledWith(150);
  });

  it("should leave the destination as it is for a vertex the restrictors keep the object from", () => {
    const object: GameObject = MockGameObject.mock();

    jest.spyOn(object, "accessible").mockImplementation(() => false);

    expect(sendToVertexIfAccessible(object, 150)).toBe(false);
    expect(object.accessible_nearest).not.toHaveBeenCalled();
    expect(object.set_dest_level_vertex_id).not.toHaveBeenCalled();
  });

  it("should leave the destination as it is for an invalid vertex", () => {
    const object: GameObject = MockGameObject.mock();

    expect(sendToVertexIfAccessible(object, MAX_U32)).toBe(false);
    expect(object.accessible).not.toHaveBeenCalled();
    expect(object.set_dest_level_vertex_id).not.toHaveBeenCalled();
  });
});

describe("teleportActorWithEffects", () => {
  beforeEach(() => {});

  it("should correctly teleport actor", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const destination: Vector = MockVector.mock(15, 14, 16);
    const direction: Vector = MockVector.mock(3, 5, 4);

    teleportActorWithEffects(actor, destination, direction);

    expect(actor.set_actor_position).toHaveBeenCalledWith(destination);
    expect(actor.set_actor_direction).toHaveBeenCalledWith(-direction.getH());

    expect(MockSoundObject.SOUND_OBJECT_REGISTRY).toHaveLength(1);
    expect(MockSoundObject.SOUND_OBJECT_REGISTRY[0].path).toBe("affects\\tinnitus3a");
    expect(MockSoundObject.SOUND_OBJECT_REGISTRY[0].play_no_feedback).toHaveBeenCalledWith(
      actor,
      ESoundObjectType.S2D,
      0,
      ZERO_VECTOR,
      1.0
    );
  });
});

describe("teleportActorToPatrol", () => {
  it("should move the actor to the first point of the patrol path", () => {
    const { actorGameObject } = mockRegisteredActor();

    teleportActorToPatrol("test-wp");

    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(new patrol("test-wp").point(0));
    expect(actorGameObject.set_actor_direction).toHaveBeenCalledTimes(0);
  });

  it("should move the actor to the last point when asked for the end of the path", () => {
    const { actorGameObject } = mockRegisteredActor();
    const path: Patrol = new patrol("test-wp");

    teleportActorToPatrol("test-wp", null, -1);

    // A walker's destination, not where it sets off from.
    expect(path.count()).toBeGreaterThan(1);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(path.point(path.count() - 1));
  });

  it("should abort on an unknown position path before moving the actor", () => {
    const { actorGameObject } = mockRegisteredActor();

    expect(() => teleportActorToPatrol("not-existing-wp")).toThrow(
      "Cannot teleport, patrol path 'not-existing-wp' does not exist."
    );
    expect(actorGameObject.set_actor_position).not.toHaveBeenCalled();
  });

  it("should abort on an unknown look path before moving the actor", () => {
    const { actorGameObject } = mockRegisteredActor();

    // Checked up front: turning the actor and then aborting would leave it facing a place it never
    // travelled to.
    expect(() => teleportActorToPatrol("test-wp", "not-existing-wp")).toThrow(
      "Cannot teleport, look patrol path 'not-existing-wp' does not exist."
    );
    expect(actorGameObject.set_actor_position).not.toHaveBeenCalled();
    expect(actorGameObject.set_actor_direction).not.toHaveBeenCalled();
  });

  it("should turn the actor towards the look path when one is supplied", () => {
    const { actorGameObject } = mockRegisteredActor();

    teleportActorToPatrol("test-wp-2", "test-wp-3");

    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(new patrol("test-wp-2").point(0));
    expect(actorGameObject.set_actor_direction).toHaveBeenCalledWith(expect.closeTo(-1.5707));
  });

  it("should leave no weapon zones to their controllers, even one the actor arrives inside", () => {
    mockRegisteredActor();

    const noWeaponZone: GameObject = MockGameObject.mock();

    registerObject(noWeaponZone);
    jest.spyOn(noWeaponZone, "inside").mockImplementation(() => true);
    registry.noWeaponZones.set(noWeaponZone.id(), false);

    teleportActorToPatrol("test-wp");

    expect(registry.noWeaponZones.get(noWeaponZone.id())).toBe(false);
  });
});

describe("isOnLoadedLevel", () => {
  beforeEach(() => {
    resetFunctionMock(level.vertex_id);
  });

  it("should judge by the game vertex when the object carries one", () => {
    // `level.name()` is 'zaton' under the mocks, and game vertex 152 resolves to it.
    expect(isOnLoadedLevel(MockAlifeObject.mock({ gameVertexId: 152 }))).toBe(true);
    expect(isOnLoadedLevel(MockAlifeObject.mock({ gameVertexId: 350 }))).toBe(false);
    expect(level.vertex_id).not.toHaveBeenCalled();
  });

  it("should fall back to the position when the object carries no game vertex", () => {
    const vertexless: ServerObject = MockAlifeObject.mock({ gameVertexId: MAX_U16 });

    // Close enough that the vertex answers with the position it was looked up for.
    MockVector.DEFAULT_DISTANCE = 1;
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));
    expect(isOnLoadedLevel(vertexless)).toBe(true);
    expect(level.vertex_id).toHaveBeenCalledWith(vertexless.position);

    replaceFunctionMock(level.vertex_id, () => MAX_LEVEL_VERTEX_ID);
    expect(isOnLoadedLevel(vertexless)).toBe(false);
  });
});

describe("getPositionLevelVertexId", () => {
  beforeEach(() => {
    resetFunctionMock(level.vertex_id);
    resetFunctionMock(level.vertex_position);
  });

  it("should hand back the vertex when it answers with the position it was looked up for", () => {
    MockVector.DEFAULT_DISTANCE = 1;
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    expect(getPositionLevelVertexId(MockVector.mock(1, 0, 1))).toBe(300);
  });

  it("should refuse a vertex that names somewhere else on the level", () => {
    // `level.vertex_id` looks up by grid cell, so a position the mesh does not cover can resolve to a plausible
    // looking id belonging to another part of the level - Nimble resolved to one 727 m away.
    MockVector.DEFAULT_DISTANCE = 727;
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(-585, 11.8, -9.7));

    expect(getPositionLevelVertexId(MockVector.mock(105.7, -1.3, 186.9))).toBe(MAX_LEVEL_VERTEX_ID);
  });

  it("should pass an unresolvable position straight through", () => {
    replaceFunctionMock(level.vertex_id, () => MAX_LEVEL_VERTEX_ID);

    expect(getPositionLevelVertexId(MockVector.mock(1, 0, 1))).toBe(MAX_LEVEL_VERTEX_ID);
    expect(level.vertex_position).not.toHaveBeenCalled();
  });
});

describe("teleportActorNearPosition", () => {
  beforeEach(() => {
    resetFunctionMock(level.vertex_id);
    resetFunctionMock(level.vertex_position);
  });

  it("should look up a vertex for the standoff point, not for the target", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);
    const candidate: Vector = MockVector.mock(7.5, 0, 0);

    // Both vectors non origin, so the mock reports DEFAULT_DISTANCE for every `distance_to`, and a 2 m snap is
    // one the window accepts.
    MockVector.DEFAULT_DISTANCE = 2;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, () => 42);
    replaceFunctionMock(level.vertex_position, () => candidate);

    expect(teleportActorNearPosition(target)).toBe(true);

    // Never `accessible_nearest`: it casts to CCustomMonster, which the actor is not.
    expect(actorGameObject.accessible_nearest).not.toHaveBeenCalled();
    // 3 metres back from the target along the line towards the actor: (4,0,0) + (3,0,0).
    expect(level.vertex_id).toHaveBeenCalledWith(MockVector.mock(7, 0, 0));
    expect(level.vertex_position).toHaveBeenCalledWith(42);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(candidate);
    expect(actorGameObject.set_actor_direction).toHaveBeenCalledWith(-MockVector.mock(-3.5, 0, 0).getH());

    // The supplied position must survive: `sub` and `add` mutate whatever they are called on.
    expect(target).toEqual(MockVector.mock(4, 0, 0));
  });

  it("should never arrive on the target itself when the vertex is unusable", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);

    // What an off graph position produces: a valid looking id pointing somewhere unrelated.
    MockVector.DEFAULT_DISTANCE = 40;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, () => 42);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(900, 0, 900));

    expect(teleportActorNearPosition(target)).toBe(false);

    // Standing on the target is what displaces a placed item, so the standoff has to survive here.
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(MockVector.mock(7, 0, 0));
    expect(actorGameObject.set_actor_position).not.toHaveBeenCalledWith(target);
    expect(actorGameObject.set_actor_direction).toHaveBeenCalled();
  });

  it("should try other sides of the target when the natural approach is unreachable", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);
    const reachable: Vector = MockVector.mock(4, 0, 3);
    const attempts: Array<Vector> = [];

    MockVector.DEFAULT_DISTANCE = 2;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));

    // A target inside a hull: only one side of it has ground the actor can stand on.
    replaceFunctionMock(level.vertex_id, (candidate: Vector) => {
      attempts.push(MockVector.mock(candidate.x, candidate.y, candidate.z));

      return attempts.length < 3 ? MAX_LEVEL_VERTEX_ID : 77;
    });
    replaceFunctionMock(level.vertex_position, () => reachable);

    expect(teleportActorNearPosition(target)).toBe(true);

    // Straight back first, then quarter turns - all of them, since a later side can snap closer than an earlier one.
    expect(attempts).toHaveLength(4);
    expect(attempts[0]).toEqual(MockVector.mock(7, 0, 0));
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(reachable);
  });

  it("should refuse a vertex on another floor and take one at the target's height", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(100, -3.9, 182);
    const belowDeck: Vector = MockVector.mock(99, -7.5, 180);
    const onDeck: Vector = MockVector.mock(103, -3.9, 182);
    const attempts: Array<Vector> = [];

    let lookups: TCount = 0;

    // Close enough by distance either way: Skadovsk's decks stand 3.6 m apart, well inside the snap window.
    MockVector.DEFAULT_DISTANCE = 2;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(96, -7.5, 183));
    replaceFunctionMock(level.vertex_id, (candidate: Vector) => {
      attempts.push(MockVector.mock(candidate.x, candidate.y, candidate.z));

      return 42;
    });
    replaceFunctionMock(level.vertex_position, () => {
      lookups += 1;

      return lookups === 1 ? belowDeck : onDeck;
    });

    expect(teleportActorNearPosition(target)).toBe(true);

    // The standoff point stays level with the target however far below it the actor set off from.
    expect(attempts[0].y).toBe(-3.9);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(onDeck);
    expect(actorGameObject.set_actor_position).not.toHaveBeenCalledWith(belowDeck);
  });

  it("should back away along a supplied direction rather than the line to the actor", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);
    const attempts: Array<Vector> = [];

    MockVector.DEFAULT_DISTANCE = 2;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, (candidate: Vector) => {
      attempts.push(MockVector.mock(candidate.x, candidate.y, candidate.z));

      return MAX_LEVEL_VERTEX_ID;
    });

    // Facing away from the actor, so the side tried first is the far one rather than the near one.
    teleportActorNearPosition(target, MockVector.mock(-1, 0, 0));

    expect(attempts[0]).toEqual(MockVector.mock(1, 0, 0));
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(MockVector.mock(1, 0, 0));
  });

  it("should hold the side tried first when a later one snaps no closer", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);
    const front: Vector = MockVector.mock(1, 0, 0);
    const side: Vector = MockVector.mock(4, 0, 3);

    let lookups: TCount = 0;

    // Every side snaps the same distance, so nothing beats the facing outright and it keeps the arrival.
    MockVector.DEFAULT_DISTANCE = 2;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, () => 42);
    replaceFunctionMock(level.vertex_position, () => {
      lookups += 1;

      return lookups === 1 ? front : side;
    });

    teleportActorNearPosition(target, MockVector.mock(-1, 0, 0));

    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(front);
    expect(actorGameObject.set_actor_position).not.toHaveBeenCalledWith(side);
  });

  it("should keep the standoff when no vertex resolves at all", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);

    MockVector.DEFAULT_DISTANCE = 6;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, () => MAX_LEVEL_VERTEX_ID);

    expect(teleportActorNearPosition(target)).toBe(false);

    expect(level.vertex_position).not.toHaveBeenCalled();
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(MockVector.mock(7, 0, 0));
  });

  it("should respect a supplied standoff", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: Vector = MockVector.mock(4, 0, 0);

    MockVector.DEFAULT_DISTANCE = 6;
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(10, 0, 0));
    replaceFunctionMock(level.vertex_id, () => MAX_LEVEL_VERTEX_ID);

    teleportActorNearPosition(target, null, 8);

    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(MockVector.mock(12, 0, 0));
  });
});

describe("teleportActorToStoryObject", () => {
  beforeEach(() => {
    resetFunctionMock(level.vertex_id);
    resetFunctionMock(level.vertex_in_direction);
    resetFunctionMock(level.vertex_position);

    // Every case derives its start vertex from the target's position, so every case needs a valid one that
    // answers back with the position it was looked up for.
    MockVector.DEFAULT_DISTANCE = 1;
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));
  });

  it("should arrive at a vertex stepped away from the target and face it", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });
    // Near enough the target that the start vertex validates as being the one it stands on.
    const arrival: Vector = MockVector.mock(2, 0, 2);

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => arrival);

    teleportActorToStoryObject("test-sid");

    // Offline, the start vertex is derived from the position rather than read off the server object.
    expect(level.vertex_id).toHaveBeenCalledWith(target.position);
    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, expect.anything(), 5);
    expect(level.vertex_position).toHaveBeenCalledWith(500);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(arrival);
    expect(actorGameObject.set_actor_direction).toHaveBeenCalledWith(-target.position.sub(arrival).getH());
  });

  it("should shrink the step until the graph allows it", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });
    const attempts: Array<number> = [];

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    // Indoors the engine refuses to travel far and hands back the vertex it started from.
    replaceFunctionMock(level.vertex_in_direction, (vertexId: number, _: Vector, distance: number) => {
      attempts.push(distance);

      return distance > 4 ? vertexId : 900;
    });

    teleportActorToStoryObject("test-sid", null, 16);

    expect(attempts).toEqual([16, 8, 4]);
    expect(level.vertex_position).toHaveBeenCalledWith(900);
  });

  it("should settle for the target vertex when even the smallest step does not fit", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_id, () => 300);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));
    replaceFunctionMock(level.vertex_in_direction, (vertexId: number) => vertexId);

    teleportActorToStoryObject("test-sid", null, 8);

    expect(level.vertex_position).toHaveBeenCalledWith(300);
  });

  it("should default to the target's own facing when it is online", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });
    const facing: Vector = MockVector.mock(0, 0, 1);
    const online: GameObject = MockGameObject.mock({ id: target.id, levelVertexId: 777 });

    jest.spyOn(online, "direction").mockImplementation(() => facing);
    registerObject(online);
    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid");

    // Online the direction comes from the game object, but the start vertex still comes from where it stands.
    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, facing, 5);
  });

  it("should ignore the level vertex an online target carries", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });
    const online: GameObject = MockGameObject.mock({ id: target.id, levelVertexId: 1_227_388 });

    registerObject(online);
    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid");

    // Classes with `used_ai_locations()` off carry a vertex that is in range but not theirs, so it cannot be
    // told apart from a real one - the b202 inventory boxes share 1227388 while standing 380 m apart.
    expect(level.vertex_id).toHaveBeenCalledWith(online.position());
    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, expect.anything(), 5);
    expect(online.level_vertex_id).not.toHaveBeenCalled();
  });

  it("should step towards the actor when the target is offline", () => {
    const { actorGameObject } = mockRegisteredActor();
    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    target.position = MockVector.mock(10, 0, 10);
    jest.spyOn(actorGameObject, "position").mockImplementation(() => MockVector.mock(4, 0, 6));

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid");

    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, MockVector.mock(-6, 0, -4), 5);
  });

  it("should not mutate the target position while turning the actor to face it", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    target.position = MockVector.mock(10, 0, 10);

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid");

    // `sub` mutates its receiver, so a missing copy would leave the target sitting on a delta vector.
    expect(target.position).toEqual(MockVector.mock(10, 0, 10));
  });

  it("should prefer a supplied direction over the target's facing", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });
    const facing: Vector = MockVector.mock(0, 0, 1);
    const supplied: Vector = MockVector.mock(-1, 0, 0);
    const online: GameObject = MockGameObject.mock({ id: target.id, levelVertexId: 777 });

    jest.spyOn(online, "direction").mockImplementation(() => facing);
    registerObject(online);
    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid", supplied, 5);

    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, supplied, 5);
    expect(online.direction).not.toHaveBeenCalled();
  });

  it("should respect a supplied distance", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid", null, 12);

    expect(level.vertex_in_direction).toHaveBeenCalledWith(300, expect.anything(), 12);
  });

  it("should fall back to the target vertex when no vertex is reachable in that direction", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => MAX_LEVEL_VERTEX_ID);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    teleportActorToStoryObject("test-sid");

    expect(level.vertex_position).toHaveBeenCalledWith(300);
  });

  it("should abort for an unregistered story id", () => {
    mockRegisteredActor();

    expect(() => teleportActorToStoryObject("not-existing-sid")).toThrow(
      "Cannot teleport, no object with story id 'not-existing-sid' is registered."
    );
  });

  it("should abort for a target outside the loaded level", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    registerStoryLink(target.id, "test-sid");
    jest.spyOn(game_graph().vertex(target.m_game_vertex_id), "level_id").mockImplementation(() => 5_555);

    expect(() => teleportActorToStoryObject("test-sid")).toThrow(
      "Cannot teleport to 'test-sid', it is not on the loaded level."
    );
  });

  it("should trust being online over a game vertex naming another level", () => {
    mockRegisteredActor();

    const target: ServerHumanObject = MockAlifeHumanStalker.mock({ gameVertexId: 152 });

    registerObject(MockGameObject.mock({ id: target.id }));
    registerStoryLink(target.id, "test-sid");
    replaceFunctionMock(level.vertex_in_direction, () => 500);
    replaceFunctionMock(level.vertex_position, () => MockVector.mock(1, 0, 1));

    // The b202 chest reports game vertex 317 while standing on 327, so a wrong one must not strand the caller.
    jest.spyOn(game_graph().vertex(target.m_game_vertex_id), "level_id").mockImplementation(() => 5_555);

    expect(() => teleportActorToStoryObject("test-sid")).not.toThrow();
  });
});

describe("isObjectInActorFrustum", () => {
  it("should correctly check whether object is in actor frustum", () => {
    const object: GameObject = MockGameObject.mock();

    mockRegisteredActor();

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(0.6, 0, 0.6));
    expect(isObjectInActorFrustum(object)).toBe(true);

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(0.5, 0, 0.9));
    expect(isObjectInActorFrustum(object)).toBe(true);

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(0.5, 1, 0.9));
    expect(isObjectInActorFrustum(object)).toBe(false);

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(0.4, 0, 0.9));
    expect(isObjectInActorFrustum(object)).toBe(false);

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(-0.6, 0, -0.6));
    expect(isObjectInActorFrustum(object)).toBe(false);

    jest.spyOn(object, "position").mockImplementation(() => MockVector.mock(0, 0, 0));
    expect(isObjectInActorFrustum(object)).toBe(false);
  });
});

describe("getObjectSmartTerrain", () => {
  it("should correctly get smart terrain of an object", () => {
    expect(getObjectTerrain(MockGameObject.mock())).toBeNull();
    expect(getObjectTerrain(MockAlifeHumanStalker.mock())).toBeNull();

    const terrain: ServerSmartZoneObject = MockAlifeSmartZone.mock();
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock();
    const gameObject: GameObject = MockGameObject.mock({ id: serverObject.id });

    serverObject.m_smart_terrain_id = terrain.id;

    expect(getObjectTerrain(gameObject)).toBe(terrain);
    expect(getObjectTerrain(serverObject)).toBe(terrain);

    serverObject.m_smart_terrain_id = 99_999;

    expect(getObjectTerrain(gameObject)).toBeNull();
    expect(getObjectTerrain(serverObject)).toBeNull();
  });
});

describe("teleportObjectToVertex", () => {
  it("should move online creatures and offline objects onto a vertex", () => {
    const stalker: GameObject = MockGameObject.mockStalker();
    const item: GameObject = MockGameObject.mock();
    const offline: ServerObject = MockAlifeObject.mock();

    registerObject(stalker);
    registerObject(item);

    expect(teleportObjectToVertex(stalker.id(), 10, 20)).toBe(true);
    expect(stalker.set_npc_position).toHaveBeenCalledWith(level.vertex_position(10));

    expect(teleportObjectToVertex(offline.id, 10, 20)).toBe(true);
    expect(registry.simulator.teleport_object).toHaveBeenCalledWith(offline.id, 20, 10, level.vertex_position(10));

    expect(teleportObjectToVertex(item.id(), 10, 20)).toBe(false);
  });
});

describe("isActorInNoWeaponZone", () => {
  it("should correctly check if actor is in no weapon zone", () => {
    const zone: GameObject = MockGameObject.mock();

    expect(isActorInNoWeaponZone()).toBe(false);

    registry.noWeaponZones.set(zone.id(), true);
    expect(isActorInNoWeaponZone()).toBe(true);

    registry.noWeaponZones.set(zone.id(), false);
    expect(isActorInNoWeaponZone()).toBe(false);
  });
});

describe("getServerDistanceBetween", () => {
  it("should correctly get distance for offline objects", () => {
    const first: ServerObject = MockAlifeObject.mock({ gameVertexId: 500 });

    jest.spyOn(game_graph().vertex(500).game_point(), "distance_to").mockImplementation(() => 600);
    expect(getServerDistanceBetween(first, MockAlifeObject.mock())).toBe(600);

    const second: ServerObject = MockAlifeObject.mock({ gameVertexId: 501 });

    jest.spyOn(game_graph().vertex(501).game_point(), "distance_to").mockImplementation(() => 255);
    expect(getServerDistanceBetween(second, MockAlifeObject.mock())).toBe(255);
  });
});
