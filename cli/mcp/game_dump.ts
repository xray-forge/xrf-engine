import { createHash } from "node:crypto";

import { Nullable, Optional } from "#/utils/types";

/**
 * Numeric fields named like engine timestamps, which move on their own between two dumps.
 */
const CLOCK_FIELD: RegExp = /(^|\.)(updateDelta|\w+At)$/;

/**
 * Key the endpoint writes for a table key that is no string or number, numbered within its table.
 */
const PLACEHOLDER_KEY: RegExp = /^(<[^>]*>)#\d+$/;

/**
 * Smallest delta in milliseconds read as the game clock moving rather than a value changing.
 */
const CLOCK_SHIFT_MIN_MS: number = 1_000;

/**
 * Fields that must move by one delta before it reads as the game clock.
 */
const CLOCK_SHIFT_MIN_FIELDS: number = 3;

/**
 * One path that differs between two dumps, with its JSON value on each side.
 */
export interface IDumpDifference {
  path: string;
  before: Optional<string>;
  after: Optional<string>;
}

/**
 * Numeric fields that all moved by one delta, as timestamps do when the game clock runs between two loads.
 */
export interface IDumpClockShift {
  delta: number;
  count: number;
}

/**
 * Differences between two dumps, how many clock or ignored fields were left out, and the clock shifts.
 */
export interface IDumpComparison {
  differences: Array<IDumpDifference>;
  ignored: number;
  shifts: Array<IDumpClockShift>;
}

/**
 * @param value - Value of a dump.
 * @returns Whether it is a plain value rather than a table.
 */
function isPlain(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

/**
 * @param value - Dump or part of it.
 * @returns Short digest of its content, independent of key order.
 */
function digestDump(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify([...flattenDump(value)].sort()))
    .digest("hex")
    .slice(0, 8);
}

/**
 * Drop the numbers of placeholder keys, which follow an iteration order. A name one key holds stays as it is, and
 * keys sharing a name are told apart by their value.
 *
 * @param value - Table of a dump.
 * @returns Its entries with stable keys.
 */
function getStableEntries(value: object): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = Object.entries(value);
  const shared: Map<string, number> = new Map();
  const named: Map<string, number> = new Map();

  for (const [key] of entries) {
    const kind: Optional<string> = PLACEHOLDER_KEY.exec(key)?.[1];

    if (kind) {
      shared.set(kind, (shared.get(kind) ?? 0) + 1);
    }
  }

  return entries.map(([key, item]) => {
    const placeholder: Nullable<RegExpExecArray> = PLACEHOLDER_KEY.exec(key);

    if (!placeholder) {
      return [key, item];
    }

    const kind: string = placeholder[1];
    const name: string = shared.get(kind) === 1 ? kind : `${kind}:${digestDump(item)}`;
    const count: number = (named.get(name) ?? 0) + 1;

    named.set(name, count);

    return [count === 1 ? name : `${name}#${count}`, item];
  });
}

/**
 * Flatten a dump into paths and JSON values. Lists of plain values become sorted sets and placeholder keys are
 * named by their value, as Lua builds them from hash tables whose order changes in a new Lua state.
 *
 * @param value - Dump or part of it.
 * @param prefix - Path of the value.
 * @param into - Map collecting the paths.
 * @returns Map of paths to JSON values.
 */
export function flattenDump(
  value: unknown,
  prefix: string = "",
  into: Map<string, string> = new Map()
): Map<string, string> {
  if (Array.isArray(value) && value.length > 0 && value.every(isPlain)) {
    into.set(prefix, JSON.stringify(value.map((it) => JSON.stringify(it)).sort()));
  } else if (value !== null && typeof value === "object") {
    const entries: Array<[string, unknown]> = getStableEntries(value);

    if (entries.length === 0) {
      into.set(prefix, Array.isArray(value) ? "[]" : "{}");
    }

    for (const [key, item] of entries) {
      flattenDump(item, prefix ? `${prefix}.${key}` : key, into);
    }
  } else {
    into.set(prefix, JSON.stringify(value));
  }

  return into;
}

/**
 * Compare two dumps, leaving out numeric clock fields, paths containing an ignored part, and numeric fields that
 * moved together by one delta of a second or more, which is the game clock running between two loads.
 *
 * @param before - Earlier dump.
 * @param after - Later dump.
 * @param ignore - Path parts to leave out, such as a manager or field name.
 * @returns Differing paths in order, how many were left out, and the clock shifts.
 */
export function compareDumps(before: unknown, after: unknown, ignore: ReadonlyArray<string> = []): IDumpComparison {
  const left: Map<string, string> = flattenDump(before);
  const right: Map<string, string> = flattenDump(after);
  const candidates: Array<IDumpDifference> = [];
  let ignored: number = 0;

  for (const path of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const was: Optional<string> = left.get(path);
    const is: Optional<string> = right.get(path);

    if (was === is) {
      continue;
    }

    const isClock: boolean = CLOCK_FIELD.test(path) && !isNaN(Number(was)) && !isNaN(Number(is));

    if (isClock || ignore.some((part) => path.includes(part))) {
      ignored += 1;
    } else {
      candidates.push({ path, before: was, after: is });
    }
  }

  const deltas: Map<number, number> = new Map();

  for (const { before, after } of candidates) {
    const delta: number = Number(after) - Number(before);

    if (Math.abs(delta) >= CLOCK_SHIFT_MIN_MS) {
      deltas.set(delta, (deltas.get(delta) ?? 0) + 1);
    }
  }

  const shifts: Array<IDumpClockShift> = [...deltas]
    .filter(([, count]) => count >= CLOCK_SHIFT_MIN_FIELDS)
    .map(([delta, count]) => ({ delta, count }))
    .sort((first, second) => second.count - first.count);
  const shifted: Set<number> = new Set(shifts.map((it) => it.delta));

  return {
    differences: candidates.filter(({ before, after }) => !shifted.has(Number(after) - Number(before))),
    ignored,
    shifts,
  };
}

/**
 * @param comparison - Differences between two dumps.
 * @param limit - Differences listed per manager, all of them when not given.
 * @returns Report of the differences grouped by manager.
 */
export function describeComparison(comparison: IDumpComparison, limit: number = Infinity): string {
  const byManager: Map<string, Array<IDumpDifference>> = new Map();

  for (const difference of comparison.differences) {
    const manager: string = difference.path.split(".")[0];

    byManager.set(manager, [...(byManager.get(manager) ?? []), difference]);
  }

  const shifted: number = comparison.shifts.reduce((total, it) => total + it.count, 0);
  const lines: Array<string> = [
    `${comparison.differences.length} differences in ${byManager.size} managers, ${comparison.ignored} clock or ` +
      "ignored fields left out." +
      (shifted > 0
        ? ` ${shifted} fields moved with the game clock: ` +
          comparison.shifts.map(({ delta, count }) => `${delta > 0 ? "+" : ""}${delta} ms on ${count}`).join(", ") +
          "."
        : ""),
  ];

  for (const [manager, differences] of byManager) {
    lines.push(`## ${manager} (${differences.length})`);

    for (const { path, before, after } of differences.slice(0, limit)) {
      const field: string = path.slice(manager.length + 1) || path;

      if (before === undefined) {
        lines.push(`+ ${field} = ${after}`);
      } else if (after === undefined) {
        lines.push(`- ${field} = ${before}`);
      } else {
        lines.push(`~ ${field}: ${before} -> ${after}`);
      }
    }

    if (differences.length > limit) {
      lines.push(`... ${differences.length - limit} more`);
    }
  }

  return lines.join("\n");
}
