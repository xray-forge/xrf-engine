import { describe, expect, it } from "@jest/globals";
import { CScriptXmlInit, CUIScriptWnd } from "xray16";
import { MockCScriptXmlInit, MockCUIScriptWnd } from "xray16/mocks";

import { Options } from "@/engine/core/ui/menu/options/Options";
import { OptionsVideoAdvanced } from "@/engine/core/ui/menu/options/OptionsVideoAdvanced";

describe("OptionsVideoAdvanced", () => {
  it("should correctly create", () => {
    const advanced: OptionsVideoAdvanced = new OptionsVideoAdvanced();

    expect(advanced.WindowName()).toBe(OptionsVideoAdvanced.name);
  });

  it("should correctly initialize", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);
    const advanced: OptionsVideoAdvanced = new OptionsVideoAdvanced();
    const xml: CScriptXmlInit = MockCScriptXmlInit.mock();

    advanced.initialize(1, 1, xml, options);

    expect(options.preconditions.length()).toBe(40);
  });
});
