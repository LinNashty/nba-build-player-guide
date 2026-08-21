import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "基于游戏当前源码整理的中文攻略工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "打造我的传奇球星｜全方位攻略",
    description: "五位置最优组合、球队速查、属性榜单与剧情选择。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body data-design-seed="9c585ad6">
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 把 525 人复杂数据压成“先选位置、立即得到答案”的工具；拒绝常见游戏攻略的长表格堆砌。
OWN-WORLD: 石墨黑赛场、磨砂玻璃控制层、荧光绿决策信号、五位置独立色；大标题与高密度数据卡并置。
STORY: 先理解本站是最新源码攻略，再完成位置选择，依次解决建球、随机球队、榜单、剧情和生涯目标。
FIRST VIEWPORT: 漂浮玻璃导航之下是占据大半屏的中文主张、双行动按钮和四项数据证明，首要行动直接进入最优组合。
FORM: 暗色数据战术板，用户已锁定的苹果式克制玻璃方向；种子键 9c585ad6。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
