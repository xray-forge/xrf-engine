import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerHumanObject, ServerObject } from "xray16/alias";
import { LuaArray } from "xray16/lib";
import { MockAlifeHumanStalker, MockAlifeObject, MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerObject, registerSimulator } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  describeDebugObject,
  formatDebugPosition,
  inspectActorLocation,
  inspectDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_inspect";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

function toRecord(fields: LuaArray<IDebugField>): Record<string, string> {
  const record: Record<string, string> = {};

  for (const index of $range(1, fields.length())) {
    record[fields.get(index).label] = fields.get(index).value;
  }

  return record;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  resetFunctionMock(level.object_by_id);
});

describe("formatDebugPosition", () => {
  it("should round to decimetres", () => {
    expect(formatDebugPosition(MockVector.mock(1.04, -2.36, 300))).toBe("1.0, -2.4, 300.0");
  });
});

describe("describeDebugObject", () => {
  it("should name existing objects", () => {
    const serverObject: ServerObject = MockAlifeObject.mock({ name: "test_object" });

    expect(describeDebugObject(serverObject.id)).toBe(`test_object (${serverObject.id})`);
    expect(describeDebugObject(60_000)).toBe("gone (60000)");
  });
});

describe("inspectActorLocation", () => {
  it("should describe where the actor stands", () => {
    mockRegisteredActor({ position: MockVector.mock(1, 2, 3), levelVertexId: 42 });
    replaceFunctionMock(level.name, () => "zaton");

    expect(inspectActorLocation()).toBe("zaton  1.0, 2.0, 3.0  lv 42");
  });
});

describe("inspectDebugTarget", () => {
  it("should describe nothing for missing objects", () => {
    expect(inspectDebugTarget(60_000).length()).toBe(0);
  });

  it("should describe online objects", () => {
    mockRegisteredActor({ position: MockVector.mock(0, 0, 0) });

    const object: GameObject = MockGameObject.mock({ position: MockVector.mock(3, 0, 4) });

    MockAlifeObject.mock({ id: object.id(), section: "test_section" });
    registerObject(object);

    expect(toRecord(inspectDebugTarget(object.id()))).toEqual({
      object: describeDebugObject(object.id()),
      section: "test_section",
      state: "online",
      position: "3.0, 0.0, 4.0",
      distance: "5.0 m",
    });
  });

  it("should describe online stalkers in detail", () => {
    const { actorGameObject } = mockRegisteredActor();
    const object: GameObject = MockGameObject.mockStalker({ health: 0.5, community: "stalker" });
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock({ id: object.id() });

    jest.spyOn(object, "general_goodwill").mockImplementation(() => 1_200);

    registerObject(object).activeScheme = EScheme.WALKER;

    const fields: Record<string, string> = toRecord(inspectDebugTarget(serverObject.id));

    expect(fields.state).toBe("online");
    expect(fields.health).toBe("50%");
    expect(fields.community).toBe("stalker");
    expect(fields.relation).toBe("friend (1200)");
    expect(fields["logic scheme"]).toBe(EScheme.WALKER);
    expect(object.general_goodwill).toHaveBeenCalledWith(actorGameObject);
  });

  it("should describe offline objects", () => {
    const serverObject: ServerObject = MockAlifeObject.mock({ position: MockVector.mock(1, 1, 1) });

    const fields: Record<string, string> = toRecord(inspectDebugTarget(serverObject.id));

    expect(fields.state).toBe("offline");
    expect(fields.position).toBe("1.0, 1.0, 1.0");
    expect(fields.level).toBeDefined();
  });
});
