import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { patrol } from "xray16";
import { GameObject } from "xray16/alias";
import { MockGameObject, MockIniFile, MockPatrol, MockVector } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { ObjectSound } from "@/engine/core/managers/sounds/objects/ObjectSound";
import { soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { ParticleController } from "@/engine/core/schemes/restrictor/sr_particle/ParticleController";
import {
  EParticleBehaviour,
  IParticleDescriptor,
  ISchemeParticleState,
} from "@/engine/core/schemes/restrictor/sr_particle/sr_particale_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime/scheme_switch", () => ({ trySwitchToAnotherSection: jest.fn() }));

describe("ParticleController", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockImplementation(() => 10_000);
    resetFunctionMock(trySwitchToAnotherSection);
  });

  it("should correctly initialize", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    expect(controller.isStarted).toBe(false);
    expect(controller.isFirstPlayed).toBe(false);
    expect(controller.nextUpdateAt).toBe(0);
    expect(controller.particles).toEqualLuaTables({});
    expect(controller.path).toBeNull();
  });

  it("should correctly activate in simple mode", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.SIMPLE;
    state.path = "simple_path";
    state.name = "simple_name";

    controller.activate();

    expect(controller.nextUpdateAt).toBe(0);
    expect(controller.isStarted).toBe(false);
    expect(controller.isFirstPlayed).toBe(false);
    expect(controller.path).toBeNull();
    expect(state.signals).toEqualLuaTables({});
    expect(controller.particles.length()).toBe(1);
    expect(controller.particles.get(1)).toEqual({
      particle: expect.objectContaining({ name: "simple_name" }),
      sound: null,
      delay: 0,
      time: 10_000,
      played: false,
    });
  });

  it("should correctly activate in complex mode", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";

    controller.activate();

    expect(controller.nextUpdateAt).toBe(0);
    expect(controller.isStarted).toBe(false);
    expect(controller.isFirstPlayed).toBe(false);
    expect(controller.path).toBeInstanceOf(patrol);
    expect(state.signals).toEqualLuaTables({});
    expect(controller.particles.length()).toBe(3);
    expect(controller.particles.get(1)).toEqual({
      particle: expect.objectContaining({ name: "simple_name" }),
      sound: null,
      delay: 0,
      time: 10_000,
      played: false,
    });
    expect(controller.particles.get(2)).toEqual({
      particle: expect.objectContaining({ name: "simple_name" }),

      sound: null,
      delay: 2_000,
      time: 10_000,
      played: false,
    });
    expect(controller.particles.get(3)).toEqual({
      particle: expect.objectContaining({ name: "simple_name" }),

      sound: null,
      delay: 3_000,
      time: 10_000,
      played: false,
    });
  });

  it.each([false, true])("should play and stop independent waypoint sounds with looped=%s", (looped) => {
    const theme = new ObjectSound(
      MockIniFile.mock("particle-sound.ltx", { particle_sound: { path: "some/path" } }),
      "particle_sound"
    );

    soundsConfig.themes.set("particle_sound", theme);
    MockPatrol.register("particle-sound-path", {
      points: [
        { name: "wp00|s=particle_sound|d=100", gvid: 1, lvid: 1, position: MockVector.create(1, 2, 3) },
        { name: "wp01|s=particle_sound|d=200", gvid: 2, lvid: 2, position: MockVector.create(4, 5, 6) },
      ],
    });

    const object = MockGameObject.mock();
    const state = mockSchemeState<ISchemeParticleState>(EScheme.SR_PARTICLE, {
      mode: EParticleBehaviour.COMPLEX,
      path: "particle-sound-path",
      name: "test_particle",
      looped,
    });
    const controller = new ParticleController(object, state);

    controller.activate();

    const first = controller.particles.get(1);
    const second = controller.particles.get(2);

    expect(first.sound).toEqual(expect.objectContaining({ path: "some/path" }));
    expect(second.sound).not.toBe(first.sound);
    expect(first.sound!.play_at_pos).not.toHaveBeenCalled();
    expect(theme.playback.length()).toBe(0);

    controller.update();
    jest.spyOn(Date, "now").mockReturnValue(10_150);
    controller.update();

    expect(first.sound!.play_at_pos).toHaveBeenCalledWith(object, controller.path!.point(0), 0);
    expect(second.sound!.play_at_pos).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockReturnValue(10_250);
    controller.update();

    expect(second.sound!.play_at_pos).toHaveBeenCalledWith(object, controller.path!.point(1), 0);

    first.particle.stop();
    second.particle.stop();
    jest.spyOn(Date, "now").mockReturnValue(10_350);
    controller.update();

    expect(first.sound!.play_at_pos).toHaveBeenCalledTimes(looped ? 2 : 1);
    expect(second.sound!.play_at_pos).toHaveBeenCalledTimes(looped ? 2 : 1);

    const firstSound = first.sound!;
    const secondSound = second.sound!;

    jest.spyOn(firstSound, "playing").mockReturnValue(true);
    jest.spyOn(secondSound, "playing").mockReturnValue(true);
    controller.deactivate();

    expect(firstSound.stop).toHaveBeenCalledTimes(1);
    expect(secondSound.stop).toHaveBeenCalledTimes(1);
    expect(first.sound).toBeNull();
    expect(second.sound).toBeNull();
  });

  it("should correctly deactivate", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";

    controller.activate();

    const particles = [];

    for (const [, descriptor] of controller.particles) {
      particles.push(descriptor.particle);
      jest.spyOn(descriptor.particle, "playing").mockImplementation(() => true);
    }

    controller.update();
    controller.deactivate();

    expect(controller.particles.length()).toBe(3);
    expect(particles).toHaveLength(3);
    particles.forEach((particle) => expect(particle.stop).toHaveBeenCalledTimes(1));
  });

  it("should correctly update based on mode / started state", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";

    controller.activate();
    controller.update();

    expect(controller.isStarted).toBe(true);

    jest.spyOn(controller, "updateSimple").mockImplementation(jest.fn());
    jest.spyOn(controller, "updateComplex").mockImplementation(jest.fn());
    jest.spyOn(controller, "isEnded").mockImplementation(jest.fn(() => false));

    controller.update();

    // Timed throttle.
    expect(controller.nextUpdateAt).toBe(10_050);
    expect(controller.updateComplex).toHaveBeenCalledTimes(0);
    expect(controller.updateComplex).toHaveBeenCalledTimes(0);

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.updateSimple).toHaveBeenCalledTimes(0);
    expect(controller.updateComplex).toHaveBeenCalledTimes(1);
    expect(controller.isEnded).toHaveBeenCalledTimes(1);
    expect(trySwitchToAnotherSection).toHaveBeenCalledTimes(1);
    expect(trySwitchToAnotherSection).toHaveBeenCalledWith(controller.object, controller.state);

    controller.nextUpdateAt = 0;
    controller.state.mode = EParticleBehaviour.SIMPLE;
    controller.update();

    expect(controller.updateSimple).toHaveBeenCalledTimes(1);
    expect(controller.updateComplex).toHaveBeenCalledTimes(1);
    expect(controller.isEnded).toHaveBeenCalledTimes(2);
    expect(trySwitchToAnotherSection).toHaveBeenCalledTimes(2);
    expect(trySwitchToAnotherSection).toHaveBeenCalledWith(controller.object, controller.state);
  });

  it("should correctly update in simple mode without loop", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.SIMPLE;
    state.path = "simple_path";
    state.name = "simple_name";
    state.looped = false;

    controller.activate();
    controller.update();

    const descriptor: IParticleDescriptor = controller.particles.get(1);

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.isFirstPlayed).toBe(true);
    expect(descriptor.played).toBe(true);
    expect(descriptor.particle.load_path).toHaveBeenCalledWith("simple_path");
    expect(descriptor.particle.start_path).toHaveBeenCalledWith(false);
    expect(descriptor.particle.play).toHaveBeenCalledTimes(1);
    expect(descriptor.particle.playing()).toBe(true);

    controller.updateSimple();
    expect(descriptor.particle.play).toHaveBeenCalledTimes(1);

    descriptor.particle.stop();

    controller.updateSimple();
    expect(descriptor.particle.play).toHaveBeenCalledTimes(1);
  });

  it("should correctly update in simple mode with loop", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.SIMPLE;
    state.path = "simple_path";
    state.name = "simple_name";
    state.looped = true;

    controller.activate();
    controller.update();

    const descriptor: IParticleDescriptor = controller.particles.get(1);

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.isFirstPlayed).toBe(true);
    expect(descriptor.played).toBe(true);
    expect(descriptor.particle.load_path).toHaveBeenCalledWith("simple_path");
    expect(descriptor.particle.start_path).toHaveBeenCalledWith(true);
    expect(descriptor.particle.play).toHaveBeenCalledTimes(1);
    expect(descriptor.particle.playing()).toBe(true);

    controller.updateSimple();
    expect(descriptor.particle.play).toHaveBeenCalledTimes(1);

    descriptor.particle.stop();

    controller.updateSimple();
    expect(descriptor.particle.play).toHaveBeenCalledTimes(2);
  });

  it("should correctly update in complex mode without loop", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";
    state.looped = false;

    expect(controller.isEnded()).toBe(false);

    controller.activate();
    controller.update();

    jest.spyOn(Date, "now").mockImplementation(() => 20_000);

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.isFirstPlayed).toBe(true);

    for (const [index, descriptor] of controller.particles) {
      expect(descriptor.particle.play_at_pos).toHaveBeenCalledWith(controller.path?.point(index - 1));
      expect(descriptor.particle.playing()).toBe(true);

      descriptor.particle.stop();
    }

    jest.spyOn(Date, "now").mockImplementation(() => 30_000);

    controller.nextUpdateAt = 0;
    controller.update();

    for (const [, descriptor] of controller.particles) {
      expect(descriptor.particle.play_at_pos).toHaveBeenCalledTimes(1);
    }
  });

  it("should correctly update in complex mode with loop", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";
    state.looped = true;

    expect(controller.isEnded()).toBe(false);

    controller.activate();
    controller.update();

    jest.spyOn(Date, "now").mockImplementation(() => 20_000);

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.isFirstPlayed).toBe(true);

    for (const [index, descriptor] of controller.particles) {
      expect(descriptor.particle.play_at_pos).toHaveBeenCalledWith(controller.path?.point(index - 1));
      expect(descriptor.particle.playing()).toBe(true);

      descriptor.particle.stop();
    }

    jest.spyOn(Date, "now").mockImplementation(() => 30_000);

    controller.nextUpdateAt = 0;
    controller.update();

    for (const [, descriptor] of controller.particles) {
      expect(descriptor.particle.play_at_pos).toHaveBeenCalledTimes(2);
    }
  });

  it("should correctly check ended state", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeParticleState = mockSchemeState(EScheme.SR_PARTICLE);
    const controller: ParticleController = new ParticleController(object, state);

    state.mode = EParticleBehaviour.COMPLEX;
    state.path = "test-wp";
    state.name = "simple_name";

    expect(controller.isEnded()).toBe(false);

    controller.activate();

    jest.spyOn(Date, "now").mockImplementation(() => 10_050);

    controller.update();

    controller.nextUpdateAt = 0;
    controller.update();

    expect(controller.isEnded()).toBe(false);
    expect(controller.isFirstPlayed).toBe(true);
    expect(controller.state.signals?.length()).toBe(0);

    for (const [, descriptor] of controller.particles) {
      descriptor.particle.stop();
    }

    expect(controller.isEnded()).toBe(true);
    expect(controller.state.signals?.length()).toBe(1);
    expect(controller.state.signals?.get("particle_end")).toBe(true);

    controller.state.looped = true;
    expect(controller.isEnded()).toBe(false);
  });
});
