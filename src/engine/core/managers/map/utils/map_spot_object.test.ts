import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { MockAlifeHumanStalker, MockAlifeSimulator, MockGameObject, MockIniFile } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { mapMarks } from "@/engine/constants/map_marks";
import { registry } from "@/engine/core/database";
import { mapDisplayConfig } from "@/engine/core/managers/map/MapDisplayConfig";
import { removeObjectMapSpot, updateObjectMapSpot } from "@/engine/core/managers/map/utils/map_spot_object";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("updateObjectMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();

    registry.simulator = MockAlifeSimulator.getInstance();
    mapDisplayConfig.MAP_MARKS.set("test_spot", { icon: "test_icon", hint: "test_hint" });

    resetFunctionMock(level.map_add_object_spot);
    resetFunctionMock(level.map_remove_object_spot);
  });

  it("should update display for an online friendly game object", () => {
    const object: GameObject = MockGameObject.mock();
    const serverObject = MockAlifeHumanStalker.mock({ id: object.id(), online: true });

    jest.spyOn(object, "general_goodwill").mockReturnValue(0);

    const setVisible = jest.spyOn(serverObject, "visible_for_map");

    MockAlifeSimulator.addToRegistry(serverObject);
    registry.objects.set(object.id(), {
      activeSection: "logic",
      ini: MockIniFile.mock("test.ltx", { logic: { level_spot: "test_spot", show_spot: "true" } }),
      sectionLogic: "logic",
    } as never);

    updateObjectMapSpot(object, null as never, registry.objects.get(object.id())!, "logic");

    expect(setVisible).toHaveBeenCalledWith(true);
    expect(level.map_add_object_spot).toHaveBeenCalledWith(object.id(), "test_icon", "test_hint");
  });

  it("should remove only level spots of objects without one in the active section", () => {
    const object: GameObject = MockGameObject.mock();
    const serverObject = MockAlifeHumanStalker.mock({ id: object.id(), online: true });

    MockAlifeSimulator.addToRegistry(serverObject);
    registry.objects.set(object.id(), {
      activeSection: "logic",
      ini: MockIniFile.mock("test.ltx", { logic: {} }),
      sectionLogic: "logic",
    } as never);
    jest.spyOn(level, "map_has_object_spot").mockImplementation(() => 1);

    updateObjectMapSpot(object, null as never, registry.objects.get(object.id())!, "logic");

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(object.id(), "test_icon");
    expect(level.map_remove_object_spot).toHaveBeenCalledTimes(mapDisplayConfig.MAP_MARKS.length());
    expect(level.map_remove_object_spot).not.toHaveBeenCalledWith(object.id(), mapMarks.storyline_task_location);
    expect(level.map_remove_object_spot).not.toHaveBeenCalledWith(
      object.id(),
      mapMarks.alife_presentation_squad_friend
    );
  });
});

describe("removeObjectMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    registry.simulator = MockAlifeSimulator.getInstance();
    mapDisplayConfig.MAP_MARKS.set("test_spot", { icon: "test_icon", hint: "test_hint" });
    resetFunctionMock(level.map_remove_object_spot);
  });

  it("should remove the configured object mark", () => {
    const object: GameObject = MockGameObject.mock();

    registry.objects.set(object.id(), {
      activeSection: "logic",
      ini: MockIniFile.mock("test.ltx", { logic: { level_spot: "test_spot" } }),
      sectionLogic: "logic",
    } as never);

    removeObjectMapSpot(object);

    expect(level.map_remove_object_spot).toHaveBeenCalledWith(object.id(), "test_icon");
  });
});
