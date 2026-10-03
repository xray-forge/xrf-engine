import { describe, expect, it } from "@jest/globals";
import { CScriptXmlInit, CUIScriptWnd } from "xray16";
import { MockCScriptXmlInit, MockCUIScriptWnd } from "xray16/mocks";

import { Options } from "@/engine/core/ui/menu/options/Options";
import { OptionsGameplay } from "@/engine/core/ui/menu/options/OptionsGameplay";

describe("OptionsVideoAdvanced", () => {
  it("should correctly create", () => {
    const gameplay: OptionsGameplay = new OptionsGameplay();

    expect(gameplay.WindowName()).toBe(OptionsGameplay.name);
  });

  it("should correctly initialize", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);
    const gameplay: OptionsGameplay = new OptionsGameplay();
    const xml: CScriptXmlInit = MockCScriptXmlInit.mock();

    gameplay.initialize(1, 1, xml, options);

    expect(options.preconditions.length()).toBe(20);
  });
});
