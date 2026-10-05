import * as fs from "node:fs";
import * as path from "node:path";

import * as ts from "typescript";

import { GAME_DATA_CHECKS_DIR } from "#/globals/paths";
import { Nullable } from "#/utils/types";

/**
 * Source suffix marking a flow.
 *
 * A flow is walked one step per invocation, keeping its progress in the save, so real play can happen in
 * between. It is currently the only kind of runnable artifact.
 */
export const FLOW_SUFFIX: string = ".flow.ts";

/**
 * Prefix of generated launcher scripts. Also the marker `checks clean` matches them by.
 */
export const FLOW_LAUNCHER_PREFIX: string = "flow_";

/**
 * Every prefix a generated launcher can carry.
 */
export const LAUNCHER_PREFIXES: Array<string> = [FLOW_LAUNCHER_PREFIX];

/**
 * Descriptor of a single discovered flow.
 */
export interface ICheckDescriptor {
  /** Flat name the flow reports itself under, e.g. `quests_zat_b14`. */
  identity: string;
  /** Source file, absolute. */
  source: string;
  /** Path relative to the checks root, posix separators, e.g. `quests/zat_b14.flow.ts`. */
  relative: string;
  /** Emitted script path relative to the checks output dir, e.g. `quests/zat_b14_flow.script`. */
  emitted: string;
  /** Lua module name the transpiler emits, e.g. `checks.quests.zat_b14_flow`. */
  module: string;
  /** Generated launcher file name, e.g. `flow_quests_zat_b14.script`. */
  launcher: string;
  /** Console command to run it. */
  command: string;
  /** Level its `requires` names, null when it names none. */
  level: Nullable<string>;
}

/**
 * Walk a directory collecting files that satisfy the filter.
 */
function walk(dir: string, filter: (name: string) => boolean, acc: Array<string> = []): Array<string> {
  let entries: Array<fs.Dirent>;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    const full: string = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, filter, acc);
    } else if (filter(entry.name)) {
      acc.push(full);
    }
  }

  return acc;
}

/**
 * Read the level a flow requires from its `requires({ level })` call.
 *
 * @param source - Flow source file, absolute.
 * @returns The level, or null when the flow requires none or names it other than with a string literal.
 */
export function readFlowLevel(source: string): string | null {
  const file: ts.SourceFile = ts.createSourceFile(source, fs.readFileSync(source, "utf8"), ts.ScriptTarget.Latest);
  let level: string | null = null;

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "requires" &&
      node.arguments.length > 0 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const property of node.arguments[0].properties) {
        if (
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "level" &&
          ts.isStringLiteral(property.initializer)
        ) {
          level = property.initializer.text;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(file);

  return level;
}

/**
 * Discover flows, and derive their module and launcher names.
 *
 * Launcher names flatten the source layout because `run_script` resolves its argument as a single file
 * directly under `$game_scripts$` and cannot descend into directories.
 *
 * @returns List of descriptors, sorted by relative path.
 */
export function discoverChecks(): Array<ICheckDescriptor> {
  const sources: Array<string> = walk(GAME_DATA_CHECKS_DIR, (name) => name.endsWith(FLOW_SUFFIX));

  return sources
    .map((source) => {
      const relative: string = path.relative(GAME_DATA_CHECKS_DIR, source).replace(/\\/g, "/");
      const withoutExtension: string = relative.replace(/\.ts$/, "");
      const identity: string = withoutExtension.replace(/\.flow$/, "").replace(/\//g, "_");

      // The transpiler cannot keep dots inside a file name, since a dot separates lua module
      // path segments, so `zat_b14.flow.ts` is emitted as `zat_b14_flow.script`.
      const emitted: string = withoutExtension.replace(/\./g, "_");

      return {
        identity,
        source,
        relative,
        emitted: `${emitted}.script`,
        module: `checks.${emitted.replace(/\//g, ".")}`,
        launcher: `${FLOW_LAUNCHER_PREFIX}${identity}.script`,
        command: `run_script ${FLOW_LAUNCHER_PREFIX}${identity}`,
        level: readFlowLevel(source),
      };
    })
    .sort((first, second) => first.relative.localeCompare(second.relative));
}
