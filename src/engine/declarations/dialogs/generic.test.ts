import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { EGameObjectRelation, GameObject } from "xray16/alias";
import { ACTOR_ID, AnyArgs, AnyObject, TName } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager, registerActor, registerSimulator, registry } from "@/engine/core/database";
import { ActorInputManager } from "@/engine/core/managers/actor";
import { breakObjectDialog } from "@/engine/core/utils/dialog";
import { actorHasMedKit, getActorAvailableMedKit, getAnyObjectPistol } from "@/engine/core/utils/item";
import { enableObjectWoundedHealing } from "@/engine/core/utils/object";
import { transferItemsFromActor } from "@/engine/core/utils/reward";
import { callBinding, mockRegisteredActor } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/item", () => ({
  getActorAvailableMedKit: jest.fn(() => null),
  actorHasMedKit: jest.fn(() => false),
  getAnyObjectPistol: jest.fn(() => null),
  transferItemsFromActor: jest.fn(() => null),
}));

jest.mock("@/engine/core/utils/object", () => ({
  enableObjectWoundedHealing: jest.fn(() => null),
}));

jest.mock("@/engine/core/utils/reward", () => ({
  transferItemsFromActor: jest.fn(() => null),
}));

jest.mock("@/engine/core/utils/dialog", () => ({
  breakObjectDialog: jest.fn(),
  updateObjectDialog: jest.fn(),
  getNpcSpeaker: (first: GameObject, second: GameObject) => (first.id() === ACTOR_ID ? second : first),
}));

function callDialogsBinding(name: TName, args: AnyArgs = []): boolean {
  return callBinding(name, args, (_G as AnyObject)["dialogs"]);
}

beforeAll(() => {
  require("@/engine/declarations/dialogs/generic");
});

describe("break_dialog", () => {
  it("should correctly break", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mock();

    callDialogsBinding("break_dialog", [actorGameObject, object]);
    expect(breakObjectDialog).toHaveBeenCalledWith(object);
  });
});

describe("actor_have_medkit", () => {
  it("should correctly check medkit", () => {
    replaceFunctionMock(actorHasMedKit, () => true);

    expect(callDialogsBinding("actor_have_medkit")).toBe(true);
    expect(actorHasMedKit).toHaveBeenCalled();

    replaceFunctionMock(actorHasMedKit, () => false);

    expect(callDialogsBinding("actor_have_medkit")).toBe(false);
    expect(actorHasMedKit).toHaveBeenCalled();
  });
});

describe("actor_hasnt_medkit", () => {
  it("should correctly check medkit", () => {
    replaceFunctionMock(actorHasMedKit, () => true);

    expect(callDialogsBinding("actor_hasnt_medkit")).toBe(false);
    expect(actorHasMedKit).toHaveBeenCalled();

    replaceFunctionMock(actorHasMedKit, () => false);

    expect(callDialogsBinding("actor_hasnt_medkit")).toBe(true);
    expect(actorHasMedKit).toHaveBeenCalled();
  });
});

describe("transfer_medkit", () => {
  it("should correctly transfer medkits", () => {
    const medkit: GameObject = MockGameObject.mock({ section: "medkit" });
    const actor: GameObject = MockGameObject.mockActor({ inventory: [["medkit", medkit]] });
    const object: GameObject = MockGameObject.mock();

    registerActor(actor);
    registerSimulator();

    resetFunctionMock(transferItemsFromActor);
    replaceFunctionMock(getActorAvailableMedKit, () => "medkit");

    callDialogsBinding("transfer_medkit", [actor, object]);

    expect(transferItemsFromActor).toHaveBeenCalledWith(object, "medkit");
    expect(registry.simulator.create).toHaveBeenCalledWith(
      "medkit_script",
      object.position(),
      object.level_vertex_id(),
      object.game_vertex_id(),
      object.id()
    );
    expect(enableObjectWoundedHealing).toHaveBeenCalledWith(object);
    expect(object.set_relation).toHaveBeenCalledWith(EGameObjectRelation.FRIEND, actor);
    expect(actor.change_character_reputation).toHaveBeenCalledWith(10);
  });
});

describe("actor_have_bandage", () => {
  it("should correctly check if actor has bandage", () => {
    const { actorGameObject } = mockRegisteredActor();

    expect(callDialogsBinding("actor_have_bandage")).toBe(false);
    expect(actorGameObject.object).toHaveBeenCalledWith("bandage");

    jest.spyOn(actorGameObject, "object").mockImplementation(() => MockGameObject.mock());
    expect(callDialogsBinding("actor_have_bandage")).toBe(true);
  });
});

describe("transfer_bandage", () => {
  it("should correctly transfer actor has bandage", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mock();

    resetFunctionMock(transferItemsFromActor);
    callDialogsBinding("transfer_bandage", [actorGameObject, object]);

    expect(transferItemsFromActor).toHaveBeenCalledWith(object, "bandage");
    expect(object.set_relation).toHaveBeenCalledWith(EGameObjectRelation.FRIEND, actorGameObject);
  });
});

describe("kill_yourself", () => {
  it("should correctly force actor kill", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mock();

    callDialogsBinding("kill_yourself", [actorGameObject, object]);

    expect(actorGameObject.kill).toHaveBeenCalledWith(object);
  });
});

describe("has_2000_money", () => {
  it("should correctly check money amount", () => {
    const first: GameObject = MockGameObject.mock({ money: 1000 });
    const second: GameObject = MockGameObject.mock({ money: 2000 });

    expect(callDialogsBinding("has_2000_money", [first])).toBe(false);
    expect(callDialogsBinding("has_2000_money", [second])).toBe(true);
  });
});

describe("transfer_any_pistol_from_actor", () => {
  it("should correctly transfer pistols", () => {
    const { actorGameObject } = mockRegisteredActor();

    callDialogsBinding("transfer_any_pistol_from_actor", []);
    expect(actorGameObject.transfer_item).not.toHaveBeenCalled();

    const speaker: GameObject = MockGameObject.mock();
    const fort: GameObject = MockGameObject.mock();

    replaceFunctionMock(getAnyObjectPistol, () => fort);

    callDialogsBinding("transfer_any_pistol_from_actor", [actorGameObject, speaker]);
    expect(actorGameObject.transfer_item).toHaveBeenCalledWith(fort, speaker);
  });
});

describe("have_actor_any_pistol", () => {
  it("should correctly check pistols", () => {
    const { actorGameObject } = mockRegisteredActor();

    replaceFunctionMock(getAnyObjectPistol, () => null);
    expect(callDialogsBinding("have_actor_any_pistol", [])).toBe(false);
    expect(getAnyObjectPistol).toHaveBeenCalledWith(actorGameObject);

    replaceFunctionMock(getAnyObjectPistol, () => MockGameObject.mock());
    expect(callDialogsBinding("have_actor_any_pistol", [])).toBe(true);
  });
});

describe("disable_ui", () => {
  it("should correctly disable UI", () => {
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(actorInputManager, "disableGameUi").mockImplementation(jest.fn());

    callDialogsBinding("disable_ui");
    expect(actorInputManager.disableGameUi).toHaveBeenCalledTimes(1);
    expect(actorInputManager.disableGameUi).toHaveBeenCalledWith(true);
  });
});

describe("disable_ui_only", () => {
  it("should correctly disable UI only", () => {
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(actorInputManager, "disableGameUiOnly").mockImplementation(jest.fn());

    callDialogsBinding("disable_ui_only");
    expect(actorInputManager.disableGameUiOnly).toHaveBeenCalledTimes(1);
  });
});
