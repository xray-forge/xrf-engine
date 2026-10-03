import { describe, expect, it } from "@jest/globals";
import { CScriptXmlInit, CUIScriptWnd } from "xray16";
import { MockCScriptXmlInit, MockCUIScriptWnd } from "xray16/mocks";

import { Options } from "@/engine/core/ui/menu/options/Options";
import { OptionsControls } from "@/engine/core/ui/menu/options/OptionsControls";

describe("OptionsControls", () => {
  it("should correctly create", () => {
    const controls: OptionsControls = new OptionsControls();

    expect(controls.WindowName()).toBe(OptionsControls.name);
  });

  it("should correctly initialize", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);
    const controls: OptionsControls = new OptionsControls();
    const xml: CScriptXmlInit = MockCScriptXmlInit.mock();

    controls.initialize(1, 1, xml, options);

    expect(options.preconditions.length()).toBe(20);
  });
});
