import { LuaArray, TCount, TIndex, TLabel } from "xray16/lib";

/**
 * Break text into lines of at most a width, between words, cutting a word longer than a line into pieces.
 *
 * @param text - Text to break.
 * @param width - Most characters a line holds, one at least.
 * @returns Lines, none when the text is empty.
 */
export function wrapText(text: TLabel, width: TCount): LuaArray<TLabel> {
  // A line narrower than a character would never take a piece of a word.
  width = math.max(width, 1);

  const lines: LuaArray<TLabel> = new LuaTable();
  const length: TCount = string.len(text);
  let line: TLabel = "";
  let start: TIndex = 1;

  while (start <= length) {
    const [space] = string.find(text, " ", start, true);
    const end: TIndex = space ?? length + 1;
    let word: TLabel = string.sub(text, start, end - 1);

    // Runs of spaces leave empty words between them.
    while (word !== "") {
      if (line === "") {
        line = string.sub(word, 1, width);
        word = string.sub(word, width + 1);
      } else if (string.len(line) + 1 + string.len(word) <= width) {
        line = `${line} ${word}`;
        word = "";
      } else {
        lines.set(lines.length() + 1, line);
        line = "";
        continue;
      }

      if (word !== "") {
        lines.set(lines.length() + 1, line);
        line = "";
      }
    }

    start = end + 1;
  }

  if (line !== "") {
    lines.set(lines.length() + 1, line);
  }

  return lines;
}
