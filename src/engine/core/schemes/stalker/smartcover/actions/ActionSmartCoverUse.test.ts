import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { NIL } from "xray16/lib";
import { MockGameObject, MockPropertyStorage, MockVector } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { ESmartCoverState, EStalkerState } from "@/engine/core/animation/types";
import { getManager, registerSmartCover, registerStoryLink } from "@/engine/core/database";
import { setStalkerState } from "@/engine/core/database/stalker";
import { parseConditionsList } from "@/engine/core/ini";
import { SoundManager } from "@/engine/core/managers/sounds";
import { SmartCover } from "@/engine/core/objects/smart_cover";
import { ISchemeSmartCoverState } from "@/engine/core/schemes/stalker/smartcover";
import { ActionSmartCoverUse } from "@/engine/core/schemes/stalker/smartcover/actions/ActionSmartCoverUse";
import { EScheme } from "@/engine/core/schemes/types";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/database/stalker");

describe("ActionSmartCoverUse", () => {
  beforeEach(() => {
    resetRegistry();

    resetFunctionMock(setStalkerState);
  });

  it("should correctly initialize", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState(EScheme.SMARTCOVER);
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    expect(action.state).toBe(state);
    expect(action.isInitialized).toBe(false);
    expect(action.firePosition).toBeNull();
    expect(action.targetEnemyId).toBeNull();

    jest.spyOn(action, "activate").mockImplementation(jest.fn());

    action.initialize();

    expect(action.activate).toHaveBeenCalledTimes(1);
    expect(action.isInitialized).toBe(true);
  });

  it("should correctly activate", () => {
    mockRegisteredActor();

    const smartCover: SmartCover = new SmartCover("test-smart-cover");
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {
      coverName: smartCover.name(),
      idleMinTime: 1,
      idleMaxTime: 2,
      lookoutMinTime: 3,
      lookoutMaxTime: 4,
      targetPath: "{+a} first, second",
      coverState: "{-b} test, nil",
    });

    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    jest.spyOn(action, "updateSmartCoverTargetState").mockImplementation(jest.fn());
    jest.spyOn(action, "updateSmartCoverTargetSelector").mockImplementation(jest.fn());
    jest.spyOn(action, "updateSmartCoverTarget").mockImplementation(jest.fn(() => false));

    action.isInitialized = true;

    registerSmartCover(smartCover);

    action.activate();

    expect(state.signals).toEqualLuaTables({});
    expect(action.targetEnemyId).toBeNull();
    expect(action.coverName).toBe(smartCover.name());

    expect(action.updateSmartCoverTarget).toHaveBeenCalledTimes(1);
    expect(action.updateSmartCoverTargetState).toHaveBeenCalledTimes(1);
    expect(action.updateSmartCoverTargetSelector).toHaveBeenCalledTimes(1);

    expect(object.set_smart_cover_target).toHaveBeenCalledTimes(1);
    expect(setStalkerState).toHaveBeenCalledWith(object, EStalkerState.SMART_COVER);

    expect(action.targetPathCondlist).toEqualLuaTables(parseConditionsList("{+a} first, second"));
    expect(action.coverCondlist).toEqualLuaTables(parseConditionsList("{-b} test, nil"));
    expect(action.coverState).toBe("test");

    expect(object.idle_min_time).toHaveBeenCalledWith(1);
    expect(object.idle_max_time).toHaveBeenCalledWith(2);
    expect(object.lookout_min_time).toHaveBeenCalledWith(3);
    expect(object.lookout_max_time).toHaveBeenCalledWith(4);
  });

  it("should skip activate before initialization", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.isInitialized = false;

    action.activate();

    expect(state.signals).toEqualLuaTables({});
    expect(action.targetEnemyId).toBeNull();

    expect(object.idle_min_time).toHaveBeenCalledTimes(0);
    expect(object.idle_max_time).toHaveBeenCalledTimes(0);
    expect(object.lookout_min_time).toHaveBeenCalledTimes(0);
    expect(object.lookout_max_time).toHaveBeenCalledTimes(0);
  });

  it("should correctly deactivate", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.state.coverName = "test-name";
    action.state.loopholeName = "test-loophole";

    action.deactivate();

    expect(action.state.coverName).toBeNull();
    expect(action.state.loopholeName).toBeNull();
  });

  it("should correctly finalize", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.isInitialized = true;

    action.finalize();

    expect(action.isInitialized).toBe(false);
  });

  it("should correctly execute", () => {
    const manager: SoundManager = getManager(SoundManager);
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    const enemy: GameObject = MockGameObject.mock();

    jest.spyOn(action, "updateSmartCoverTargetSelector").mockImplementation(jest.fn());
    jest.spyOn(manager, "play").mockImplementation(jest.fn(() => null));
    jest.spyOn(object, "in_smart_cover").mockImplementation(jest.fn(() => true));
    jest.spyOn(enemy, "in_current_loophole_fov").mockImplementation(jest.fn(() => true));

    state.signals = new LuaTable();
    state.soundIdle = "test-sound";
    action.targetEnemyId = enemy.id();
    action.coverState = ESmartCoverState.FIRE_TARGET;
    action.coverCondlist = parseConditionsList("{-a} fire_target, test");

    action.execute();

    expect(action.coverState).toBe(ESmartCoverState.FIRE_TARGET);
    expect(action.updateSmartCoverTargetSelector).toHaveBeenCalledTimes(1);
    expect(manager.play).toHaveBeenCalledWith(object.id(), "test-sound");
    expect(state.signals).toEqualLuaTables({ enemy_in_fov: true });

    jest.spyOn(enemy, "in_current_loophole_fov").mockImplementation(jest.fn(() => false));
    action.coverCondlist = parseConditionsList(ESmartCoverState.DEFAULT);

    action.execute();

    expect(state.signals).toEqualLuaTables({ enemy_not_in_fov: true });
  });

  it("should correctly update smart cover target", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    jest.spyOn(action, "updateSmartCoverTarget").mockImplementation(jest.fn(() => false));

    // Dead.
    jest.spyOn(object, "alive").mockImplementation(() => false);
    action.coverState = ESmartCoverState.IDLE_TARGET;

    action.updateSmartCoverTargetState();

    expect(action.updateSmartCoverTarget).toHaveBeenCalledTimes(0);
    expect(object.set_smart_cover_target_idle).toHaveBeenCalledTimes(0);

    // Idle.
    jest.spyOn(object, "alive").mockImplementation(() => true);

    action.updateSmartCoverTargetState();

    expect(object.set_smart_cover_target_idle).toHaveBeenCalledTimes(1);

    // Lookout.
    action.coverState = ESmartCoverState.LOOKOUT_TARGET;

    action.updateSmartCoverTargetState();

    expect(action.updateSmartCoverTarget).toHaveBeenCalledTimes(1);
    expect(object.set_smart_cover_target_lookout).toHaveBeenCalledTimes(1);

    // Fire target.
    action.coverState = ESmartCoverState.FIRE_TARGET;

    action.updateSmartCoverTargetState();

    expect(object.set_smart_cover_target_fire).toHaveBeenCalledTimes(1);

    // Fire target.
    action.coverState = ESmartCoverState.FIRE_NO_LOOKOUT_TARGET;

    action.updateSmartCoverTargetState();

    expect(action.updateSmartCoverTarget).toHaveBeenCalledTimes(2);
    expect(object.set_smart_cover_target_fire_no_lookout).toHaveBeenCalledTimes(1);

    // Default target.
    action.coverState = NIL;

    action.updateSmartCoverTargetState();

    expect(action.updateSmartCoverTarget).toHaveBeenCalledTimes(3);
    expect(object.set_smart_cover_target_default).toHaveBeenCalledTimes(1);
    expect(object.set_smart_cover_target_default).toHaveBeenCalledWith(true);
  });

  it("should correctly update smart cover target selector", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.coverState = NIL;

    action.updateSmartCoverTargetSelector();
    expect(object.set_smart_cover_target_selector).toHaveBeenCalledTimes(1);

    action.coverState = ESmartCoverState.FIRE_TARGET;

    action.updateSmartCoverTargetSelector();
    expect(object.set_smart_cover_target_selector).toHaveBeenCalledWith(action.updateSmartCoverTargetState, action);
  });

  it("should correctly check smart cover target with path", () => {
   mockRegisteredActor();

    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.targetPathCondlist = parseConditionsList("{-a} test-wp, not-existing");

    expect(action.updateSmartCoverTarget()).toBe(true);
    expect(action.targetPath).toBe("test-wp");
    expect(action.firePosition).toEqual(MockVector.mock(1, 1, 1));
    expect(action.object.set_smart_cover_target).toHaveBeenCalledWith(action.firePosition);

    giveInfoPortion("a");

    expect(() => action.updateSmartCoverTarget()).toThrow("There is no patrol path 'not-existing'.");
  });

  it("should correctly check smart cover target with enemy", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    const enemy: GameObject = MockGameObject.mock();

    registerStoryLink(enemy.id(), "test-sid");
    action.targetPathCondlist = parseConditionsList(NIL);
    state.targetEnemy = "test-sid";

    expect(action.updateSmartCoverTarget()).toBe(true);
    expect(action.targetEnemyId).toBe(enemy.id());
    expect(action.firePosition).toBe(enemy.position());
    expect(action.object.set_smart_cover_target).toHaveBeenCalledWith(enemy);
  });

  it("should correctly check smart cover target with position", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.targetPathCondlist = parseConditionsList(NIL);
    action.state.targetPosition = MockVector.mock(1, 2, 3);

    expect(action.updateSmartCoverTarget()).toBe(true);
    expect(action.object.set_smart_cover_target).toHaveBeenCalledWith(action.state.targetPosition);
    expect(action.firePosition).toEqual(MockVector.mock(1, 2, 3));
  });

  it("should correctly check smart cover target without target", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeSmartCoverState = mockSchemeState<ISchemeSmartCoverState>(EScheme.SMARTCOVER, {});
    const action: ActionSmartCoverUse = new ActionSmartCoverUse(state);

    action.setup(object, MockPropertyStorage.mock());

    action.targetPathCondlist = parseConditionsList(NIL);

    expect(action.updateSmartCoverTarget()).toBe(false);
    expect(action.object.set_smart_cover_target).not.toHaveBeenCalled();
  });
});
