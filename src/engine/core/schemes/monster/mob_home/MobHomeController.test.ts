import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, ServerCreatureObject, ServerSmartZoneObject } from "xray16/alias";
import { TDistance, TName } from "xray16/lib";
import { MockAlifeSimulator, MockAlifeSmartZone, MockGameObject, MockServerAlifeCreatureAbstract } from "xray16/mocks";

import { EMonsterState } from "@/engine/constants/monsters";
import { registerSimulator } from "@/engine/core/database";
import { ISchemeMobHomeState } from "@/engine/core/schemes/monster/mob_home/mob_home_types";
import { MobHomeController } from "@/engine/core/schemes/monster/mob_home/MobHomeController";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState } from "@/fixtures/engine/mocks";

describe("MobHomeController", () => {
  beforeEach(() => {
    registerSimulator();
  });

  it("should correctly call set home", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMinRadius: 40,
      homeMaxRadius: 60,
      homeWayPoint: "test-wp",
      isAggressive: true,
      monsterState: EMonsterState.NONE,
      isSmartTerrainPoint: false,
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    jest.spyOn(controller, "getHomeParameters").mockImplementation(() => {
      return $multi(
        state.homeWayPoint as TName,
        state.homeMinRadius as TDistance,
        state.homeMaxRadius as TDistance,
        state.isAggressive,
        state.homeMidRadius as TDistance
      );
    });

    controller.activate();

    expect(controller.getHomeParameters).toHaveBeenCalledTimes(1);
    expect(object.set_home).toHaveBeenCalledWith(
      state.homeWayPoint,
      state.homeMinRadius,
      state.homeMaxRadius,
      state.isAggressive,
      state.homeMidRadius
    );

    controller.deactivate();

    expect(object.remove_home).toHaveBeenCalledTimes(1);
  });

  it("should correctly get home location for generic points", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMinRadius: 100,
      homeMaxRadius: 200,
      homeWayPoint: "test-wp",
      isAggressive: true,
      monsterState: EMonsterState.NONE,
      isSmartTerrainPoint: false,
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    const [name, minRadius, maxRadius, isAggressive, midRadius] = controller.getHomeParameters();

    expect(name).toBe("test-wp");
    expect(minRadius).toBe(100);
    expect(maxRadius).toBe(200);
    expect(midRadius).toBe(150);
    expect(isAggressive).toBe(true);
  });

  it("should correctly get home location for defaults", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeWayPoint: "test-wp",
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    const [name, minRadius, maxRadius, isAggressive, midRadius] = controller.getHomeParameters();

    expect(name).toBe("test-wp");
    expect(minRadius).toBe(10);
    expect(maxRadius).toBe(70);
    expect(isAggressive).toBe(false);
    expect(midRadius).toBe(40);
  });

  it("should correctly get home location for smart terrains", () => {
    const terrain: ServerSmartZoneObject = MockAlifeSmartZone.mock({ levelVertexId: 333 });
    const object: GameObject = MockGameObject.mock();
    const serverObject: ServerCreatureObject = MockServerAlifeCreatureAbstract.mock({
      id: object.id(),
      smartTerrainId: terrain.id,
    });

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(terrain);

    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeWayPoint: "test-wp",
      isSmartTerrainPoint: true,
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    const [name, minRadius, maxRadius, isAggressive, midRadius] = controller.getHomeParameters();

    expect(name).toBe(333);
    expect(minRadius).toBe(10);
    expect(maxRadius).toBe(70);
    expect(isAggressive).toBe(false);
    expect(midRadius).toBe(40);
  });

  it("should read radiuses from waypoint data", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeWayPoint: "test-wp-home-radius",
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    const [, minRadius, maxRadius, , midRadius] = controller.getHomeParameters();

    expect(minRadius).toBe(20);
    expect(maxRadius).toBe(80);
    expect(midRadius).toBe(50);
  });

  it("should keep configured mid radius when it fits between bounds", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMaxRadius: 200,
      homeMidRadius: 120,
      homeMinRadius: 100,
      homeWayPoint: "test-wp",
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    expect(controller.getHomeParameters()[4]).toBe(120);
  });

  it("should recompute mid radius that falls outside of bounds", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMaxRadius: 200,
      homeMidRadius: 500,
      homeMinRadius: 100,
      homeWayPoint: "test-wp",
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    expect(controller.getHomeParameters()[4]).toBe(150);
  });

  it.each([null, 30, 50])("should activate equal home radiuses with configured mid radius %s", (homeMidRadius) => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMaxRadius: 30,
      homeMidRadius,
      homeMinRadius: 30,
      homeWayPoint: "test-wp",
      monsterState: EMonsterState.NONE,
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    controller.activate();

    expect(object.set_home).toHaveBeenCalledWith("test-wp", 30, 30, false, 30);
  });

  it("should fail when min radius exceeds max radius", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeMaxRadius: 100,
      homeMinRadius: 200,
      homeWayPoint: "test-wp",
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    expect(() => controller.getHomeParameters()).toThrow("MobHome: Home min Radius MUST be <= max radius.");
  });

  it("should get home location without waypoint", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeMobHomeState = mockSchemeState<ISchemeMobHomeState>(EScheme.MOB_HOME, {
      homeWayPoint: null,
    });

    const controller: MobHomeController = new MobHomeController(object, state);

    const [name, minRadius, maxRadius] = controller.getHomeParameters();

    expect(name).toBeNull();
    expect(minRadius).toBe(10);
    expect(maxRadius).toBe(70);
  });
});
