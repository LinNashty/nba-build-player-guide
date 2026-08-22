import type { Metadata } from "next";
import GuideApp from "./GuideApp";
import careerData from "./data/guide-data.json";
import legendData from "./data/legend-data.json";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "生涯与传奇双模式，三时代队史球员、五位置最优组合、球队三备选、前40榜单与剧情判词。",
};

export default function Home() {
  return <GuideApp careerData={careerData} legendData={legendData} />;
}
