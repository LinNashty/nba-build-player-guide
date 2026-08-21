import type { Metadata } from "next";
import GuideApp from "./GuideApp";
import guideData from "./data/guide-data.json";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "五位置最优组合、球队速查、属性榜单、剧情选择、奖项与历史地位规则。",
};

export default function Home() {
  return <GuideApp data={guideData} />;
}
