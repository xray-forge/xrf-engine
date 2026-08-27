import * as cp from "node:child_process";
import * as path from "node:path";

import { blueBright, yellowBright } from "chalk";

import { GAME_DATA_DECLARATIONS_DIR, TARGET_GAME_DATA_DIR, XRF_UTILS_PATH } from "#/globals/paths";
import { NodeLogger } from "#/utils/logging";

const log: NodeLogger = NodeLogger.forFile(__filename);

const EXTERN_MANIFEST_PATH: string = path.resolve(GAME_DATA_DECLARATIONS_DIR, "extern.json");
const TARGET_EXTERN_MANIFEST_PATH: string = path.resolve(TARGET_GAME_DATA_DIR, "extern.json");

/**
 * Generate the tracked and packaged extern manifests with the bundled native tools CLI.
 *
 * @returns A promise that resolves after both JSON manifest artifacts have been generated.
 */
export async function buildExternManifest(): Promise<void> {
  log.info(blueBright("Build extern manifest"));

  for (const outputPath of [EXTERN_MANIFEST_PATH, TARGET_EXTERN_MANIFEST_PATH]) {
    cp.execFileSync(
      XRF_UTILS_PATH,
      ["externs", "export", GAME_DATA_DECLARATIONS_DIR, "--format", "json", "--output", outputPath],
      { stdio: "inherit" }
    );
  }

  log.info("Built extern manifests:", yellowBright(EXTERN_MANIFEST_PATH), yellowBright(TARGET_EXTERN_MANIFEST_PATH));
}
