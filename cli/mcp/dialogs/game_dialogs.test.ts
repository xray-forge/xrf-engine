import { describe, expect, it } from "@jest/globals";

import { IDialogDescriptor, IDialogListEntry } from "#/mcp/dialogs/dialog_cli_types";
import { findDialogInitFunction, summarizeListedDialog, toGameDialog } from "#/mcp/dialogs/game_dialogs";

function mockListEntry(overrides: Partial<IDialogListEntry> = {}): IDialogListEntry {
  return {
    id: "snag_cache_dialog",
    logicalPath: "configs\\gameplay\\dialogs_zaton.xml",
    priority: null,
    phrases: 2,
    captionKey: "snag_cache_0",
    caption: "Want to earn some?",
    elements: [
      { name: "has_info", kind: "hasInfo", value: "known" },
      { name: "dont_has_info", kind: "dontHasInfo", value: "done" },
      { name: "precondition", kind: "precondition", value: "dialogs.check" },
    ],
    offers: [{ kind: "start", character: "snag" }],
    ...overrides,
  };
}

describe("summarizeListedDialog", () => {
  it("should read the dialog's conditions and opening caption", () => {
    expect(summarizeListedDialog(mockListEntry(), true)).toEqual({
      id: "snag_cache_dialog",
      caption: "snag_cache_0",
      isStartedByNpc: true,
      offeringInfos: [],
      hasInfo: ["known"],
      dontHasInfo: ["done"],
      preconditions: ["dialogs.check"],
    });
  });

  it("should gate a dialog by its info portions only when nothing else offers it", () => {
    const byInfo: IDialogListEntry = mockListEntry({
      offers: [
        { kind: "info", info: "global_dialogs" },
        { kind: "info", info: "other_dialogs" },
      ],
    });
    const byCharacterToo: IDialogListEntry = mockListEntry({
      offers: [
        { kind: "actor", character: "snag" },
        { kind: "info", info: "global_dialogs" },
      ],
    });

    expect(summarizeListedDialog(byInfo, false).offeringInfos).toEqual(["global_dialogs", "other_dialogs"]);
    expect(summarizeListedDialog(byCharacterToo, false).offeringInfos).toEqual([]);
  });
});

describe("toGameDialog", () => {
  const dialog: IDialogDescriptor = {
    id: "snag_cache_dialog",
    logicalPath: "configs\\gameplay\\dialogs_zaton.xml",
    elements: [{ name: "dont_has_info", kind: "dontHasInfo", value: "done" }],
    phrases: [
      { id: "0", textKey: "snag_cache_0", next: ["1", "2"], elements: [] },
      {
        id: "1",
        textKey: null,
        next: [],
        elements: [
          { name: "script_text", kind: "scriptText", value: "dialogs.price" },
          { name: "give_info", kind: "giveInfo", value: "done" },
          { name: "disable_info", kind: "disableInfo", value: "known" },
          { name: "action", kind: "action", value: "dialogs.give_task" },
          { name: "has_info", kind: "hasInfo", value: "known" },
        ],
      },
    ],
  };

  it("should map every phrase with what saying it takes and does", () => {
    expect(toGameDialog(dialog, false)).toEqual({
      id: "snag_cache_dialog",
      caption: "snag_cache_0",
      isStartedByNpc: false,
      offeringInfos: [],
      hasInfo: [],
      dontHasInfo: ["done"],
      preconditions: [],
      phrases: {
        "0": {
          id: "0",
          text: "snag_cache_0",
          next: ["1", "2"],
          giveInfo: [],
          disableInfo: [],
          actions: [],
          hasInfo: [],
          dontHasInfo: [],
          preconditions: [],
        },
        "1": {
          id: "1",
          text: "",
          next: [],
          giveInfo: ["done"],
          disableInfo: ["known"],
          actions: ["dialogs.give_task"],
          hasInfo: ["known"],
          dontHasInfo: [],
          preconditions: [],
        },
      },
    });
  });

  it("should find the init function of a dialog a script builds", () => {
    expect(findDialogInitFunction(dialog)).toBeNull();
    expect(
      findDialogInitFunction({
        ...dialog,
        elements: [{ name: "init_func", kind: "initFunc", value: "dialogs.build_traveler" }],
        phrases: [],
      })
    ).toBe("dialogs.build_traveler");
  });
});
