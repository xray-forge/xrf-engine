import * as fs from "node:fs";
import * as path from "node:path";

import { ROOT_DIR } from "#/globals/paths";
import { Nullable } from "#/utils/types";

/**
 * Get current repository/branch commit hash.
 */
export function getCommitHash(): Nullable<string> {
  try {
    const revision: string = fs.readFileSync(path.resolve(ROOT_DIR, ".git/HEAD")).toString().trim();

    if (revision.indexOf(":") === -1) {
      return revision;
    } else {
      return fs
        .readFileSync(".git/" + revision.substring(5))
        .toString()
        .trim();
    }
  } catch {
    return null;
  }
}
