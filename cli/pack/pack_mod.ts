import { default as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

import { blue, yellow, yellowBright } from "chalk";

import { build } from "#/build/build";
import { default as config } from "#/config.json";
import { OPEN_XRAY_ENGINES_DIR, TARGET_GAME_DATA_DIR, TARGET_MOD_PACKAGE_DIR, WARNING_SIGN } from "#/globals";
import { IPackParameters } from "#/pack/pack";
import { assertNoDevOnlyArtifacts } from "#/pack/pack_guard";
import { createDirIfNoExisting } from "#/utils/fs/create_dir_if_no_existing";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Pack engine and gamedata into separate mod pack, ensure everything works correctly.
 */
export async function packMod(parameters: IPackParameters): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  try {
    log.info("Packaging new mod:", blue(new Date().toLocaleString()));
    log.debug("Running with parameters:", parameters);

    if (parameters.optimize) {
      log.info("Using build with optimizations");
    } else {
      log.info("Using build without optimizations", WARNING_SIGN);
    }

    const timeTracker: TimeTracker = new TimeTracker().start();
    const isBuildRequired: boolean = Boolean(parameters.build);

    if (parameters.clean) {
      log.info("Perform package cleanup:", yellowBright(TARGET_MOD_PACKAGE_DIR));
      fs.rmSync(TARGET_MOD_PACKAGE_DIR, { recursive: true, force: true });
      timeTracker.addMark("PACKAGE_CLEANUP");
    } else {
      log.info("Skip package cleanup:", WARNING_SIGN);
      timeTracker.addMark("PACKAGE_CLEANUP_SKIP");
    }

    // If needed, proceed with full build and compression step.
    if (isBuildRequired) {
      log.info("Packaging from new assets, starting build");
      log.pushNewLine();

      await build({
        clean: true,
        assetOverrides: Boolean(parameters.assetOverrides),
        verbose: parameters.verbose,
        luaLogs: !parameters.optimize,
        include: "all",
        exclude: [],
        filter: [],
      });
    } else {
      log.info("Packaging from already built assets", WARNING_SIGN);
    }

    assertNoDevOnlyArtifacts(TARGET_GAME_DATA_DIR);

    if (parameters.skipEngine) {
      log.info("Skip engines in mod package");
    } else {
      const engine: string = String(parameters.engine || config.package.engine).trim();

      if (parameters.engine) {
        log.info("Using engine override:", blue(parameters.engine));
      } else {
        log.info("Using configured engine:", blue(engine));
      }

      assert(fs.existsSync(path.resolve(OPEN_XRAY_ENGINES_DIR, engine, "bin")), "Expected engine directory to exist.");
      copyGameEngine(engine);
      timeTracker.addMark("PACKAGE_GAME_BIN");
    }

    copyGamedataAssets();
    // A package folder kept without `--clean` may still hold files an earlier pack copied.
    assertNoDevOnlyArtifacts(path.resolve(TARGET_MOD_PACKAGE_DIR, "gamedata"));
    timeTracker.addMark("PACKAGE_GAMEDATA");

    timeTracker.end();

    log.info("Successfully executed pack command, took:", timeTracker.getDuration() / 1000, "sec");
    log.info("Check mod build at:", yellowBright(TARGET_MOD_PACKAGE_DIR), "\n");
  } catch (error) {
    log.error("Failed to execute packaging command:", error);

    throw error;
  }
}

/**
 * Copy engine binaries for package.
 */
function copyGameEngine(engine: string): void {
  const destinationPath: string = path.resolve(TARGET_MOD_PACKAGE_DIR, "bin");
  const enginePath: string = path.resolve(OPEN_XRAY_ENGINES_DIR, engine, "bin");
  const engineDescriptorPath: string = path.resolve(destinationPath, "bin.json");

  log.info("Copy game engine binaries:", yellow(enginePath), "->", yellowBright(destinationPath));
  log.info("Using game engine:", blue(config.package.engine));
  log.info("Engine path:", yellowBright(enginePath));

  assert(fs.existsSync(enginePath), "Expected engine directory to exist.");

  createDirIfNoExisting(destinationPath);
  fs.cpSync(enginePath, destinationPath, { recursive: true });

  /**
   * Remove bin.json with engine description.
   */
  if (fs.existsSync(engineDescriptorPath)) {
    fs.rmSync(engineDescriptorPath);
  }
}

/**
 * Copy gamedata assets needed for the game build.
 */
function copyGamedataAssets(): void {
  const destinationPath: string = path.resolve(TARGET_MOD_PACKAGE_DIR, "gamedata");

  log.info("Copy gamedata assets:", yellow(TARGET_GAME_DATA_DIR), "->", yellowBright(destinationPath));

  assert(fs.existsSync(TARGET_GAME_DATA_DIR), "Expected gamedata directory to exist.");

  createDirIfNoExisting(destinationPath);

  log.debug("CP:", yellow(TARGET_GAME_DATA_DIR), "->", yellowBright(destinationPath));
  fs.cpSync(TARGET_GAME_DATA_DIR, destinationPath, { recursive: true });
}
