---
name: "打造我的传奇球星全方位攻略"
description: "把复杂球员与源码规则压成可立即执行答案的暗色数据战术板。"
colors:
  graphite-bg: "#080a0e"
  graphite-panel: "#10141b"
  graphite-panel-raised: "#151a23"
  graphite-control: "#0d1117"
  graphite-inset: "#0c1016"
  glass-nav: "rgba(16,20,27,.72)"
  line: "rgba(255,255,255,.09)"
  line-strong: "rgba(255,255,255,.15)"
  text: "#f4f6f8"
  text-muted: "#aab3bf"
  text-dim: "#858f9d"
  decision-lime: "#b9f56a"
  decision-ink: "#11160c"
  data-cyan: "#66d9ef"
  data-amber: "#f6c75b"
  data-violet: "#b39cff"
  position-pg: "#67d8f1"
  position-sg: "#b69cff"
  position-sf: "#8ee6a4"
  position-pf: "#f3b36b"
  position-c: "#ff7b7b"
  grade-a-plus: "#ff6b6b"
  grade-a: "#ff8787"
  grade-a-minus: "#ffa07a"
  grade-b: "#ffd43b"
  grade-c: "#69db7c"
  grade-d: "#74c0fc"
  grade-f: "#868e96"
typography:
  display:
    fontFamily: "SF Pro Display, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(58px, 7.4vw, 106px)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-.075em"
  headline:
    fontFamily: "SF Pro Display, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(36px, 5vw, 58px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-.045em"
  title:
    fontFamily: "SF Pro Display, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "SF Pro Display, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "SF Pro Display, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: ".12em"
  allowedSteps: "8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 34, 36, 38, 44, 50, 58, 74, 106px；密集排行用 8—13px，核心姓名/属性 17—18px，结论与大标题 22px 以上"
rounded:
  data: "7—9px"
  chip: "10—13px"
  control: "13—17px"
  button: "15—17px"
  panel: "18—20px"
  nav: "17—20px"
  card: "21—22px"
  surface: "22—26px"
  pill: "999px"
spacing:
  xs: "5px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.decision-lime}"
    textColor: "{colors.decision-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 22px"
    height: "52px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,.04)"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 22px"
    height: "52px"
  input-search:
    backgroundColor: "#0b0f14"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "54px"
  card-data:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "20px"
  chip-active:
    backgroundColor: "{colors.decision-lime}"
    textColor: "{colors.decision-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "9px 15px"
---

# Design System: 打造我的传奇球星全方位攻略

## Overview

**Creative North Star: "双模式荧光战术台"**

这套界面像一张停在比赛暂停时刻的石墨黑战术板：首屏先把生涯模式与传奇模式清楚分开；基底深而安静，控制层像磨砂玻璃悬在其上，荧光绿只在需要玩家立刻行动或确认正确答案时亮起。视觉表达服务于高密度决策，不用装饰抢夺球员、属性、权重和推荐结论的注意力。

大号、紧缩字距的中文主张与细密数据卡并置，建立“先给结论，再展开依据”的阅读节奏。五个位置各自拥有稳定的识别色；评级继续使用游戏数据提供的字母颜色，二者不互相替代。

**Key Characteristics:**

- 石墨黑场地与逐级抬升的深色表面。
- 克制的磨砂玻璃仅用于持续导航和高价值控制层。
- 荧光绿是动作、选中态和推荐答案的稀缺信号。
- 五位置独立色与游戏评级色构成两套不混用的数据语义。
- 巨型标题、模式卡、紧凑标签与高密度卡片共同承担信息层级。
- 传奇三个年代各用琥珀、紫、蓝识别，但不覆盖位置色或评级色。

## Colors

颜色系统以近黑石墨为连续背景，以低对比白线划分密集模块，再用少量高纯度颜色标记决策、位置与数据语义。

### Primary

- **决策荧光绿：** 用于主行动按钮、选中筛选、推荐答案、编号与正向结论；深色文字覆盖其上，保证明亮底上的清晰度。

### Secondary

- **数据青：** 用于公式与防守类信息提示，不替代全局行动色。
- **数据琥珀：** 用于前三名、历史最佳、奖项和警告语义。
- **数据紫：** 用于奖项卡的辅助光晕，以及得分后卫的位置识别。

### Tertiary

- **位置五色：** 控球后卫为冰青、得分后卫为淡紫、小前锋为薄荷绿、大前锋为暖橙、中锋为珊瑚红。位置色用于分段选择器、位置横幅和与当前位置绑定的边框或光晕。
- **游戏评级色：** A 档由红至橙、B 档为黄、C 档为绿、D 档为蓝、F 为灰。评级色由数据驱动，只呈现数值质量，不表示当前交互是否选中。

### Neutral

- **石墨背景：** 页面最底层与首屏收束背景。
- **石墨面板：** 卡片、榜单与事件容器的常规表面。
- **石墨控制层：** 分段控件、展开条和高密度列表的内层底色。
- **主文字、次文字、弱文字：** 形成三级文本层级；正文解释使用次文字，元数据与辅助标签使用弱文字。
- **幽灵分隔线：** 半透明白线只负责结构，不成为视觉主角；重要悬浮表面使用稍强版本。

**The Green Means Answer Rule.** 荧光绿代表“现在行动、当前选中或这是推荐答案”；普通装饰不占用这一颜色。

**The Two Data Languages Rule.** 位置色回答“你在看哪个位置”，评级色回答“这个值有多好”，绝不互换含义。

## Typography

**Display Font:** SF Pro Display（后备为苹方、冬青黑体、微软雅黑与系统无衬线）  
**Body Font:** SF Pro Display（后备为苹方、冬青黑体、微软雅黑与系统无衬线）  
**Label Font:** 同一无衬线字族

**Character:** 全站使用系统感强的中西文无衬线栈，靠重量、字号、紧缩字距和数字对齐建立层级，而不是引入装饰字体。大标题强硬、压缩，正文清晰克制，标签短促并具战术编号感。

### Hierarchy

- **Display：** 超大、800 字重、近乎贴合的行高与明显负字距；只用于首屏主张。手机端实际收束为 48px、1.04 行高和 -.07em 字距。
- **Headline：** 大号粗体、紧缩字距；用于每个任务区的中文问题式标题。
- **Title：** 约 20–36px 的粗体，随卡片层级变化；属性名、球队名和榜单标题优先短行展示。
- **Body：** 默认 16px、1.6 行高；说明文本常降为 12–15px 并使用次文字色，高密度但保持可读行距。
- **Label：** 9–13px、650–760 字重；用于阶段编号、权重、评级、状态和控制标签，战术编号会增加字距并使用大写或等宽数字表现。

**The Scale Before Ornament Rule.** 信息层级先由字号、字重、字距和颜色明度建立，不以额外字体或渐变字制造层级。

## Layout

页面使用居中的 1180px 最大内容壳层，桌面端两侧至少留 24px；手机端收为视口宽减 28px。桌面首屏约 920px，主体任务区以约 116px 的纵向间隔展开，固定导航、传奇年代切换条与锚点滚动共同支持长页速查；各任务区自行提供位置选择，避免顶部重复占用空间。

桌面端依任务采用三列推荐卡、两列排行榜、三列奖项卡和紧凑球队查询布局。1020px 以下逐步收为两列或单列；760px 以下核心卡片与结果区全部单列，五个位置保持一屏可见，球队按钮压为六列图标网格。手机目录使用底部两列菜单，不依赖横向拖动。

间距以 5、8、12、16、24、32px 为主要节拍。列表行保持 50–76px 的稳定高度，主要按钮与输入分别维持至少 52px 和 54px；手机底部额外预留 76px 给固定导航。

**The Answer First Layout Rule.** 每个任务区先呈现位置或筛选控制与第一答案，再把替补、完整榜单和解释放入后续区域或展开层。

## Elevation & Depth

系统采用“色调分层 + 少量环境阴影”的混合方式。常规卡片主要依靠背景明度和幽灵边框分层；固定导航、快捷导航、粘性玻璃控制层和返回顶部控件才使用深阴影与背景模糊。氛围光晕尺寸大、透明度低，只构成场地空气感，不承担信息含义。

### Shadow Vocabulary

- **环境悬浮：** `0 20px 60px rgba(0,0,0,.32)`；用于快捷导航、玻璃控制层与返回顶部。
- **导航悬浮：** `0 14px 42px rgba(0,0,0,.36)`；用于顶部固定导航。
- **移动底栏：** `0 -12px 40px rgba(0,0,0,.3)`；从底部向上分离固定导航。
- **卡片响应：** `0 18px 50px rgba(0,0,0,.24)`；仅在推荐卡悬停抬升时出现。

**The Glass Is Infrastructure Rule.** 玻璃材质属于持续导航与关键控制基础设施，普通数据卡保持实体石墨表面。

## Shapes

形状语言是苹果式克制圆角：大表面多为 22–24px，导航与控制层约 18–19px，输入与按钮为 14–15px，数据徽记收紧到 8–12px。药丸形只用于来源状态与方法标签；头像使用 24% 圆角形成独立于卡片的柔和方形轮廓。

所有主要容器都有一条低对比边框。结构由圆角矩形、细线和规则网格组成；圆形只用于状态点与低透明氛围光晕，不作为主要按钮形状。

**The Radius Follows Scale Rule.** 容器越大圆角越大，嵌套控件逐级收紧；同层级卡片保持统一轮廓。

## Components

### Buttons

- **Shape:** 主要行动是 15px 圆角、至少 52px 高的实心或幽灵按钮；触控区域宽松，文字粗而直接。
- **Primary:** 决策荧光绿底配深色字，横向内边距 22px，用于进入答案或确认当前筛选。
- **Hover / Active:** 悬停上移 2px，按下缩放至 .98；状态过渡为 200ms ease。减少动态偏好下，过渡会缩短到近乎即时。
- **Secondary:** 4% 白色透明底、幽灵边框与主文字色；与主按钮并排时不争夺第一视觉权重。

### Chips

- **Style:** 属性与标签筛选使用 12px 圆角、9px × 15px 内边距的深色胶囊矩形。
- **State:** 未选中为石墨面板、次文字和幽灵边框；选中后切换为荧光绿底与深色字。方法与来源标签采用完全药丸形，但只做说明，不伪装为可点击控件。

### Cards / Containers

- **Corner Style:** 推荐卡和逻辑卡使用 22px 圆角，主结果、榜单和奖项表面使用 24px 圆角。
- **Background:** 常规卡为石墨面板；内嵌冲突说明、选项与表格行使用更深的石墨内层。
- **Shadow Strategy:** 静止时主要依靠色调和边框；只有可交互推荐卡在悬停时出现轻抬升与阴影。
- **Border:** 默认使用幽灵分隔线，打开、悬停或玻璃表面使用较强线。
- **Internal Padding:** 紧凑卡约 17–20px，主要结果与奖项表面约 24–30px。

### Inputs / Fields

- **Style:** 搜索输入为近黑底、14px 圆角、54px 最小高度和 15px 横向内边距。
- **Focus:** 边框转为半透明荧光绿，并出现 4px、低透明绿色焦点环。
- **Empty Result:** 无匹配时显示带虚线边框的石墨空状态，并给出更换关键词或筛选条件的中文提示。

### Navigation

顶部导航是固定的半透明石墨玻璃条，19px 圆角、22px 模糊并带环境阴影；桌面端显示六个任务锚点，980px 以下收起中间链接。720px 以下额外显示六列底部玻璃导航，顶部保留品牌，右下返回顶部按钮隐藏，避免与底栏冲突。

### Position Selector

位置选择器是系统的签名控件。外层为深色 18px 圆角分段容器；激活段使用当前球场位置的独立颜色、深色文字和同色轻光晕。完整模式同时显示中文位置名和一句策略提示，紧凑模式只保留位置名；手机端允许横向滚动。

### Grade Badge

评级组件把实得数值与字母等级并排显示。字母置于 8px 圆角、同评级色低透明底与描边中；颜色由游戏数据直接提供，数值使用同色强调。该组件不接受位置色或荧光绿覆盖。

### Data Disclosure

13 项主选、三名替补、随机球队三档答案与当前故事线全部默认展示。只有“查找其他队内球员”和榜单 21—40 使用按需展开，避免页面被低频内容淹没。

## Do's and Don'ts

### Do:

- **Do** 先放位置或筛选控制与第一推荐，再展示替补、全榜和推导说明。
- **Do** 用荧光绿标记动作、选中态和推荐结论，并让普通说明保持中性。
- **Do** 严格保持五位置色与游戏评级色各自的语义边界。
- **Do** 在手机端把多列数据收为单列，并让高选项量控件横向滚动或压成图标网格。
- **Do** 保留 52px 以上主要按钮、54px 输入以及减少动态效果适配。

### Don't:

- **Don't** 把荧光绿铺成大面积装饰背景；它的稀缺性就是决策效率。
- **Don't** 给每张数据卡都加玻璃、重阴影或持续发光；普通卡片依靠石墨层级与细边框。
- **Don't** 用位置色表达评级高低，也不要用评级色表达当前所选位置。
- **Don't** 在窄屏强行保留桌面多列或固定宽表格。
- **Don't** 发明新的评级颜色、替换数据源颜色，或把随机新秀混入确定性排行的视觉语义。
