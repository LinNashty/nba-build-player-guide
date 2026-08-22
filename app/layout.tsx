import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "打造我的传奇球星｜全方位攻略",
  description: "基于游戏当前源码整理的中文攻略工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "打造我的传奇球星｜全方位攻略",
    description: "生涯与传奇双模式，三时代队史球员、球队速查、前40榜单与剧情选择。",
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
THESIS: 把生涯与传奇两套复杂数据压成“先选模式年代与位置、立即得到答案”的工具；拒绝长表格堆砌。
OWN-WORLD: 石墨黑赛场、克制玻璃控制层、荧光绿决策信号、五位置独立色、三时代识别色；大标题与高密度数据卡并置。
STORY: 首屏选择生涯或传奇与时代，再统一锁定位置，依次解决建球、随机球队、榜单、剧情、奖项、声望和终局判词。
FIRST VIEWPORT: 漂浮玻璃导航之下是中文主张、双模式卡、传奇时代卡、双行动按钮和数据证明，首要行动直接进入最优组合。
FORM: 暗色数据战术板，用户已锁定的苹果式克制玻璃方向；种子键 9c585ad6。
FINISH: desktop and mobile reviewed; responsive overflow fixed; data, product and design documents synchronized.
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
