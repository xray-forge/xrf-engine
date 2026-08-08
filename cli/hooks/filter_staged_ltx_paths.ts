import * as path from "node:path";

const LTX_EXTENSION: string = ".ltx";

/**
 * Narrow a list of staged paths down to the ltx files the project formatter owns.
 *
 * @param paths - Staged paths, as provided by lint-staged.
 * @param root - Root folder of the game ltx configs.
 * @returns Subset of paths that are safe to format.
 */
export function filterStagedLtxPaths(paths: Array<string>, root: string): Array<string> {
  const resolvedRoot: string = path.resolve(root);

  return paths.filter((it) => {
    if (path.extname(it).toLowerCase() !== LTX_EXTENSION) {
      return false;
    }

    const relative: string = path.relative(resolvedRoot, path.resolve(it));

    return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}
