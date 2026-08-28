import type { Metadata } from "next";
import GuideApp from "./GuideApp";
import careerSummary from "./data/guide-summary.json";
import legendSummary from "./data/legend-summary.json";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "新版传奇模式统一队史属性池、21个自由起始赛季、五位置择队模型、历史分公式与实时榜单。",
};

export default function Home() {
  return <GuideApp careerSummary={careerSummary} legendSummary={legendSummary} />;
}
