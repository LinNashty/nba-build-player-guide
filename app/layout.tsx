import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nba-build-player-guide.linnashty0207.chatgpt.site"),
  title: "打造我的传奇球星｜全方位攻略",
  description: "基于游戏当前源码整理的中文攻略工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "打造我的传奇球星｜全方位攻略",
    description: "统一队史属性池、21个传奇起始赛季、五位置球队推荐、历史分公式与实时榜单。",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "打造我的传奇球星｜全方位攻略",
    description: "统一队史属性池、21个传奇起始赛季、五位置球队推荐、历史分公式与实时榜单。",
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
THESIS: 把新版传奇模式拆成统一夺取池与21个真实生涯环境，拒绝继续用旧三年代筛选制造混淆。
OWN-WORLD: 石墨黑战术台、克制玻璃控制层、荧光绿答案信号、五位置独立色；完整球队模型保持高密度但一眼可扫。
STORY: 首屏分清生涯与传奇，锁定位置后先打造球员，再选赛季和球队，最后用历史分公式与实时榜单校准目标。
FIRST VIEWPORT: 固定导航内直接切五位置；双模式卡下用一条更新链解释统一属性池、自由赛季与真实阵容。
FORM: 既有暗色数据战术板的完整扩展；种子键 9c585ad6。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
