import { describe, expect, it } from "@jest/globals";

import { wrapText } from "@/engine/core/utils/string/string_wrap";

describe("wrapText", () => {
  it("should break text between words within the width", () => {
    expect(wrapText("talk to the barman about the job", 12)).toEqualLuaArrays([
      "talk to the",
      "barman about",
      "the job",
    ]);
    expect(wrapText("a  b", 5)).toEqualLuaArrays(["a b"]);
    expect(wrapText("", 5)).toEqualLuaArrays([]);
  });

  it("should cut a word longer than a line into pieces", () => {
    expect(wrapText("unbreakable next", 5)).toEqualLuaArrays(["unbre", "akabl", "e", "next"]);
    expect(wrapText("go {+info}title_one", 8)).toEqualLuaArrays(["go", "{+info}t", "itle_one"]);
  });

  it("should give a line a character at least", () => {
    expect(wrapText("ab", 0)).toEqualLuaArrays(["a", "b"]);
  });
});
