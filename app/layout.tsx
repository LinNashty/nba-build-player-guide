import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nba-build-player-guide.linnashty0207.chatgpt.site"),
  title: "打造我的传奇球星｜全方位攻略",
  description: "基于游戏当前源码整理的中文攻略工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "打造我的传奇球星｜全方位攻略",
    description: "统一队史属性池、最低属性特训、21个传奇起始赛季、五位置择队与管理层引援攻略。",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "打造我的传奇球星｜全方位攻略",
    description: "统一队史属性池、最低属性特训、21个传奇起始赛季、五位置择队与管理层引援攻略。",
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
THESIS: 把新版传奇模式拆成统一夺取池、最低属性特训、自由年代与管理层引援四步，所有推荐只服务累计历史分。
OWN-WORLD: 石墨黑战术台、克制玻璃控制层、荧光绿答案信号、五位置独立色；球队卡以引援时间轴为主，结论先于解释。
STORY: 首屏分清生涯与传奇，锁定位置后先打造球员，再选赛季和球队，最后按五个引援节点守住个人奖项。
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
