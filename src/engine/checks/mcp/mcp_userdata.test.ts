import { describe, expect, it } from "@jest/globals";
import { MockAlifeObject, MockCTime, MockGameObject, MockIniFile, MockVector } from "xray16/mocks";

import { describeUserdata } from "@/engine/checks/mcp/mcp_userdata";

describe("describeUserdata", () => {
  it("should name engine objects by the members of their class", () => {
    expect(describeUserdata(MockCTime.mock(2012, 8, 3, 9, 0, 59, 7))).toBe("<CTime 2012-08-03 09:00:59.007>");
    expect(describeUserdata(MockIniFile.mock("system.ltx"))).toBe("<ini_file system.ltx>");
    expect(describeUserdata(MockGameObject.mock({ id: 7, name: "bandit" }))).toBe("<game_object 7 bandit>");
    expect(describeUserdata(MockAlifeObject.mock({ id: 9, name: "squad" }))).toBe("<server_object 9 squad>");
    expect(describeUserdata(MockVector.mock(1, 2.5, -3))).toBe("<vector 1.00 2.50 -3.00>");
    expect(describeUserdata({})).toBe("<userdata>");
  });

  it("should fall back to a placeholder when the engine refuses a member read", () => {
    const refusing: object = new Proxy(
      {},
      {
        get: () => {
          throw new Error("No such member.");
        },
      }
    );

    expect(describeUserdata(refusing)).toBe("<userdata>");
  });
});
