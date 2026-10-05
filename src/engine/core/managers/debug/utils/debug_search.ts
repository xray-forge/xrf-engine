import { LuaArray, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

/**
 * Filter list rows by a search query, matched in their lower case `search` text regardless of the query's case.
 *
 * @param entries - Rows to filter.
 * @param query - Search query, an empty one matching everything.
 * @returns Matching rows, in their order.
 */
export function filterDebugEntries<T extends { search: string }>(entries: LuaArray<T>, query: string): LuaArray<T> {
  if (query === "") {
    return entries;
  }

  const needle: string = string.lower(query);
  const matching: LuaArray<T> = new LuaTable();

  for (const index of $range(1, entries.length())) {
    const entry: T = entries.get(index);

    if ($isNotNil(string.find(entry.search, needle, 1, true)[0])) {
      matching.set(matching.length() + 1, entry);
    }
  }

  return matching;
}

/**
 * Sort list rows so the loaded level's come first, then by label.
 *
 * @param entries - Rows to sort in place.
 * @param loadedLevel - Name of the loaded level.
 * @returns The rows.
 */
export function sortDebugEntriesByLevel<T extends { level: TName; label: string }>(
  entries: LuaArray<T>,
  loadedLevel: TName
): LuaArray<T> {
  table.sort(entries, (first, second) =>
    first.level === second.level || (first.level !== loadedLevel && second.level !== loadedLevel)
      ? first.label < second.label
      : first.level === loadedLevel
  );

  return entries;
}
