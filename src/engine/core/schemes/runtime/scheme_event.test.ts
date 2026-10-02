import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { IRegistryObjectState, registerObject, registry } from "@/engine/core/database";
import { AbstractScheme } from "@/engine/core/schemes/base/AbstractScheme";
import { emitSchemeEvent, setObjectActiveSchemeSignal } from "@/engine/core/schemes/runtime/scheme_event";
import { ISchemeMeetState } from "@/engine/core/schemes/stalker/meet";
import { getSchemeStateOptimistic, IBaseSchemeState, setSchemeState } from "@/engine/core/schemes/state";
import { EScheme, ESchemeEvent } from "@/engine/core/schemes/types";
import { mockSchemeState, resetRegistry } from "@/fixtures/engine/mocks";

describe("emitSchemeEvent", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly emit events", () => {
    const object: GameObject = MockGameObject.mock();
    const schemeState: IBaseSchemeState = mockSchemeState(EScheme.MEET);
    const mockAction = {
      activate: jest.fn(),
      deactivate: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      onDeath: jest.fn(),
      onCutscene: jest.fn(),
      onCombat: jest.fn(),
      onExtrapolate: jest.fn(),
      onSwitchOnline: jest.fn(),
      onSwitchOffline: jest.fn(),
      onHit: jest.fn(),
      onUse: jest.fn(),
      onWaypoint: jest.fn(),
    };

    expect(() => emitSchemeEvent(schemeState, ESchemeEvent.ACTIVATE)).not.toThrow();

    schemeState.actions = new LuaTable();
    schemeState.actionsList = new LuaTable();
    expect(() => emitSchemeEvent(schemeState, ESchemeEvent.ACTIVATE)).not.toThrow();

    AbstractScheme.subscribe(schemeState, mockAction);

    emitSchemeEvent(schemeState, ESchemeEvent.ACTIVATE, object, 1, 2, 3);
    expect(mockAction.activate).toHaveBeenCalledWith(object, 1, 2, 3);

    emitSchemeEvent(schemeState, ESchemeEvent.DEACTIVATE);
    expect(mockAction.deactivate).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.DEATH);
    expect(mockAction.onDeath).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.CUTSCENE);
    expect(mockAction.onCutscene).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.COMBAT);
    expect(mockAction.onCombat).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.EXTRAPOLATE);
    expect(mockAction.onExtrapolate).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.SWITCH_OFFLINE);
    expect(mockAction.onSwitchOffline).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.SWITCH_ONLINE);
    expect(mockAction.onSwitchOnline).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.HIT);
    expect(mockAction.onHit).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.SAVE);
    expect(mockAction.save).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.UPDATE);
    expect(mockAction.update).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.USE);
    expect(mockAction.onUse).toHaveBeenCalledTimes(1);

    emitSchemeEvent(schemeState, ESchemeEvent.WAYPOINT);
    expect(mockAction.onWaypoint).toHaveBeenCalledTimes(1);
  });
});

describe("emitSchemeEvent subscriptions changed while emitting", () => {
  it("should not call handlers unsubscribed by an earlier handler", () => {
    const schemeState: IBaseSchemeState = mockSchemeState(EScheme.MEET);
    const later = { update: jest.fn() };
    const first = { update: jest.fn(() => AbstractScheme.unsubscribe(schemeState, later)) };

    AbstractScheme.subscribe(schemeState, first);
    AbstractScheme.subscribe(schemeState, later);

    emitSchemeEvent(schemeState, ESchemeEvent.UPDATE, 16);

    expect(first.update).toHaveBeenCalledWith(16);
    expect(later.update).not.toHaveBeenCalled();
  });

  it("should call handlers subscribed during an emit from the next one", () => {
    const schemeState: IBaseSchemeState = mockSchemeState(EScheme.MEET);
    const added = { update: jest.fn() };
    const first = { update: jest.fn(() => AbstractScheme.subscribe(schemeState, added)) };

    AbstractScheme.subscribe(schemeState, first);

    emitSchemeEvent(schemeState, ESchemeEvent.UPDATE, 16);

    expect(added.update).not.toHaveBeenCalled();

    emitSchemeEvent(schemeState, ESchemeEvent.UPDATE, 16);

    expect(added.update).toHaveBeenCalledTimes(1);
  });
});

describe("setObjectActiveSchemeSignal", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly set signals", () => {
    const object: GameObject = MockGameObject.mock();

    expect(() => setObjectActiveSchemeSignal(object, "test")).not.toThrow();
    expect(registry.objects.get(object.id())).toBeNull();

    const mockMeetState: ISchemeMeetState = mockSchemeState<ISchemeMeetState>(EScheme.MEET, {
      signals: new LuaTable(),
    });
    const state: IRegistryObjectState = registerObject(object);

    expect(() => setObjectActiveSchemeSignal(object, "test")).not.toThrow();
    expect(state).toEqual({ object });

    setSchemeState(state, EScheme.MEET, mockMeetState);
    setObjectActiveSchemeSignal(object, "test");
    expect(getSchemeStateOptimistic(state, EScheme.MEET).signals).toEqualLuaTables({});

    state.activeScheme = EScheme.MEET;
    setObjectActiveSchemeSignal(object, "test");
    setObjectActiveSchemeSignal(object, "another");
    expect(getSchemeStateOptimistic(state, EScheme.MEET).signals).toEqualLuaTables({ test: true, another: true });
  });
});
