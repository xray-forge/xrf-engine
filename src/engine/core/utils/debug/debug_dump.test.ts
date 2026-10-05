import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyObject } from "xray16/lib";

import { getManager, SYSTEM_INI } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { dumpLuaData, dumpSystemIni } from "@/engine/core/utils/debug/debug_dump";
import { saveTextToFile } from "@/engine/core/utils/fs";
import { toJSON } from "@/engine/core/utils/transform";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/fs", () => ({
  saveTextToFile: jest.fn((folder: string, name: string) => `${folder}\\${name}`),
}));

beforeEach(() => {
  resetRegistry();
  jest.mocked(saveTextToFile).mockClear();
});

describe("dumpLuaData", () => {
  it("should dump an empty object without data providers", () => {
    expect(dumpLuaData()).toBe("$app_data_root$\\dumps\\lua_data.json");
    expect(saveTextToFile).toHaveBeenCalledWith("$app_data_root$\\dumps", "lua_data.json", "{}");
  });

  it("should dump what the dump event collects", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, (data: AnyObject) => {
      data["first"] = { a: 1, b: true };
    });
    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, (data: AnyObject) => {
      data["second"] = { c: 10 };
    });

    dumpLuaData();

    expect(saveTextToFile).toHaveBeenCalledWith(
      "$app_data_root$\\dumps",
      "lua_data.json",
      toJSON({ first: { a: 1, b: true }, second: { c: 10 } })
    );
  });
});

describe("dumpSystemIni", () => {
  it("should dump the combined system ini", () => {
    jest.spyOn(SYSTEM_INI, "save_as");

    expect(dumpSystemIni()).toBe("$app_data_root$\\dumps\\system.ltx");
    expect(SYSTEM_INI.save_as).toHaveBeenCalledWith("$app_data_root$\\dumps\\system.ltx");
  });
});
