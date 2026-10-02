import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { GameObject } from "xray16/alias";
import { createTime } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { IRegistryObjectState } from "@/engine/core/database/database_types";
import { loadObjectLogic, saveObjectLogic } from "@/engine/core/database/logic";
import { registerObject, resetObject } from "@/engine/core/database/objects";
import { getPortableStoreValue, setPortableStoreValue } from "@/engine/core/database/portable_store";
import { AbstractScheme } from "@/engine/core/schemes/base/AbstractScheme";
import { ISchemeCombatState } from "@/engine/core/schemes/stalker/combat";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState } from "@/fixtures/engine";

describe("saveObjectLogic and loadObjectLogic", () => {
  beforeAll(() => {
    replaceFunctionMock(time_global, () => 5_000);
  });

  it("should correctly load and save scheme activation info when set state", () => {
    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);
    const processor: MockNetProcessor = new MockNetProcessor();

    const cb = jest.fn();
    const time = createTime(2015, 5, 4, 12, 25, 30, 200);

    const schemeState: ISchemeCombatState = mockSchemeState<ISchemeCombatState>(EScheme.COMBAT);

    AbstractScheme.subscribe(schemeState, { save: cb });
    setSchemeState(state, EScheme.COMBAT, schemeState);

    state.jobIni = "test.ltx";
    state.iniFilename = "test2.ltx";
    state.sectionLogic = "section_ex";
    state.activeSection = "active_sect_ex";
    state.smartTerrainName = "smart_terrain_name_ex";
    state.activeScheme = EScheme.COMBAT;
    state.activationTime = 15_000;
    state.activationGameTime = time;

    setPortableStoreValue(object.id(), "test-key-1", "test-val");
    setPortableStoreValue(object.id(), "test-key-2", 255);

    saveObjectLogic(object, processor.asNetPacket());

    expect(cb).toHaveBeenCalled();

    expect(processor.dataList).toEqual([
      "test.ltx",
      "test2.ltx",
      "section_ex",
      "active_sect_ex",
      "smart_terrain_name_ex",
      10000,
      15,
      5,
      4,
      12,
      25,
      30,
      200,
      2,
      "test-key-1",
      1,
      "test-val",
      "test-key-2",
      0,
      255,
      20,
    ]);
    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.F32,
      EMockPacketDataType.U16,
    ]);

    const nextState: IRegistryObjectState = resetObject(object);

    loadObjectLogic(object, processor.asNetPacket());

    expect(processor.dataList).toEqual([]);
    expect(processor.readDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.F32,
      EMockPacketDataType.U16,
    ]);

    expect(nextState.jobIni).toBe("test.ltx");
    expect(nextState.loadedIniFilename).toBe("test2.ltx");
    expect(nextState.loadedSectionLogic).toBe("section_ex");
    expect(nextState.loadedActiveSection).toBe("active_sect_ex");
    expect(nextState.loadedSmartTerrainName).toBe("smart_terrain_name_ex");
    expect(nextState.activationTime).toBe(15_000);
    expect(nextState.activationGameTime.toString()).toBe(time.toString());

    expect(getPortableStoreValue(object.id(), "test-key-1")).toBe("test-val");
    expect(getPortableStoreValue(object.id(), "test-key-2")).toBe(255);
  });
});
