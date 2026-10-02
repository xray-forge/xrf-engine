import { AnyCallablesModule, LuaArray } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { registerExtension } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { getAvailableExtensions, IExtensionsDescriptor } from "@/engine/core/extensions";
import {
  loadExtensionsState,
  saveExtensionsState,
  syncExtensionsState,
} from "@/engine/core/extensions/extensions_state";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Register extensions to the script engine.
 * Traverse gamedata extensions folder for valid extension modules and try to call register for each one.
 * Save extension load order and try to persist it every time.
 */
export function registerExtensions(isNewGame: boolean): void {
  if (!forgeConfig.EXTENSIONS.ENABLED) {
    return logger.info("Skip extensions registration, extensions are disabled in config");
  }

  if ($isNil(lfs)) {
    return logger.info("Skip externals registration, no `lfs` lib available");
  }

  const extensions: LuaArray<IExtensionsDescriptor> = getAvailableExtensions();
  const sortedExtensions: LuaArray<IExtensionsDescriptor> = syncExtensionsState(extensions, loadExtensionsState());

  if (extensions.length() === 0) {
    logger.info("No extensions detected");

    return;
  } else {
    logger.info("Registering extensions: %s", extensions.length());
  }

  for (const [, extension] of sortedExtensions) {
    if (extension.isAvailable === false) {
      continue;
    }

    if (extension.isEnabled) {
      registerExtension(extension);
      (extension.module as AnyCallablesModule).register(isNewGame, extension);
    } else {
      (extension.module as AnyCallablesModule)?.unregister?.(isNewGame, extension);
    }
  }

  logger.info("Saving current extensions order");
  saveExtensionsState(sortedExtensions);
}
