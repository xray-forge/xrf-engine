import { FS, getFS } from "xray16";
import { LuaArray, Nillable, TPath } from "xray16/lib";
import { $fromArray, $fromLuaArray } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { IExtensionsDescriptor } from "@/engine/core/extensions/extensions_types";
import { loadObjectFromFile, saveObjectToFile } from "@/engine/core/utils/fs";

/**
 * Create dynamic save of extensions order and other state preferences.
 *
 * @param extensions - List of extensions to save order.
 */
export function saveExtensionsState(extensions: LuaArray<IExtensionsDescriptor>): void {
  const fs: FS = getFS();
  const savesFolder: TPath = fs.update_path(roots.gameSaves, "");

  saveObjectToFile(
    savesFolder,
    forgeConfig.EXTENSIONS.ORDER_FILE,
    $fromArray($fromLuaArray(extensions).map(({ module, ...rest }) => rest))
  );
}

/**
 * Load synchronized state of game extension modules.
 *
 * @returns Order preferences.
 */
export function loadExtensionsState(): LuaArray<IExtensionsDescriptor> {
  const orderFile: TPath = getFS().update_path(roots.gameSaves, forgeConfig.EXTENSIONS.ORDER_FILE);
  const order: Nillable<LuaArray<IExtensionsDescriptor>> = loadObjectFromFile(orderFile);

  return order ? order : new LuaTable();
}

/**
 * Synchronize extensions order and return new one based on existing extensions and saved preferences.
 */
export function syncExtensionsState(
  extensions: LuaArray<IExtensionsDescriptor>,
  stored: LuaArray<IExtensionsDescriptor>
): LuaArray<IExtensionsDescriptor> {
  const list: LuaArray<IExtensionsDescriptor> = new LuaTable();
  const unordered: LuaArray<IExtensionsDescriptor> = new LuaTable();

  // Filter sorted first.
  for (const [, descriptor] of stored) {
    const existing: Nillable<IExtensionsDescriptor> = $fromLuaArray(extensions).find(
      (it) => it.name === descriptor.name
    ) as Nillable<IExtensionsDescriptor>;

    if (existing) {
      existing.isEnabled = descriptor.isEnabled;
      table.insert(list, existing);
    }
  }

  // Filter others as next step.
  for (const [, extension] of extensions) {
    const existing: Nillable<IExtensionsDescriptor> = $fromLuaArray(list).find(
      (it) => it.name === extension.name
    ) as Nillable<IExtensionsDescriptor>;

    if (!existing) {
      table.insert(unordered, extension);
    }
  }

  // Sort unordered by name and insert in general list.
  table.sort(unordered, (left, right) => left.name < right.name);

  for (const [, extension] of unordered) {
    table.insert(list, extension);
  }

  return list;
}
