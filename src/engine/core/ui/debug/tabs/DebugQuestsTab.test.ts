import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { $fromArray } from "xray16/macros";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugQuestView, EDebugTab, IDebugFlow } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { readDebugFlows } from "@/engine/core/managers/debug/utils/debug_flows";
import { setDebugInfoPortion } from "@/engine/core/managers/debug/utils/debug_quests";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugQuestsTab } from "@/engine/core/ui/debug/tabs/DebugQuestsTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "quests", questView: "info portions" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

jest.mock("@/engine/core/managers/debug/utils/debug_quests", () => ({
  ...(jest.requireActual("@/engine/core/managers/debug/utils/debug_quests") as object),
  setDebugInfoPortion: jest.fn(() => "changed"),
}));

jest.mock("@/engine/core/managers/debug/utils/debug_flows", () => ({
  ...(jest.requireActual("@/engine/core/managers/debug/utils/debug_flows") as object),
  readDebugFlows: jest.fn(() => null),
}));

/**
 * @returns Quests tab of a new debugger window.
 */
function createQuestsTab(): DebugQuestsTab {
  return new Debugger(getManager(DebugManager)).tabs.get(EDebugTab.QUESTS) as DebugQuestsTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  jest.mocked(setDebugInfoPortion).mockClear();
  jest.mocked(readDebugFlows).mockReturnValue(null);
});

describe("DebugQuestsTab", () => {
  it("should show the action buttons of the list shown", () => {
    const tab: DebugQuestsTab = createQuestsTab();

    tab.refresh();

    expect(tab.uiActions.get(EDebugQuestView.INFO_PORTIONS).get(1).IsShown()).toBe(true);
    expect(tab.uiActions.get(EDebugQuestView.TASKS).get(1).IsShown()).toBe(false);
    expect(tab.uiActions.get(EDebugQuestView.FLOWS).get(1).IsShown()).toBe(false);
  });

  it("should give an info portion the actor lacks, and not one it has", () => {
    const tab: DebugQuestsTab = createQuestsTab();

    tab.refresh();
    tab.onInfoPortionChange(true);

    expect(setDebugInfoPortion).not.toHaveBeenCalled();

    tab.onEntryClicked(1);
    tab.onInfoPortionChange(false);

    expect(setDebugInfoPortion).not.toHaveBeenCalled();

    tab.onInfoPortionChange(true);

    expect(setDebugInfoPortion).toHaveBeenCalledWith(tab.selected?.key, true);
  });

  it("should list no flows when they are not built, keeping their actions shown", () => {
    const tab: DebugQuestsTab = createQuestsTab();

    getManager(DebugManager).preferences.questView = EDebugQuestView.FLOWS;
    tab.refresh();

    expect(tab.entries.length()).toBe(0);
    expect(tab.uiActions.get(EDebugQuestView.FLOWS).get(1).IsShown()).toBe(true);
  });

  it("should pin the selected flow to the overlay, and unpin it", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugQuestsTab = createQuestsTab();
    const flow: IDebugFlow = { identity: "quests_test", module: "checks.test", source: "test.flow.ts", level: null };

    jest.spyOn(manager, "pinFlow").mockImplementation((it) => {
      manager.pinnedFlow = it;
    });
    jest.mocked(readDebugFlows).mockReturnValue($fromArray([flow]));

    manager.preferences.questView = EDebugQuestView.FLOWS;
    tab.refresh();
    tab.onPinFlow();

    expect(manager.pinFlow).not.toHaveBeenCalled();

    tab.onEntryClicked(1);
    tab.onPinFlow();

    expect(manager.pinFlow).toHaveBeenCalledWith(flow);
    expect(tab.owner.uiMessage.TextControl().GetText()).toBe(
      "quests_test pinned to the overlay - turn the overlay on in the system tab"
    );
    expect(tab.uiActions.get(EDebugQuestView.FLOWS).get(3).TextControl().GetText()).toBe("unpin from the overlay");

    tab.onPinFlow();

    expect(manager.pinFlow).toHaveBeenLastCalledWith(null);
    expect(tab.uiActions.get(EDebugQuestView.FLOWS).get(3).TextControl().GetText()).toBe("pin to the overlay");
  });
});
