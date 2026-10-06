import * as fs from "node:fs";

import { blue, green, yellowBright } from "chalk";

import {
  buildDynamicConfigs,
  buildDynamicScripts,
  buildDynamicUi,
  buildExternManifest,
  buildMeta,
  buildResourcesStatics,
  buildStaticConfigs,
  buildStaticExtensions,
  collectLog,
} from "#/build/steps";
import { buildTranslations } from "#/build/steps/translations";
import { buildStaticUi } from "#/build/steps/ui_statics";
import { default as config } from "#/config.json";
import { TARGET_GAME_DATA_DIR } from "#/globals/paths";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

import { default as pkg } from "#/../package.json";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Enumeration of possible gamedata assets to build.
 */
export enum EBuildTarget {
  CONFIGS = "configs",
  EXTERNS = "externs",
  RESOURCES = "resources",
  SCRIPTS = "scripts",
  TRANSLATIONS = "translations",
  UI = "ui",
}

export interface IBuildCommandParameters {
  assetOverrides: boolean;
  verbose?: boolean;
  luaLogs?: boolean;
  injectTracyZones?: boolean;
  clean?: boolean;
  include: "all" | Array<EBuildTarget>;
  exclude: Array<EBuildTarget>;
  filter?: Array<string>;
  language?: string;
}

/**
 * Main workflow for building game assets.
 * Builds separate parts of gamedata and collects log with metadata information.
 */
export async function build(parameters: IBuildCommandParameters): Promise<void> {
  const timeTracker: TimeTracker = new TimeTracker().start();
  const buildTargets: Array<EBuildTarget> = getBuildTargets(parameters);

  NodeLogger.IS_FILE_ENABLED = true;
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  try {
    log.info("XRF build:", green(pkg?.name), blue(new Date().toLocaleString()));
    log.debug("XRF params:", JSON.stringify(parameters));
    log.debug("XRF targets:", buildTargets);

    /**
     * Apply locale parameters.`.
     */
    parameters.language = parameters.language ?? config.locale;
    process.env.language = parameters.language;

    if (!config.available_locales.includes(parameters.language)) {
      throw new Error(`Unsupported locale provided for asset building: '${parameters.language}'.`);
    }

    if (parameters.filter?.length) {
      log.info("Apply filters:", parameters.filter);
    }

    // Do not allow filtering 'all' builds.
    if (parameters.filter?.length && parameters.include.length === 1 && parameters.include[0] === "all") {
      throw new Error("Provided filter parameter, cannot use it when target is 'all'");
    }

    /**
     * Apply destination clean.
     */
    if (parameters.clean) {
      log.info("Perform target cleanup:", yellowBright(TARGET_GAME_DATA_DIR));
      fs.rmSync(TARGET_GAME_DATA_DIR, { recursive: true, force: true });
      timeTracker.addMark("BUILD_CLEANUP");
    } else {
      timeTracker.addMark("SKIP_CLEANUP");
    }

    /**
     * Build game scripts.
     */
    if (buildTargets.includes(EBuildTarget.SCRIPTS)) {
      await buildDynamicScripts(parameters);
      timeTracker.addMark("BUILT_DYNAMIC_SCRIPTS");
      await buildStaticExtensions(parameters);
      timeTracker.addMark("BUILT_STATIC_EXTENSIONS");
    } else {
      log.info("Scripts build steps skipped");
      timeTracker.addMark("SKIP_SCRIPTS");
    }

    /**
     * Generate the tracked source declaration manifest.
     */
    if (buildTargets.includes(EBuildTarget.EXTERNS)) {
      await buildExternManifest();
      timeTracker.addMark("BUILT_EXTERN_MANIFEST");
    } else {
      log.info("Extern manifest build step skipped");
      timeTracker.addMark("SKIP_EXTERN_MANIFEST");
    }

    /**
     * Build game XML forms from JSX / copy static XML.
     */
    if (buildTargets.includes(EBuildTarget.UI)) {
      await buildDynamicUi(parameters);
      timeTracker.addMark("BUILT_DYNAMIC_UI");
      await buildStaticUi(parameters);
      timeTracker.addMark("BUILT_STATIC_UI");
    } else {
      log.info("UI build steps skipped");
      timeTracker.addMark("SKIP_UI");
    }

    /**
     * Build game LTX configs / copy static LTX.
     */
    if (buildTargets.includes(EBuildTarget.CONFIGS)) {
      await buildDynamicConfigs(parameters);
      timeTracker.addMark("BUILT_DYNAMIC_CONFIGS");
      await buildStaticConfigs(parameters);
      timeTracker.addMark("BUILT_STATIC_CONFIGS");
    } else {
      log.info("Configs build steps skipped");
      timeTracker.addMark("SKIP_CONFIGS");
    }

    /**
     * Build game translations / copy static XML.
     */
    if (buildTargets.includes(EBuildTarget.TRANSLATIONS)) {
      await buildTranslations(parameters);
      timeTracker.addMark("BUILT_TRANSLATIONS");
    } else {
      log.info("Translations build steps skipped");
      timeTracker.addMark("SKIP_TRANSLATIONS");
    }

    /**
     * Copy static assets from resources directories.
     */
    if (buildTargets.includes(EBuildTarget.RESOURCES)) {
      await buildResourcesStatics(parameters);
      timeTracker.addMark("BUILT_STATIC_RESOURCES");
    } else {
      log.info("Static resources build steps skipped");
      timeTracker.addMark("SKIP_RESOURCES");
    }

    timeTracker.end();

    /**
     * Build metadata.json descriptor.
     */
    await buildMeta({ meta: pkg, timeTracker });

    log.info("Successfully executed build command, took:", timeTracker.getDuration() / 1000, "sec");

    await collectLog();
  } catch (error) {
    log.error("Build fail:", error);
    timeTracker.end();

    await collectLog();

    throw error;
  }
}

/**
 * Get build targets from arguments.
 */
export function getBuildTargets(parameters: IBuildCommandParameters): Array<EBuildTarget> {
  const targets: Array<EBuildTarget> =
    (parameters.include === "all" ? Object.values(EBuildTarget) : parameters.include) || [];

  if (Array.isArray(parameters.exclude)) {
    parameters.exclude.forEach((it) => targets.splice(targets.indexOf(it), 1));
  }

  return targets;
}
