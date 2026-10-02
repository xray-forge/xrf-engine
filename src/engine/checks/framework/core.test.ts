import { describe, expect, it } from "@jest/globals";

import { collectReportedLines, report } from "@/engine/checks/framework/core";

describe("collectReportedLines", () => {
  it("should collect the lines a body reports and return its result", () => {
    report("before");

    const { result, lines } = collectReportedLines(() => {
      report("first %s", 1);
      report("second");

      return 42;
    });

    report("after");

    expect(result).toBe(42);
    expect(lines).toEqual([expect.stringMatching(/\[check\] first 1$/), expect.stringMatching(/\[check\] second$/)]);
  });

  it("should give nested collections their own lines and stop collecting after a failure", () => {
    const outer = collectReportedLines(() => {
      report("outer");

      return collectReportedLines(() => report("inner")).lines;
    });

    expect(outer.result).toEqual([expect.stringMatching(/inner$/)]);
    expect(outer.lines).toEqual([expect.stringMatching(/outer$/)]);

    expect(() =>
      collectReportedLines(() => {
        throw new Error("flow failed");
      })
    ).toThrow("flow failed");

    const { lines } = collectReportedLines(() => report("next"));

    expect(lines).toEqual([expect.stringMatching(/next$/)]);
  });
});
