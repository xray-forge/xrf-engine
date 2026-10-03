import { describe, expect, it } from "@jest/globals";
import { CScriptXmlInit, CUIScriptWnd } from "xray16";
import { MockCScriptXmlInit, MockCUIScriptWnd } from "xray16/mocks";

import { Options } from "@/engine/core/ui/menu/options/Options";
import { OptionsVideo } from "@/engine/core/ui/menu/options/OptionsVideo";

describe("OptionsVideo", () => {
  it("should correctly create", () => {
    const video: OptionsVideo = new OptionsVideo();

    expect(video.WindowName()).toBe(OptionsVideo.name);
  });

  it("should correctly initialize", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);
    const advanced: OptionsVideo = new OptionsVideo();
    const xml: CScriptXmlInit = MockCScriptXmlInit.mock();

    advanced.initialize(1, 1, xml, options);

    expect(options.preconditions.length()).toBe(20);
  });
});
