import { Nullable, Optional } from "#/utils/types";

/**
 * Engine warnings every launch writes, which say nothing about the game being played.
 */
export const IGNORED_GAME_WARNINGS: ReadonlyArray<RegExp> = [
  /Unable to find Software\\GSC Game World/,
  /Player name registry key/,
  /Ansel/,
  /AMD AGS/,
  /Renderer doesn't support blender/,
];

/**
 * Lines that read the same apart from numbers, such as object ids and timestamps.
 */
export interface IGameErrorGroup {
  message: string;
  count: number;
  firstLine: number;
  example: string;
}

/**
 * Problems a game log holds.
 */
export interface IGameErrors {
  // Lines from the last fatal error on, null when the game did not crash.
  fatal: Nullable<string>;
  groups: Array<IGameErrorGroup>;
}

/**
 * @param line - Log line.
 * @returns Whether the line reports a problem: an engine warning, a script error, or an xrf error or warning.
 */
function isProblem(line: string): boolean {
  // Stack frames belong to the error above them.
  if (/^! \[LUA\]\s+\d+ :/.test(line)) {
    return false;
  }

  return (
    line.startsWith("! ") ||
    line.includes("SCRIPT RUNTIME ERROR") ||
    line.includes("SCRIPT ERROR") ||
    /\]\[(error|warn)\]/.test(line)
  );
}

/**
 * Find the problems in a game log, grouping lines that differ only in numbers.
 *
 * @param lines - Log lines, oldest first.
 * @returns Its fatal error, and its other problems by first appearance.
 */
export function findGameErrors(lines: ReadonlyArray<string>): IGameErrors {
  const groups: Map<string, IGameErrorGroup> = new Map();
  const fatalAt: number = lines.findLastIndex((line) => line.includes("FATAL ERROR"));

  lines.forEach((line, index) => {
    const trimmed: string = line.trim();

    if (!isProblem(trimmed) || IGNORED_GAME_WARNINGS.some((pattern) => pattern.test(trimmed))) {
      return;
    }

    // Lua log lines lead with the engine time, which differs on every line.
    const message: string = trimmed
      .replace(/^(\[LUA\]\s*)?\[\d+\]/, "")
      .replace(/\d+/g, "#")
      .trim();
    const group: Optional<IGameErrorGroup> = groups.get(message);

    if (group) {
      group.count += 1;
    } else {
      groups.set(message, { message, count: 1, firstLine: index + 1, example: trimmed });
    }
  });

  return {
    fatal:
      fatalAt >= 0
        ? lines
            .slice(fatalAt, fatalAt + 12)
            .join("\n")
            .trim()
        : null,
    groups: [...groups.values()],
  };
}

/**
 * @param name - Log name.
 * @param errors - Its problems.
 * @returns Report of the problems, an all-clear line when there are none.
 */
export function describeGameErrors(name: string, errors: IGameErrors): string {
  if (!errors.fatal && errors.groups.length === 0) {
    return `${name}: no errors or warnings.`;
  }

  return [
    `${name}: ${errors.groups.reduce((sum, it) => sum + it.count, 0)} problem lines in ${errors.groups.length} kinds.`,
    ...(errors.fatal ? ["Fatal error:", errors.fatal] : []),
    ...errors.groups.map((it) => `- ${it.count}x (first at line ${it.firstLine}) ${it.example}`),
  ].join("\n");
}
