import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockAlifeObject, MockGameObject } from "xray16/mocks";

import { evaluateDialogs, handleDialogRequest, resolveDialogNpc, walkDialog } from "@/engine/checks/mcp/mcp_dialog";
import { IMcpDialog, IMcpDialogPhrase, IMcpDialogSummary } from "@/engine/checks/mcp/mcp_dialog_types";
import { registerSimulator, registerStoryLink } from "@/engine/core/database";
import { giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

/**
 * @param id - Phrase id.
 * @param overrides - Fields to replace.
 * @returns A phrase with nothing to it but its id and line.
 */
function mockPhrase(id: string, overrides: Partial<IMcpDialogPhrase> = {}): IMcpDialogPhrase {
  return {
    id,
    text: `line_${id}`,
    next: [],
    giveInfo: [],
    disableInfo: [],
    actions: [],
    hasInfo: [],
    dontHasInfo: [],
    preconditions: [],
    ...overrides,
  };
}

/**
 * @param overrides - Fields to replace.
 * @returns A dialog an NPC opens, which the actor answers one of two ways and the NPC closes.
 */
function mockDialog(overrides: Partial<IMcpDialog> = {}): IMcpDialog {
  return {
    id: "cache_dialog",
    caption: "line_0",
    isStartedByNpc: true,
    offeringInfos: [],
    hasInfo: [],
    dontHasInfo: [],
    preconditions: [],
    phrases: {
      "0": mockPhrase("0", { next: ["1"] }),
      "1": mockPhrase("1", { next: ["11", "12"] }),
      "11": mockPhrase("11", { next: ["111"], actions: ["mcp_dialog_test.give_task"] }),
      "12": mockPhrase("12", { hasInfo: ["never_known"] }),
      "111": mockPhrase("111", { giveInfo: ["task_known"] }),
    },
    ...overrides,
  };
}

/**
 * @param overrides - Fields to replace.
 * @returns A dialog an NPC offers, gated by nothing.
 */
function mockSummary(overrides: Partial<IMcpDialogSummary>): IMcpDialogSummary {
  return {
    id: "dialog",
    caption: null,
    isStartedByNpc: false,
    offeringInfos: [],
    hasInfo: [],
    dontHasInfo: [],
    preconditions: [],
    ...overrides,
  };
}

describe("mcp dialogs", () => {
  let npc: GameObject;
  let actor: GameObject;

  beforeEach(() => {
    resetRegistry();

    actor = mockRegisteredActor().actorGameObject;
    npc = MockGameObject.mockStalker();

    (globalThis as AnyObject).mcp_dialog_test = {
      give_task: jest.fn(),
      is_ready: jest.fn(() => false),
      broken: jest.fn(() => {
        throw new Error("broken");
      }),
    };
  });

  afterEach(() => {
    delete (globalThis as AnyObject).mcp_dialog_test;
  });

  it("should find an NPC by its object id and refuse one nothing matches", () => {
    expect(resolveDialogNpc(npc.id())).toBe(npc);
    expect(() => resolveDialogNpc("nobody_at_all")).toThrow("No online object matches 'nobody_at_all'.");
  });

  it("should refuse an offline story object rather than match its id as a name, and an object that is no stalker", () => {
    registerSimulator();
    registerStoryLink(MockAlifeObject.mock({ id: 5000 }).id, "offline_snag");

    const cover: GameObject = MockGameObject.mock({ name: "zat_a2_sc_offline_snag" });

    expect(() => resolveDialogNpc("offline_snag")).toThrow(
      "Story object 'offline_snag' is offline, bring the actor close to it first."
    );
    expect(() => resolveDialogNpc(cover.id())).toThrow("Object 'zat_a2_sc_offline_snag' is not a stalker");
  });

  it("should judge whether the actor may open each dialog, and why not", () => {
    giveInfoPortion("known");

    expect(
      evaluateDialogs(
        [
          mockSummary({ id: "open", caption: "open_0" }),
          mockSummary({ id: "gated", offeringInfos: ["global_dialogs", "other_dialogs"] }),
          mockSummary({ id: "known", offeringInfos: ["known"], dontHasInfo: ["known"] }),
          mockSummary({ id: "predicate", preconditions: ["mcp_dialog_test.is_ready"] }),
          mockSummary({ id: "missing", preconditions: ["mcp_dialog_test.nothing"] }),
          mockSummary({ id: "failing", preconditions: ["mcp_dialog_test.broken"] }),
        ],
        npc
      ).map((it) => [it.id, it.failed ?? null, it.text])
    ).toEqual([
      ["open", null, "translated_open_0"],
      ["gated", "needs info 'global_dialogs' or 'other_dialogs'", null],
      ["known", "has info 'known'", null],
      ["predicate", "'mcp_dialog_test.is_ready' is false", null],
      ["missing", "no function 'mcp_dialog_test.nothing'", null],
      ["failing", "'mcp_dialog_test.broken' failed: broken", null],
    ]);
  });

  it("should walk a dialog the NPC opens, the NPC answering between the actor's choices", () => {
    // The NPC's answer is left to it: `12` needs an info portion nobody has, so `11` is all it may say.
    const walked: AnyObject = walkDialog(mockDialog(), npc, ["1", "111"]);

    expect(walked.said.map((it: AnyObject) => [it.speaker, it.phrase])).toEqual([
      ["npc", "0"],
      ["actor", "1"],
      ["npc", "11"],
      ["actor", "111"],
    ]);
    expect(walked.isFinished).toBe(true);
    expect(walked.errors).toEqual([]);
    expect(hasInfoPortion("task_known")).toBe(true);
    // Actions take the speaker and the listener first, as the engine calls them.
    expect((globalThis as AnyObject).mcp_dialog_test.give_task).toHaveBeenCalledWith(npc, actor, "cache_dialog", "11");
  });

  it("should stop at the actor's turn with what it may say, or say why a choice is not available", () => {
    const actorOpened: AnyObject = walkDialog(mockDialog({ isStartedByNpc: false }), npc, ["1", "12"]);

    expect(actorOpened.said.map((it: AnyObject) => [it.speaker, it.phrase])).toEqual([
      ["actor", "0"],
      ["npc", "1"],
    ]);
    expect(actorOpened.options).toEqual([{ phrase: "11", text: "translated_line_11" }]);
    expect(actorOpened.isFinished).toBe(false);
    expect(actorOpened.errors).toEqual(["phrase 12 is not available to the actor; options: 11"]);
  });

  it("should refuse to walk a dialog whose own conditions fail", () => {
    expect(walkDialog(mockDialog({ hasInfo: ["never_known"] }), npc, [])).toEqual({
      dialog: "cache_dialog",
      said: [],
      options: [],
      isFinished: false,
      errors: ["dialog unavailable: needs info 'never_known'"],
    });
  });

  it("should close the game's own talk window before a walk", () => {
    jest.spyOn(actor, "is_talking").mockImplementation(() => true);

    const walked: AnyObject = handleDialogRequest({ npc: npc.id(), walk: { dialog: mockDialog(), choices: [] } });

    expect(walked.isTalkClosed).toBe(true);
    expect(actor.stop_talk).toHaveBeenCalled();
    expect(npc.stop_talk).toHaveBeenCalled();
    expect(walked.npc.id).toBe(npc.id());
  });
});
