import { describe, expect, it, jest } from "@jest/globals";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { replaceFunctionMockOnce } from "xray16/testing/utils";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { getAvailableExtensions, IExtensionsDescriptor } from "@/engine/core/extensions";
import {
  loadExtensionsState,
  saveExtensionsState,
  syncExtensionsState,
} from "@/engine/core/extensions/extensions_state";
import { registerExtensions } from "@/engine/scripts/register/extensions_registrator";
import { mockExtension } from "@/fixtures/engine";

jest.mock("@/engine/core/extensions");
jest.mock("@/engine/core/extensions/extensions_state");

describe("extensions registrator", () => {
  it("should skip registration when extensions are disabled globally", () => {
    const isEnabled: boolean = forgeConfig.EXTENSIONS.ENABLED;

    forgeConfig.EXTENSIONS.ENABLED = false;

    registerExtensions(true);

    expect(getAvailableExtensions).not.toHaveBeenCalled();
    expect(loadExtensionsState).not.toHaveBeenCalled();
    expect(syncExtensionsState).not.toHaveBeenCalled();
    expect(saveExtensionsState).not.toHaveBeenCalled();

    forgeConfig.EXTENSIONS.ENABLED = isEnabled;
  });

  it("should correctly register extensions from empty list", () => {
    replaceFunctionMockOnce(getAvailableExtensions, () => new LuaTable());

    registerExtensions(true);
  });

  it("should correctly register extensions from available list", () => {
    const first: IExtensionsDescriptor = mockExtension({
      canToggle: false,
      entry: "first/",
      isEnabled: true,
      name: "first",
      path: "first/path",
    });

    const second: IExtensionsDescriptor = mockExtension({
      canToggle: false,
      entry: "first/",
      isEnabled: false,

      name: "first",
      path: "first/path",
    });

    replaceFunctionMockOnce(getAvailableExtensions, () => $fromArray([second, first]));
    replaceFunctionMockOnce(loadExtensionsState, () => $fromArray([first, second]));
    replaceFunctionMockOnce(syncExtensionsState, (available, sync) => {
      expect(available).toEqualLuaArrays([second, first]);
      expect(sync).toEqualLuaArrays([first, second]);

      return $fromArray([first, second]);
    });
    replaceFunctionMockOnce(saveExtensionsState, (sorted: LuaArray<IExtensionsDescriptor>) => {
      expect(sorted.length()).toBe(2);
      expect(sorted).toEqualLuaArrays([first, second]);
    });

    registerExtensions(true);

    expect(getAvailableExtensions).toHaveBeenCalledTimes(1);
    expect(loadExtensionsState).toHaveBeenCalledTimes(1);
    expect(syncExtensionsState).toHaveBeenCalledTimes(1);
    expect(saveExtensionsState).toHaveBeenCalledTimes(1);

    expect(first.module.register).toHaveBeenCalledTimes(1);
    expect(first.module.register).toHaveBeenCalledWith(true, first);

    expect(second.module.unregister).toHaveBeenCalledTimes(1);
    expect(second.module.unregister).toHaveBeenCalledWith(true, second);
  });

  it("should correctly skip loading if LFS is not enabled", () => {
    const previous: typeof lfs = globalThis.lfs;

    globalThis.lfs = null as unknown as typeof lfs;

    registerExtensions(false);

    globalThis.lfs = previous;
  });
});
