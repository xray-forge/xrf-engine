import { beforeEach, describe, expect, it } from "@jest/globals";
import { TName } from "xray16/lib";

import { isStageCurrent, isStagePassed } from "@/engine/checks/framework/stages";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

const STAGES: Array<TName> = ["stage_first", "stage_second", "stage_third"];

describe("isStagePassed", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should count a stage as passed once it or any later stage is reached", () => {
    expect(STAGES.map((it) => isStagePassed(STAGES, it))).toEqual([false, false, false]);

    giveInfoPortion("stage_second");

    expect(STAGES.map((it) => isStagePassed(STAGES, it))).toEqual([true, true, false]);

    giveInfoPortion("stage_third");

    expect(STAGES.map((it) => isStagePassed(STAGES, it))).toEqual([true, true, true]);
  });

  it("should refuse a stage the chain does not list", () => {
    expect(() => isStagePassed(STAGES, "stage_unknown")).toThrow("Stage 'stage_unknown' is not part of the chain.");
  });
});

describe("isStageCurrent", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should take the furthest stage reached as the current one", () => {
    expect(STAGES.map((it) => isStageCurrent(STAGES, it))).toEqual([false, false, false]);

    giveInfoPortion("stage_first");

    expect(STAGES.map((it) => isStageCurrent(STAGES, it))).toEqual([true, false, false]);

    // Skipping ahead leaves the skipped stage passed, but not current.
    giveInfoPortion("stage_third");

    expect(STAGES.map((it) => isStageCurrent(STAGES, it))).toEqual([false, false, true]);
  });
});
