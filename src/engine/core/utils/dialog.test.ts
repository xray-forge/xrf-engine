import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { NIL } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";

import { IRegistryObjectState, registerObject, registerSimulator, registry } from "@/engine/core/database";
import { ISchemeMeetState } from "@/engine/core/schemes/stalker/meet";
import { MeetController } from "@/engine/core/schemes/stalker/meet/MeetController";
import { updateObjectMeetAvailability } from "@/engine/core/schemes/stalker/meet/utils";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import {
  breakObjectDialog,
  getNpcSpeaker,
  getObjectScriptedStartDialog,
  isObjectName,
  updateObjectDialog,
} from "@/engine/core/utils/dialog";
import { updateStalkerLogic } from "@/engine/core/utils/logics";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/stalker/meet/utils");
jest.mock("@/engine/core/utils/logics");

describe("getNpcSpeaker", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    registerSimulator();
  });

  it("should correctly pick speaker", () => {
    const first: GameObject = MockGameObject.mock();
    const second: GameObject = MockGameObject.mock();

    expect(getNpcSpeaker(registry.actor, first)).toBe(first);
    expect(getNpcSpeaker(registry.actor, second)).toBe(second);

    expect(getNpcSpeaker(first, registry.actor)).toBe(first);
    expect(getNpcSpeaker(second, registry.actor)).toBe(second);
  });
});

describe("isObjectName", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    registerSimulator();
  });

  it("should correctly check name", () => {
    const object: GameObject = MockGameObject.mock({ name: "test_complex_name" });

    expect(object.name()).toBe("test_complex_name");
    expect(isObjectName(object, "another")).toBeFalsy();
    expect(isObjectName(object, "test_complex_name")).toBeTruthy();
    expect(isObjectName(object, "complex_name")).toBeTruthy();
    expect(isObjectName(object, "test_complex")).toBeTruthy();
    expect(isObjectName(object, "test")).toBeTruthy();
    expect(isObjectName(object, "complex")).toBeTruthy();
    expect(isObjectName(object, "name")).toBeTruthy();
  });
});

describe("breakObjectDialog", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    registerSimulator();
  });

  it("breakObjectDialog should correctly break", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mock();

    breakObjectDialog(object);

    expect(actorGameObject.stop_talk).toHaveBeenCalledTimes(1);
    expect(object.stop_talk).toHaveBeenCalledTimes(1);
  });
});

describe("updateObjectDialog", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    registerSimulator();
  });

  it("should correctly update dialog state", () => {
    mockRegisteredActor();

    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);
    const meetState: ISchemeMeetState = mockSchemeState(EScheme.MEET);

    setSchemeState(state, EScheme.MEET, meetState);
    meetState.meetController = { update: jest.fn() } as unknown as MeetController;

    updateObjectDialog(object);

    expect(meetState.meetController.update).toHaveBeenCalledTimes(1);
    expect(updateObjectMeetAvailability).toHaveBeenCalledWith(object, state);
    expect(updateStalkerLogic).toHaveBeenCalledWith(object, state);
  });
});

describe("getObjectScriptedStartDialog", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should answer nothing for an object no script set a start dialog on", () => {
    const object: GameObject = MockGameObject.mock();

    expect(getObjectScriptedStartDialog(object)).toBeNull();

    registerObject(object);

    expect(getObjectScriptedStartDialog(object)).toBeNull();
  });

  it("should answer the start dialog the meet scheme set, and nothing once it restored the character's own", () => {
    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);
    const meetState: ISchemeMeetState = mockSchemeState(EScheme.MEET);

    setSchemeState(state, EScheme.MEET, meetState);
    meetState.meetController = { startDialog: "zat_b33_stalker_snag_b52_my_gun_dialog" } as MeetController;

    expect(getObjectScriptedStartDialog(object)).toBe("zat_b33_stalker_snag_b52_my_gun_dialog");

    meetState.meetController.startDialog = NIL;

    expect(getObjectScriptedStartDialog(object)).toBeNull();
  });

  it("should answer the wounded scheme's help dialog while the object lies wounded", () => {
    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);
    const woundedState: ISchemeWoundedState = mockSchemeState<ISchemeWoundedState>(EScheme.WOUNDED, {
      helpStartDialog: "help_dialog",
    });
    const meetState: ISchemeMeetState = mockSchemeState(EScheme.MEET);

    setSchemeState(state, EScheme.WOUNDED, woundedState);
    setSchemeState(state, EScheme.MEET, meetState);
    meetState.meetController = { startDialog: "meet_dialog" } as MeetController;
    woundedState.woundController = { woundState: "true" } as WoundController;

    expect(getObjectScriptedStartDialog(object)).toBe("help_dialog");

    woundedState.woundController.woundState = NIL;

    expect(getObjectScriptedStartDialog(object)).toBe("meet_dialog");
  });
});
