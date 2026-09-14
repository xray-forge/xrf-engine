import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TName, TSection } from "xray16/lib";
import { MockAlifeSimulator, MockGameObject } from "xray16/mocks";

import { registry } from "@/engine/core/database";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { zatB29AfTable, zatB29InfopTable } from "@/engine/scripts/quests/zaton/zat_b29/advanced_artefacts_data";
import { callBinding, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

function callDialogsBinding<T = boolean>(name: TName, args: AnyArgs = []): T {
  return callBinding(name, args, (_G as AnyObject).dialogs_zaton);
}

function mockActorWith(sections: Array<TSection>): GameObject {
  resetRegistry();

  return mockRegisteredActor({
    inventory: sections.map((section, index) => [`${section}_${index}`, MockGameObject.mock({ section })]),
  }).actorGameObject;
}

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  registry.simulator = MockAlifeSimulator.getInstance();
});

beforeAll(() => {
  require("@/engine/declarations/dialogs/zaton/zat_b29/advanced-artefacts-variants");
});

describe.each([1, 2, 3, 4, 5, 6, 7, 8])("advanced artefact variant %i", (index: number) => {
  it("should require both the request marker and the matching artefact", () => {
    const tableIndex = index + 15;
    const artefact = zatB29AfTable.get(tableIndex);

    expect(callDialogsBinding(`zat_b29_actor_has_adv_task_af_${index}`)).toBe(false);

    mockActorWith([artefact]);
    expect(callDialogsBinding(`zat_b29_actor_has_adv_task_af_${index}`)).toBe(false);

    giveInfoPortion(zatB29InfopTable.get(tableIndex));
    expect(callDialogsBinding(`zat_b29_actor_has_adv_task_af_${index}`)).toBe(true);
  });

  it("should require the request marker while the artefact is missing", () => {
    const tableIndex = index + 15;
    const artefact = zatB29AfTable.get(tableIndex);

    expect(callDialogsBinding(`zat_b29_actor_do_not_has_adv_task_af_${index}`)).toBe(false);
    giveInfoPortion(zatB29InfopTable.get(tableIndex));
    expect(callDialogsBinding(`zat_b29_actor_do_not_has_adv_task_af_${index}`)).toBe(true);

    mockActorWith([artefact]);
    giveInfoPortion(zatB29InfopTable.get(tableIndex));
    expect(callDialogsBinding(`zat_b29_actor_do_not_has_adv_task_af_${index}`)).toBe(false);
  });
});
