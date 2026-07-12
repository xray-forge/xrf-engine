import { beforeEach, describe, expect, it } from "@jest/globals";

import { infoPortions } from "@/engine/constants/info_portions";
import { registry } from "@/engine/core/database";
import {
  disableInfoPortion,
  giveInfoPortion,
  hasAtLeastOneInfoPortion,
  hasFewInfoPortions,
  hasInfoPortion,
  hasInfoPortions,
  invalidateInfoPortionsCache,
} from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("giveInfoPortion", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly give info portion for actor", () => {
    mockRegisteredActor();

    giveInfoPortion(infoPortions.info_up_ac_mp5);

    expect(registry.actor.give_info_portion).toHaveBeenCalledWith(infoPortions.info_up_ac_mp5);
    expect(registry.actor.give_info_portion).toHaveBeenCalledTimes(1);
  });
});

describe("disableInfoPortion", () => {
  beforeEach(() => {
    mockRegisteredActor();

    [
      infoPortions.info_up_ac_mp5,
      infoPortions.pri_a15_lights_off,
      infoPortions.device_pda_port_bandit_leader_sold,
    ].forEach((it) => giveInfoPortion(it));
  });

  it("should correctly turn off info", () => {
    expect(registry.actor.disable_info_portion).toHaveBeenCalledTimes(0);

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(true);
    disableInfoPortion(infoPortions.info_up_ac_mp5);
    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(false);

    expect(registry.actor.disable_info_portion).toHaveBeenCalledTimes(1);

    // Gives / disables update the mirror granularly - no engine reads were needed at all.
    expect(registry.actor.has_info).toHaveBeenCalledTimes(0);
  });
});

describe("hasInfoPortions", () => {
  beforeEach(() => {
    mockRegisteredActor();

    [
      infoPortions.info_up_ac_mp5,
      infoPortions.pri_a15_lights_off,
      infoPortions.device_pda_port_bandit_leader_sold,
    ].forEach((it) => giveInfoPortion(it));
  });

  it("hasInfoPortions should correctly check whole list of info portions", () => {
    expect(hasInfoPortions([infoPortions.info_up_ac_mp5])).toBe(true);
    expect(hasInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off])).toBe(true);
    expect(hasInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.device_pda_port_bandit_leader_sold])).toBe(true);
    expect(hasInfoPortions([infoPortions.pri_a15_lights_off, infoPortions.device_pda_port_bandit_leader_sold])).toBe(
      true
    );

    expect(hasInfoPortions([])).toBe(false);
    expect(hasInfoPortions([infoPortions.info_up_fh_scientific_outfit])).toBe(false);
    expect(hasInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.info_up_fh_scientific_outfit])).toBe(false);
    expect(hasInfoPortions([infoPortions.pri_a15_lights_off, infoPortions.info_up_fh_scientific_outfit])).toBe(false);
  });
});

describe("hasAtLeastOneInfoPortion", () => {
  beforeEach(() => {
    mockRegisteredActor();

    [
      infoPortions.info_up_ac_mp5,
      infoPortions.pri_a15_lights_off,
      infoPortions.device_pda_port_bandit_leader_sold,
    ].forEach((it) => giveInfoPortion(it));
  });

  it("should correctly check one of list", () => {
    expect(hasAtLeastOneInfoPortion([infoPortions.info_up_ac_mp5])).toBe(true);
    expect(hasAtLeastOneInfoPortion([infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off])).toBe(true);
    expect(hasAtLeastOneInfoPortion([])).toBe(false);
    expect(hasAtLeastOneInfoPortion([infoPortions.info_up_fh_scientific_outfit])).toBe(false);
    expect(hasAtLeastOneInfoPortion([infoPortions.info_up_ac_mp5, infoPortions.info_up_fh_scientific_outfit])).toBe(
      true
    );
    expect(hasAtLeastOneInfoPortion([infoPortions.pri_a15_lights_off, infoPortions.info_up_fh_scientific_outfit])).toBe(
      true
    );
  });
});

describe("hasFewInfoPortions", () => {
  beforeEach(() => {
    mockRegisteredActor();

    [
      infoPortions.info_up_ac_mp5,
      infoPortions.pri_a15_lights_off,
      infoPortions.device_pda_port_bandit_leader_sold,
    ].forEach((it) => giveInfoPortion(it));
  });

  it("should correctly check one of list", () => {
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5], 1)).toBe(true);
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5], 2)).toBe(false);
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off], 1)).toBe(true);
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off], 2)).toBe(true);
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off], 3)).toBe(false);
    expect(hasFewInfoPortions([], 0)).toBe(false);
    expect(hasFewInfoPortions([], 1)).toBe(false);
    expect(hasFewInfoPortions([infoPortions.info_up_fh_scientific_outfit], 1)).toBe(false);
    expect(hasFewInfoPortions([infoPortions.info_up_fh_scientific_outfit], 2)).toBe(false);
    expect(hasFewInfoPortions([infoPortions.info_up_ac_mp5, infoPortions.info_up_fh_scientific_outfit], 1)).toBe(true);
    expect(
      hasFewInfoPortions(
        [infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off, infoPortions.info_up_fh_scientific_outfit],
        1
      )
    ).toBe(true);
    expect(
      hasFewInfoPortions(
        [infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off, infoPortions.info_up_fh_scientific_outfit],
        2
      )
    ).toBe(true);
    expect(
      hasFewInfoPortions(
        [infoPortions.info_up_ac_mp5, infoPortions.pri_a15_lights_off, infoPortions.info_up_fh_scientific_outfit],
        3
      )
    ).toBe(false);
  });
});

describe("info portions mirror", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should memoize checks and re-read from engine after invalidation", () => {
    const { actorGameObject } = mockRegisteredActor();

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(false);

    // Raw mock grant is invisible while memoized (engine grants update the mirror via actor binder callback).
    actorGameObject.give_info_portion(infoPortions.info_up_ac_mp5);

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(false);
    expect(registry.actor.has_info).toHaveBeenCalledTimes(1);

    invalidateInfoPortionsCache();

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(true);
  });

  it("should update exact entries on lua-side mutations without dropping the mirror", () => {
    mockRegisteredActor();

    expect(hasInfoPortion(infoPortions.pri_a15_lights_off)).toBe(false);

    giveInfoPortion(infoPortions.info_up_ac_mp5);

    // Mutated entry is visible without engine reads, unrelated memoized entry survives.
    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(true);
    expect(hasInfoPortion(infoPortions.pri_a15_lights_off)).toBe(false);
    expect(registry.actor.has_info).toHaveBeenCalledTimes(1);
  });

  it("should invalidate when the actor is re-registered", () => {
    const { actorGameObject: firstActor } = mockRegisteredActor();

    firstActor.give_info_portion(infoPortions.info_up_ac_mp5);
    invalidateInfoPortionsCache();

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(true);

    // New actor instance - registerActor replaces the mirror, state re-read from the fresh object.
    resetRegistry();
    mockRegisteredActor();

    expect(hasInfoPortion(infoPortions.info_up_ac_mp5)).toBe(false);
  });
});
