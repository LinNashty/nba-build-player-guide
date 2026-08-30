import type { Metadata } from "next";
import GuideApp from "./GuideApp";
import careerSummary from "./data/guide-summary.json";
import legendSummary from "./data/legend-summary.json";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "新版传奇模式统一队史属性池、最低属性特训、21个自由起始赛季、球队择队与管理层引援攻略。",
};

export default function Home() {
  return <GuideApp careerSummary={careerSummary} legendSummary={legendSummary} />;
}
