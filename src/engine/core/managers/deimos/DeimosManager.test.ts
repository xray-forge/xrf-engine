import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { MockGameObject, MockNetProcessor } from "xray16/mocks";

import { getManager, registerZone, registry } from "@/engine/core/database";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { ISchemeDeimosState } from "@/engine/core/schemes/restrictor/sr_deimos";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

describe("DeimosManager", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should preserve weapon zoom inertia when starting and stopping Deimos camera effects", () => {
    mockRegisteredActor();

    // OpenXRay eCEZoom is cefNext (2) + 4. Camera effects replace/remove entries by ID.
    const cameraEffects: Map<number, string> = new Map([[6, "weapon_zoom"]]);
    const manager: DeimosManager = getManager(DeimosManager);

    jest.spyOn(level, "add_cam_effector").mockImplementation((animation, id) => {
      cameraEffects.set(id, animation);

      return 0;
    });
    jest.spyOn(level, "remove_cam_effector").mockImplementation((id) => {
      cameraEffects.delete(id);
    });

    manager.triggerHighIntensityEffects("pripyat_horror", "deimos1", 0.1);

    expect(cameraEffects.get(6)).toBe("weapon_zoom");
    expect(cameraEffects.size).toBe(2);
    expect([...cameraEffects.values()]).toContain("camera_effects\\pripyat_horror.anm");

    manager.removeSecondaryEffects();
    manager.removeSecondaryEffects();

    expect(cameraEffects).toEqual(new Map([[6, "weapon_zoom"]]));
  });

  it("should save and restore the active Deimos intensity", () => {
    const zone: GameObject = MockGameObject.mock();
    const processor: MockNetProcessor = new MockNetProcessor();

    registerZone(zone);
    registry.objects.get(zone.id()).activeScheme = EScheme.SR_DEIMOS;
    setSchemeState(
      registry.objects.get(zone.id()),
      EScheme.SR_DEIMOS,
      mockSchemeState<ISchemeDeimosState>(EScheme.SR_DEIMOS, { intensity: 0.45 })
    );

    getManager(DeimosManager).save(processor.asNetPacket());
    getManager(DeimosManager).load(processor.asNetReader());

    expect(getManager(DeimosManager).consumeRestoredIntensity()).toBe(0.45);
    expect(getManager(DeimosManager).consumeRestoredIntensity()).toBeNull();
    expect(processor.dataList).toHaveLength(0);
  });

  it("should save an empty Deimos snapshot when no restrictor is active", () => {
    const processor: MockNetProcessor = new MockNetProcessor();

    getManager(DeimosManager).save(processor.asNetPacket());
    getManager(DeimosManager).load(processor.asNetReader());

    expect(getManager(DeimosManager).consumeRestoredIntensity()).toBeNull();
    expect(processor.dataList).toHaveLength(0);
  });
});
