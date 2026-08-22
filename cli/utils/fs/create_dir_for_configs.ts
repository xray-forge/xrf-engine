import * as fs from "node:fs";
import * as path from "node:path";

import { blueBright } from "chalk";

import { NodeLogger } from "#/utils/logging";
import { Nullable, TFolderReplicationDescriptor } from "#/utils/types";

/**
 * Sync way for folder creation when needed.
 *
 * @param configs - Replication configs to create directory.
 * @param log - Optional log to print verbose information.
 */
export function createDirForConfigs(
  configs: Array<TFolderReplicationDescriptor>,
  log: Nullable<NodeLogger> = null
): void {
  configs.forEach(([, to]) => {
    const targetDir: string = path.dirname(to);

    if (!fs.existsSync(targetDir)) {
      log?.debug("MKDIR:", blueBright(targetDir));
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });
}
