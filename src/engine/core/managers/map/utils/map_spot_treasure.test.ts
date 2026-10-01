import { beforeEach, describe, expect, it } from "@jest/globals";
import { level } from "xray16";
import { resetFunctionMock } from "xray16/testing/utils";

import { mapMarks } from "@/engine/constants/map_marks";
import {
  getTreasureMapSpot,
  removeTreasureMapSpot,
  showTreasureMapSpot,
} from "@/engine/core/managers/map/utils/map_spot_treasure";
import { ETreasureType, ITreasureDescriptor, treasureConfig } from "@/engine/core/managers/treasures";
import { resetRegistry } from "@/fixtures/engine";

describe("getTreasureMapSpot", () => {
  it("should correctly get icon from treasure descriptor", () => {
    treasureConfig.ENHANCED_MODE_ENABLED = true;

    expect(getTreasureMapSpot({ type: ETreasureType.COMMON } as ITreasureDescriptor)).toBe(mapMarks.treasure);
    expect(getTreasureMapSpot({ type: ETreasureType.RARE } as ITreasureDescriptor)).toBe(mapMarks.treasure_rare);
    expect(getTreasureMapSpot({ type: ETreasureType.EPIC } as ITreasureDescriptor)).toBe(mapMarks.treasure_epic);
    expect(getTreasureMapSpot({ type: ETreasureType.UNIQUE } as ITreasureDescriptor)).toBe(mapMarks.treasure_unique);

    treasureConfig.ENHANCED_MODE_ENABLED = false;

    expect(getTreasureMapSpot({ type: ETreasureType.EPIC } as ITreasureDescriptor)).toBe(mapMarks.treasure);
    expect(getTreasureMapSpot({ type: ETreasureType.UNIQUE } as ITreasureDescriptor)).toBe(mapMarks.treasure);
  });
});

describe("showTreasureMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    treasureConfig.ENHANCED_MODE_ENABLED = true;
  });

  it("should correctly display map objects for treasures", () => {
    resetFunctionMock(level.map_add_object_spot_ser);

    showTreasureMapSpot(10, { type: ETreasureType.COMMON } as ITreasureDescriptor, "tst");
    expect(level.map_add_object_spot_ser).toHaveBeenCalledWith(10, mapMarks.treasure, "tst");

    showTreasureMapSpot(25, { type: ETreasureType.RARE } as ITreasureDescriptor);
    expect(level.map_add_object_spot_ser).toHaveBeenCalledWith(25, mapMarks.treasure_rare, "");

    showTreasureMapSpot(555, { type: ETreasureType.UNIQUE } as ITreasureDescriptor);
    expect(level.map_add_object_spot_ser).toHaveBeenCalledWith(555, mapMarks.treasure_unique, "");
  });
});

describe("removeTreasureMapSpot", () => {
  beforeEach(() => {
    resetRegistry();
    treasureConfig.ENHANCED_MODE_ENABLED = true;
  });

  it("should correctly remove map objects for treasures", () => {
    resetFunctionMock(level.map_remove_object_spot);

    removeTreasureMapSpot(10, { type: ETreasureType.COMMON } as ITreasureDescriptor);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(10, mapMarks.treasure);

    removeTreasureMapSpot(25, { type: ETreasureType.RARE } as ITreasureDescriptor);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(25, mapMarks.treasure_rare);

    removeTreasureMapSpot(555, { type: ETreasureType.UNIQUE } as ITreasureDescriptor);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(555, mapMarks.treasure_unique);
  });

  it("should remove both common and typed spots whatever enhanced mode is now", () => {
    resetFunctionMock(level.map_remove_object_spot);
    treasureConfig.ENHANCED_MODE_ENABLED = false;

    removeTreasureMapSpot(25, { type: ETreasureType.RARE } as ITreasureDescriptor);

    expect(level.map_remove_object_spot).toHaveBeenCalledTimes(2);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(25, mapMarks.treasure);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(25, mapMarks.treasure_rare);

    resetFunctionMock(level.map_remove_object_spot);

    removeTreasureMapSpot(10, { type: ETreasureType.COMMON } as ITreasureDescriptor);

    expect(level.map_remove_object_spot).toHaveBeenCalledTimes(1);
    expect(level.map_remove_object_spot).toHaveBeenCalledWith(10, mapMarks.treasure);
  });
});
