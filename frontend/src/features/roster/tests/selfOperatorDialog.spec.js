/**
 * 自选干员的阶数配额
 *
 * 规则值只在组件里定义一次（MAX_SELF_PER_TIER），模板文案、计数标签、
 * 判断分支都用它插值——改配额不该漏改其中一处。
 *
 * 另外锁住提示通道：超额时通过 notify 事件提示，不再是阻塞式 alert
 * （jsdom 里 alert 会被静默忽略，改前这个分支等于没有提示）。
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import SelfOperatorDialog from "@/features/roster/components/SelfOperatorDialog.vue";

const mountDialog = () =>
  mount(SelfOperatorDialog, {
    props: { show: true, selectedOperators: [] },
  });

describe("自选干员配额", () => {
  it("五阶选满后再点不发散：不加入，并发出 notify", async () => {
    const wrapper = mountDialog();
    const cards = wrapper.findAll(".operator-card");
    expect(cards.length).toBeGreaterThan(3);

    await cards[0].trigger("click");
    await cards[1].trigger("click");
    expect(wrapper.findAll(".operator-card.tier-five")).toHaveLength(2);

    await cards[2].trigger("click");

    expect(wrapper.findAll(".operator-card.tier-five")).toHaveLength(2);
    const notify = wrapper.emitted("notify");
    expect(notify).toHaveLength(1);
    expect(notify[0][0]).toContain("五阶");
  });

  it("六阶配额独立计算", async () => {
    const wrapper = mountDialog();
    const cards = wrapper.findAll(".operator-card");

    // 第一次点进五阶，第二次点升到六阶
    await cards[0].trigger("click");
    await cards[0].trigger("click");
    await cards[1].trigger("click");
    await cards[1].trigger("click");
    expect(wrapper.findAll(".operator-card.tier-six")).toHaveLength(2);

    // 第三名先落到五阶，再想升六阶时被拦
    await cards[2].trigger("click");
    expect(wrapper.findAll(".operator-card.tier-five")).toHaveLength(1);

    await cards[2].trigger("click");

    expect(wrapper.findAll(".operator-card.tier-six")).toHaveLength(2);
    expect(wrapper.findAll(".operator-card.tier-five")).toHaveLength(1);
    const notify = wrapper.emitted("notify");
    expect(notify).toHaveLength(1);
    expect(notify[0][0]).toContain("六阶");
  });
});
