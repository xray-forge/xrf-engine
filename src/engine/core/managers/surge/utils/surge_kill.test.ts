import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { AnyObject } from "xray16/lib";
import { resetFunctionMock } from "xray16/testing/utils";

import * as database from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor/actor_input_types";
import { ActorInputManager } from "@/engine/core/managers/actor/ActorInputManager";
import { getSimulationSquads } from "@/engine/core/managers/simulation/utils";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import {
  canSurgeKillSquad,
  getNearestAvailableSurgeCover,
  getOnlineSurgeCoversList,
} from "@/engine/core/managers/surge/utils/surge_cover";
import { isImmuneToSurgeSquad } from "@/engine/core/managers/surge/utils/surge_generic";
import {
  killAllSurgeUnhidden,
  killAllSurgeUnhiddenAfterActorDeath,
} from "@/engine/core/managers/surge/utils/surge_kill";
import { isObjectOnLevel } from "@/engine/core/utils/position";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/simulation/utils");
jest.mock("@/engine/core/managers/surge/utils/surge_cover");
jest.mock("@/engine/core/managers/surge/utils/surge_generic");
jest.mock("@/engine/core/utils/position");

function createSquadMember(id: number): AnyObject {
  return {
    object: {
      id,
      kill: jest.fn(),
      name: jest.fn(() => `member_${id}`),
      position: {},
    },
  };
}

function createSquad(member: AnyObject): AnyObject {
  return {
    faction: "stalker",
    name: jest.fn(() => "test_squad"),
    squad_members: jest.fn(() => [member] as never),
  };
}

function setSimulationSquads(...squads: Array<AnyObject>): void {
  const simulationSquads: LuaTable<number, AnyObject> = new LuaTable();

  squads.forEach((squad, index) => simulationSquads.set(index + 1, squad));
  (getSimulationSquads as jest.Mock).mockReturnValue(simulationSquads);
}

describe("killAllSurgeUnhidden", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    resetFunctionMock(level.add_cam_effector);
    resetFunctionMock(level.add_pp_effector);
    (getOnlineSurgeCoversList as jest.Mock).mockReturnValue(new LuaTable());
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue(null);
    (canSurgeKillSquad as jest.Mock).mockReturnValue(true);
    (isImmuneToSurgeSquad as jest.Mock).mockReturnValue(false);
    (isObjectOnLevel as jest.Mock).mockReturnValue(true);
    surgeConfig.CAN_SURVIVE_SURGE = parseConditionsList("true");
  });

  it("should hit registered crows and kill unprotected non-story squad members on the current level", () => {
    const crow: AnyObject = { alive: jest.fn(() => true), hit: jest.fn() };
    const member: AnyObject = createSquadMember(10);

    database.registry.crows.storage.set(1, 1);
    database.registry.objects.set(1, { object: crow } as never);
    setSimulationSquads(createSquad(member));
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue({ inside: jest.fn(() => true) });

    killAllSurgeUnhidden();

    expect(crow.hit).toHaveBeenCalledTimes(1);
    expect(member.object.kill).toHaveBeenCalledTimes(1);
  });

  it("should preserve squads protected by surge covers, immunity, or story-object status", () => {
    const protectedMember: AnyObject = createSquadMember(10);
    const immuneMember: AnyObject = createSquadMember(11);
    const storyMember: AnyObject = createSquadMember(12);
    const protectedSquad: AnyObject = createSquad(protectedMember);
    const immuneSquad: AnyObject = createSquad(immuneMember);
    const storySquad: AnyObject = createSquad(storyMember);
    const covers: LuaTable<number, AnyObject> = new LuaTable();

    setSimulationSquads(protectedSquad, immuneSquad, storySquad);
    (canSurgeKillSquad as jest.Mock).mockImplementation((...args: Array<unknown>) => args[0] !== protectedSquad);
    (isImmuneToSurgeSquad as jest.Mock).mockImplementation((...args: Array<unknown>) => args[0] === immuneSquad);
    covers.set(1, { inside: jest.fn(() => true) });
    (getOnlineSurgeCoversList as jest.Mock).mockReturnValue(covers);
    storySquad.id = 12;
    database.registry.storyLink.sidById.set(12, "story_squad");
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue({ inside: jest.fn(() => true) });

    killAllSurgeUnhidden();

    expect(protectedMember.object.kill).not.toHaveBeenCalled();
    expect(immuneMember.object.kill).not.toHaveBeenCalled();
    expect(storyMember.object.kill).not.toHaveBeenCalled();
  });

  it("should apply the survival effect and actor input lock when the actor can survive the surge", () => {
    const controlManager: ActorInputManager = database.getManager(ActorInputManager);

    jest.spyOn(controlManager, "acquireControl").mockImplementation(jest.fn());
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue({ inside: jest.fn(() => false) });
    setSimulationSquads();

    killAllSurgeUnhidden();

    expect(controlManager.acquireControl).toHaveBeenCalledWith(
      EActorControlHandle.SURGE,
      "surge",
      EActorControlPolicy.UI_ONLY,
      true
    );
    expect(level.add_cam_effector).toHaveBeenCalledTimes(1);
    expect(level.add_pp_effector).toHaveBeenCalledTimes(1);
  });

  it("should kill the actor and release remaining unprotected members when survival is disallowed", () => {
    const member: AnyObject = createSquadMember(10);

    surgeConfig.CAN_SURVIVE_SURGE = parseConditionsList("false");
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue({ inside: jest.fn(() => false) });
    setSimulationSquads(createSquad(member));

    killAllSurgeUnhidden();

    expect(database.registry.actor.kill).toHaveBeenCalledWith(database.registry.actor);
    expect(member.object.kill).toHaveBeenCalledTimes(2);
  });
});

describe("killAllSurgeUnhiddenAfterActorDeath", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    (getOnlineSurgeCoversList as jest.Mock).mockReturnValue(new LuaTable());
    (isImmuneToSurgeSquad as jest.Mock).mockReturnValue(false);
    (isObjectOnLevel as jest.Mock).mockReturnValue(true);
  });

  it("should kill current-level, non-immune squad members outside registered surge covers", () => {
    const member: AnyObject = createSquadMember(10);

    setSimulationSquads(createSquad(member));

    killAllSurgeUnhiddenAfterActorDeath();

    expect(member.object.kill).toHaveBeenCalledTimes(1);
  });
});

describe("surge kills of squads whose members leave on death", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    (getOnlineSurgeCoversList as jest.Mock).mockReturnValue(new LuaTable());
    (getNearestAvailableSurgeCover as jest.Mock).mockReturnValue(null);
    (canSurgeKillSquad as jest.Mock).mockReturnValue(true);
    (isImmuneToSurgeSquad as jest.Mock).mockReturnValue(false);
    (isObjectOnLevel as jest.Mock).mockReturnValue(true);
    surgeConfig.CAN_SURVIVE_SURGE = parseConditionsList("true");
  });

  /**
   * @returns Squad whose members leave it when they die, as the engine does during iteration.
   */
  function createShrinkingSquad(): [AnyObject, Array<AnyObject>] {
    const members: Array<AnyObject> = [createSquadMember(10), createSquadMember(11), createSquadMember(12)];
    const listed: Array<AnyObject> = [...members];

    members.forEach((member) => member.object.kill.mockImplementation(() => listed.splice(listed.indexOf(member), 1)));

    return [{ ...createSquad(members[0]), squad_members: jest.fn(() => listed.values()) }, members];
  }

  it("should kill every member once when each death unregisters the member", () => {
    const [squad, members] = createShrinkingSquad();

    setSimulationSquads(squad);
    killAllSurgeUnhidden();

    members.forEach((member) => expect(member.object.kill).toHaveBeenCalledTimes(1));
  });

  it("should kill every member once after actor death when each death unregisters the member", () => {
    const [squad, members] = createShrinkingSquad();

    setSimulationSquads(squad);
    killAllSurgeUnhiddenAfterActorDeath();

    members.forEach((member) => expect(member.object.kill).toHaveBeenCalledTimes(1));
  });
});
