import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TLabel, TNumberId } from "xray16/lib";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { getDebugInteractionBlocker } from "@/engine/core/managers/debug/utils/debug_target_actions";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugTargetTab } from "@/engine/core/ui/debug/tabs/DebugTargetTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_target_actions", () => ({
  ...(jest.requireActual("@/engine/core/managers/debug/utils/debug_target_actions") as object),
  getDebugInteractionBlocker: jest.fn(() => null),
}));

/**
 * @returns Target tab of a new debugger window, which does not close its main menu.
 */
function createTargetTab(): DebugTargetTab {
  const debuggerWindow: Debugger = new Debugger(getManager(DebugManager));

  jest.spyOn(debuggerWindow, "resume").mockImplementation(jest.fn());

  return debuggerWindow.tabs.get(EDebugTab.TARGET) as DebugTargetTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
});

describe("DebugTargetTab", () => {
  it("should close the debugger and run an interaction once the game runs again", () => {
    const tab: DebugTargetTab = createTargetTab();
    const action: (id: TNumberId) => TLabel = jest.fn(() => "traded");

    getManager(DebugManager).target.id = 10;
    tab.onInteraction(action);

    expect(tab.owner.resume).toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();

    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE);
    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(10);
    expect(tab.owner.uiMessage.TextControl().GetText()).toBe("traded");
  });

  it("should stay open and report what stops an interaction", () => {
    const tab: DebugTargetTab = createTargetTab();
    const action: (id: TNumberId) => TLabel = jest.fn(() => "traded");

    tab.onInteraction(action);

    expect(tab.owner.uiMessage.TextControl().GetText()).toBe("no target");

    getManager(DebugManager).target.id = 10;
    jest.mocked(getDebugInteractionBlocker).mockReturnValueOnce("too far");
    tab.onInteraction(action);

    expect(tab.owner.resume).not.toHaveBeenCalled();
    expect(tab.owner.uiMessage.TextControl().GetText()).toBe("too far");
  });
});
