import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, ServerHumanObject } from "xray16/alias";
import { MockAlifeHumanStalker, MockGameObject } from "xray16/mocks";

import { registerObject, registerSimulator } from "@/engine/core/database";
import { getSquadMembers, killSquadMember } from "@/engine/core/utils/squad/squad_members";
import { MockSquad, resetRegistry } from "@/fixtures/engine";

describe("getSquadMembers", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should list members as they are when called, whatever the squad does later", () => {
    const squad: MockSquad = MockSquad.mock();
    const first: ServerHumanObject = MockAlifeHumanStalker.mock();
    const second: ServerHumanObject = MockAlifeHumanStalker.mock();

    squad.mockAddMember(first);
    squad.mockAddMember(second);

    const members = getSquadMembers(squad);

    squad.unregister_member(first.id);

    expect(members.length()).toBe(2);
    expect(members.get(1)).toBe(first);
    expect(members.get(2)).toBe(second);
    expect(getSquadMembers(MockSquad.mock()).length()).toBe(0);
  });
});

describe("killSquadMember", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should kill online members on the client and offline members on the server", () => {
    const online: ServerHumanObject = MockAlifeHumanStalker.mock();
    const offline: ServerHumanObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: online.id });

    registerObject(object);
    jest.spyOn(online, "kill");
    jest.spyOn(offline, "kill");

    killSquadMember(online);
    killSquadMember(offline);

    expect(object.kill).toHaveBeenCalledWith(object);
    expect(online.kill).not.toHaveBeenCalled();
    expect(offline.kill).toHaveBeenCalledTimes(1);
  });
});
