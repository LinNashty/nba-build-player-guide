"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
const LEGEND_SEASONS = Array.from({ length: 21 }, (_, index) => {
  const year = 1995 + index;
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
});
const POSITION_NAMES: Record<string, string> = { PG: "控球后卫", SG: "得分后卫", SF: "小前锋", PF: "大前锋", C: "中锋" };
const POSITION_HINTS: Record<string, string> = {
  PG: "控场优先：护球、传球、外防", SG: "火力优先：三分、中投、关键", SF: "全能优先：攻防均衡与运动", PF: "锋线支点：终结、内防、篮板", C: "禁区核心：终结、护筐、篮板",
};
const ROUTES = ["实战最优", "声望最优", "传奇判词最优"];
const NAV = [
  ["概览", "#overview"], ["最优组合", "#optimal"], ["球队速查", "#team"], ["属性榜", "#rankings"],
  ["赛季择队", "#season-guide"], ["剧情路线", "#story"], ["奖项公式", "#awards"], ["最高历史分", "#legacy-score"],
  ["实时榜单", "#live-board"], ["形象声望", "#profile"], ["历史判词", "#legacy"], ["称号档案", "#titles"], ["数据说明", "#data"],
];
const BRANCH_LABELS: Record<string, string> = {
  draft_night: "选秀前置", china_team: "中国男篮", relationship: "恋爱线", network: "人脉线",
  superstar_recruit: "巨星招募", training: "夏日训练", team_practice: "球队合练", teammate_bond: "队友关系",
  transfer: "转会风波", rich_paul: "经纪团队", family: "家庭生活", family_children: "家人与孩子", mental_health: "心理健康",
  city_culture: "城市文化", reading: "读书成长", china_market: "中国市场", media: "媒体关系", fan_culture: "球迷文化",
  brand: "品牌商业", crossover: "跨界演出", training_camp: "个人训练营", charity: "公益事业", violence_conflict: "冲突停赛",
  retirement_countdown: "退役倒计时", post_career: "退役之后", mentor: "巨星训练营", skill_training: "专项突破",
};
const BRANCH_GROUPS = [
  { name: "生涯起点", branches: ["draft_night"] },
  { name: "篮球主线", branches: ["china_team", "training", "mentor", "skill_training", "team_practice", "teammate_bond", "transfer", "superstar_recruit", "rich_paul"] },
  { name: "关系生活", branches: ["relationship", "family", "family_children", "mental_health", "city_culture", "reading"] },
  { name: "商业公众", branches: ["china_market", "media", "fan_culture", "brand", "crossover", "training_camp", "charity", "violence_conflict", "network"] },
  { name: "生涯后期", branches: ["retirement_countdown", "post_career"] },
];
const TAG_LABELS: Record<string, string> = {
  champion: "总冠军", dynasty: "三冠王朝", mvp: "最有价值球员", fmvp: "总决赛最有价值球员", defense: "最佳防守球员",
  allstar: "全明星", scorer: "场均得分 25+", playmaker: "场均助攻 7+", big: "场均篮板 10+", longevity: "生涯 12 季+",
  one_city: "终身一队", multi: "效力 3 队+", clutch: "关键 80+", leader: "领袖 60+", camp: "训练营标签", legacy: "历史百大+",
};
const DRAFT_EVENTS = [
  { id: "draft-entry", title: "选秀前夜", phase: "生涯开始", body: "先决定让联盟记住你的哪一面。这里主要写入人物档案，不直接增加 13 项建球属性。", choices: [
    { label: "仔细看球探报告", hint: "更清楚自己的定位", effects: ["媒体好感+1"] },
    { label: "关掉手机睡觉", hint: "让身体先休息", effects: ["状态波动-1"] },
  ] },
  { id: "draft-agent", title: "经纪团队", phase: "生涯开始", body: "大牌公司、中型团队或亲友团队，会改变商业曝光、教练关系与忠诚路线。", choices: [
    { label: "大牌经纪公司", hint: "商业曝光上限最高", effects: ["人气+2", "商业价值+1", "媒体压力+1"] },
    { label: "中型团队", hint: "竞技路线最稳", effects: ["教练信任+1"] },
    { label: "家人朋友团队", hint: "适合一人一城", effects: ["忠诚+2", "商业价值-1"] },
  ] },
  { id: "draft-workout", title: "试训策略", phase: "选秀前", body: "联合试训抬高顺位上限，单独试训最稳，不试训会直接拖累顺位。", choices: [
    { label: "参加联合试训", hint: "上限高，有受伤风险", effects: ["顺位修正 0～+3", "受伤时状态波动+1"] },
    { label: "只参加单独试训", hint: "稳妥推荐", effects: ["45% 概率顺位+1", "教练信任+1"] },
    { label: "不试训", hint: "除特殊路线外不推荐", effects: ["顺位修正-2～-5", "争议+1", "媒体好感-1"] },
  ] },
  { id: "draft-result", title: "选秀顺位判定", phase: "选秀夜", body: "最终综合评分叠加试训修正后决定顺位。", choices: [
    { label: "综合评分 88+", hint: "首轮第 1～5 顺位", effects: ["4 年合同"] },
    { label: "综合评分 84～87", hint: "首轮第 6～14 顺位", effects: ["4 年合同"] },
    { label: "综合评分 78～83", hint: "首轮第 15～30 顺位", effects: ["3～4 年合同"] },
    { label: "综合评分 70～77", hint: "次轮第 31～45 顺位", effects: ["2 年合同"] },
    { label: "综合评分低于 70", hint: "落选", effects: ["1 年起步合同"] },
  ] },
];

type Position = (typeof POSITIONS)[number];
type Mode = "career" | "legend";

function cnDate(value: string) {
  const [year, month, day] = String(value).split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

function identityOf(player: any) {
  return player.identity || String(player.cname || player.name || player.id).replace(/[\s·\-._]/g, "").toLowerCase();
}

function gradeFor(value: number, data: any) {
  return data.rules.grades.find((item: any) => value >= item.min) || data.rules.grades[data.rules.grades.length - 1];
}

function adjustedPlayer(player: any, position: Position, attr: string, context: any) {
  const source = player.sourcePosition || String(player.pos || "SF").split("/")[0].trim();
  const sourceAverage = context.positions[source]?.averages?.[attr] || 1;
  const targetAverage = context.positions[position]?.averages?.[attr] || sourceAverage;
  const normal = Math.min(1, targetAverage / sourceAverage);
  const penalty = context.mode === "legend" ? 1 - (1 - normal) * 0.3 : normal;
  const value = Math.round(Number(player.raw[attr] || 0) * penalty);
  return { ...player, playerId: player.id, identity: identityOf(player), attr, attrCN: context.attrCN[attr], value, penalty, grade: gradeFor(value, context) };
}

function addRanks(rows: any[]) {
  let previous = -1;
  let rank = 0;
  return rows.map((row, index) => {
    if (row.value !== previous) { rank = index + 1; previous = row.value; }
    return { ...row, rank };
  });
}

function Grade({ grade, value }: { grade: any; value?: number }) {
  const label = value == null ? `评级 ${grade.letter}` : `评级 ${grade.letter}，数值 ${value}`;
  return <span className="grade" style={{ "--grade": grade.color } as React.CSSProperties} aria-label={label}><em>{grade.letter}</em>{value != null && <strong>{value}</strong>}</span>;
}

function TeamMark({ team, name, large = false }: { team: string; name?: string; large?: boolean }) {
  return <span className={`team-mark ${large ? "large" : ""}`}><img src={`/teams/${team}.png`} alt={name || team} /></span>;
}

function PlayerLine({ player, context, rank, compact = false }: { player: any; context: any; rank?: number; compact?: boolean }) {
  return <div className={`player-line ${compact ? "compact" : ""}`}>{rank != null && <span className={`rank rank-${rank}`}>{rank}</span>}<TeamMark team={player.team} name={context.teamNames[player.team]} /><span className="player-name"><strong>{player.cname}</strong><small>{context.teamNames[player.team]} · {player.pos}</small></span><Grade grade={player.grade} value={player.value} /></div>;
}

function SectionHeading({ index, title, text, aside }: { index: string; title: string; text: string; aside?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="section-index">{index}</span><h2>{title}</h2><p>{text}</p></div>{aside && <div className="heading-aside">{aside}</div>}</div>;
}

function PositionTabs({ value, onChange, compact = false }: { value: Position; onChange: (value: Position) => void; compact?: boolean }) {
  return <div className={`position-tabs ${compact ? "compact" : ""}`}>{POSITIONS.map((position) => <button key={position} data-pos={position} className={value === position ? "active" : ""} onClick={() => onChange(position)} aria-pressed={value === position}><b>{position}</b><span>{POSITION_NAMES[position]}</span>{!compact && <small>{POSITION_HINTS[position]}</small>}</button>)}</div>;
}

function HeroCurrent({ mode, setMode, careerSummary, legendSummary }: any) {
  const isLegend = mode === "legend";
  return <header id="top" className="hero hero-current">
    <div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><div className="hero-grid" aria-hidden="true" />
    <div className="shell hero-inner">
      <div className="source-pill">最新核验 · {cnDate(legendSummary.meta.extractedAt)}</div>
      <h1>{isLegend ? <>选对属性，也要选对<br /><span>你的整个时代。</span></> : <>每一项属性，都选对<br /><span>那一个人。</span></>}</h1>
      <p className="hero-copy">{isLegend ? "先用统一队史池打造球员，再从 21 个起始赛季中找到最容易冲高历史分的球队。" : "先锁定球场位置，再查现役球员的实得值、无冲突组合、球队备选和剧情加点。"}</p>
      <div className="mode-selector" aria-label="选择游戏模式">
        <button className={mode === "career" ? "active career" : "career"} onClick={() => setMode("career")}>
          <span>生涯模式</span><strong>{careerSummary.meta.playerCount} 名现役球员</strong><p>当前阵容 · 普通跨位置衰减</p>
        </button>
        <button className={isLegend ? "active legend" : "legend"} onClick={() => setMode("legend")}>
          <span>新版传奇模式</span><strong>统一队史池 · 自选年代</strong><p>30 队历史阵容夺属性，1995-96 至 2015-16 开生涯</p>
        </button>
      </div>
      {isLegend && <div className="legend-update-strip"><b>这次更新最关键的变化</b><span>夺属性不再分三个年代</span><i>→</i><span>建完球后再选起始赛季</span><i>→</i><span>赛季真实阵容决定争冠与奖项环境</span></div>}
      <div className="hero-actions"><a className="button primary" href={isLegend ? "#season-guide" : "#optimal"}>{isLegend ? "查看赛季择队" : "查看最优组合"}</a><a className="button ghost" href="#rankings">查看属性榜</a></div>
      <div className="hero-proof">
        <div><strong>{isLegend ? legendSummary.meta.playerCount : careerSummary.meta.playerCount}</strong><span>{isLegend ? "统一队史候选" : "现役确定性球员"}</span></div>
        <div><strong>{isLegend ? "21" : "5 × 13"}</strong><span>{isLegend ? "自由起始赛季" : "位置属性榜"}</span></div>
        <div><strong>1—40</strong><span>完整属性排行</span></div>
        <div><strong>{isLegend ? "3150" : careerSummary.eventCounts.staged}</strong><span>{isLegend ? "赛季球队模型卡" : "条分阶段剧情"}</span></div>
      </div>
    </div>
  </header>;
}

function DataLoading({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <section className="data-loading shell" aria-live="polite"><div className="loading-copy"><span>{error ? "数据加载遇到问题" : "首屏已就绪"}</span><h2>{error ? "攻略数据暂时没有载入" : "正在载入完整攻略"}</h2><p>{error || "球员库与榜单正在后台加载，不影响模式和年代选择。"}</p>{error && <button onClick={onRetry}>重新加载</button>}</div><div className="loading-bars" aria-hidden="true"><i /><i /><i /></div></section>;
}

function LegendOverviewCurrent({ legendData }: any) {
  const facts = [
    ["01", "先用统一队史池夺属性", `所有开局都从同一套 30 队、${legendData.meta.playerCount} 名队史候选中选人，起始赛季不会改变球员数值。`],
    ["02", "建球后再抽起始赛季", "可用范围是 1995-96 至 2015-16。随机可以覆盖全部 21 季；看视频自选时，每次从随机出现的 9 季里选 1 季。"],
    ["03", "赛季决定真实阵容", "选定年代后，球队名单、同位置竞争、联盟强弱和奖项对手全部切到该赛季。"],
    ["04", "跨位置衰减仍然更轻", "传奇模式只承受普通模式 30% 的跨位置损失；大个子给后卫拿篮板、力量依然更香。"],
  ];
  return <section id="overview" className="section shell overview-section">
    <SectionHeading index="00" title="新版传奇模式，一分钟看懂" text="一句话：夺属性看统一队史池，跑生涯看你抽到的真实赛季。两件事已经完全分开。" aside={<span className="verified-chip">游戏公式 · 最新版本</span>} />
    <div className="fact-grid current-facts">{facts.map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <div className="version-diff"><strong>旧版</strong><span>1984／1996／2003 分别限制可出现球队</span><i>现在</i><span>30 队统一属性池，21 个赛季只负责生涯环境</span></div>
    <div className="example-strip"><span>核验例子</span><p><b>控卫 · 扣篮：</b>史蒂夫·弗朗西斯 96，统一池第 1</p><p><b>控卫 · 篮板：</b>步行者乔治·麦金尼斯 90，并列第 12</p></div>
  </section>;
}

function CareerOverview({ careerData }: any) {
  return <section id="overview" className="section shell overview-section"><SectionHeading index="00" title="生涯模式先记住三件事" text="现役球员库、普通跨位置衰减、同一人整局只能用一次。本站显示的都是你选定位置后的实得值。" aside={<span className="verified-chip">当前快照 {careerData.meta.playerCount} 人</span>} /><div className="fact-grid career-facts"><article><span>01</span><h3>先锁定位置</h3><p>同一名球员切到不同位置，实得属性会不同，先选位置再查榜。</p></article><article><span>02</span><h3>最高不等于最优组合</h3><p>单项最高者可能更该留给另一项；无冲突组合会做全局分配。</p></article><article><span>03</span><h3>随机球队看三备选</h3><p>第一人已用掉就点排除，13 项会同时重算第 2、第 3 选择。</p></article></div></section>;
}

function OptimalSection({ context, position, setPosition }: any) {
  const picks = useMemo(() => context.attrs.map((attr: string) => context.optimal[position].find((item: any) => item.attr === attr)), [context, position]);
  return <section id="optimal" className="section shell"><SectionHeading index="01" title="无冲突最优组合" text="严格按游戏 13 项属性顺序排列。主选与 3 名替补全部直接展示，不需要一张张点开。" aside={<span className="method-chip">全局匹配 · 同名只用一次</span>} /><PositionTabs value={position} onChange={setPosition} /><div className="position-summary" data-pos={position}><div><span>当前位置</span><strong>{POSITION_NAMES[position]}</strong><p>{POSITION_HINTS[position]}</p></div><div>{[...picks].sort((a: any, b: any) => b.weight - a.weight).slice(0, 3).map((item: any) => <span key={item.attr}><small>高权重</small><b>{item.attrCN} {Math.round(item.weight * 100)}%</b></span>)}</div></div><div className="optimal-grid">{picks.map((pick: any, index: number) => { const isAbsolute = identityOf(pick.selected) === identityOf(pick.absoluteBest); return <article className="pick-card" key={pick.attr}><div className="pick-heading"><span className="pick-number">{String(index + 1).padStart(2, "0")}</span><div className="pick-title"><h3>{pick.attrCN}</h3><strong>{pick.selected.cname}</strong></div><Grade grade={pick.selected.grade} value={pick.selected.value} /></div><div className="pick-meta"><span><TeamMark team={pick.selected.team} />{context.teamNames[pick.selected.team]} · {pick.selected.pos}</span><b>{Math.round(pick.weight * 100)}% 位置权重</b></div><div className={isAbsolute ? "best-note" : "conflict-note"}>{isAbsolute ? <><span>单项最高与组合答案一致</span></> : <><span>单项最高</span><strong>{pick.absoluteBest.cname}</strong><Grade grade={pick.absoluteBest.grade} value={pick.absoluteBest.value} /><small>最高者被留给贡献更大的属性</small></>}</div><div className="alternatives"><span>三名替补</span>{pick.alternatives.map((player: any, altIndex: number) => <div key={`${player.playerId}-${altIndex}`}><b>{altIndex + 1}</b><PlayerLine player={player} context={context} compact /></div>)}</div></article>; })}</div></section>;
}

function TeamSection({ context, position, setPosition, team, setTeam }: any) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const roster = useMemo(() => context.players.filter((player: any) => player.team === team), [context, team]);
  const choices = useMemo(() => context.attrs.map((attr: string) => {
    const rows = roster.filter((player: any) => !excluded.includes(identityOf(player))).map((player: any) => adjustedPlayer(player, position, attr, context));
    rows.sort((a: any, b: any) => b.value - a.value || Number(b.raw[attr]) - Number(a.raw[attr]));
    return { attr, rows: rows.slice(0, 3), leader: context.rankings[position][attr]?.[0] };
  }), [context, excluded, position, roster]);
  const topFive = useMemo(() => roster.map((player: any) => {
    const score = context.attrs.reduce((sum: number, attr: string) => sum + adjustedPlayer(player, position, attr, context).value * context.positions[position].weights[attr], 0);
    return { ...player, fitScore: Math.round(score), identity: identityOf(player) };
  }).sort((a: any, b: any) => b.fitScore - a.fitScore || b.ovr - a.ovr).slice(0, 5), [context, position, roster]);
  const otherPlayers = useMemo(() => roster.filter((player: any) => `${player.cname}${player.name}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a: any, b: any) => b.ovr - a.ovr), [query, roster]);
  function toggle(identity: string) { setExcluded((current) => current.includes(identity) ? current.filter((item) => item !== identity) : [...current, identity]); }
  function selectTeam(code: string) { setTeam(code); setExcluded([]); setQuery(""); }
  return <section id="team" className="section shell"><SectionHeading index="02" title="随机到这支队，每项选谁？" text="13 项每项同时给第一、第二、第三选择。点队内前 5 或查找其他球员即可多选排除，全部答案即时重算。" /><div className={`team-control-bar ${context.mode === "career" ? "career-top" : ""}`}><PositionTabs value={position} onChange={setPosition} compact /><div className="current-team"><TeamMark team={team} name={context.teamNames[team]} large /><div><strong>{context.teamNames[team]}</strong><span>{context.mode === "legend" ? "统一队史属性池" : "生涯模式"} · 已排除 {excluded.length} 人</span></div></div></div><div className="team-picker">{context.teams.map((code: string) => <button key={code} className={team === code ? "active" : ""} onClick={() => selectTeam(code)} title={context.teamNames[code]}><img src={`/teams/${code}.png`} alt="" /><span>{context.teamNames[code]}</span></button>)}</div><div className="team-result"><div className="team-result-title"><div><span>队内位置适配前 5</span><h3>先排除已经用过的人</h3><p>位置适配分按当前 13 项实得值与位置权重综合计算，不是游戏总评。</p></div>{excluded.length > 0 && <button onClick={() => setExcluded([])}>清空排除</button>}</div><div className="fit-five">{topFive.map((player: any) => { const active = excluded.includes(player.identity); return <button key={player.id} className={active ? "excluded" : ""} onClick={() => toggle(player.identity)} aria-pressed={active}><TeamMark team={player.team} /><span><strong>{player.cname}</strong><small>{player.pos}</small></span><b>{player.fitScore}</b><em>{active ? "已排除" : "点选排除"}</em></button>; })}</div><div className="attribute-choice-grid">{choices.map(({ attr, rows, leader }: any, index: number) => <article className="attribute-choice" key={attr}><header><div className="attribute-label"><span>{String(index + 1).padStart(2, "0")}</span><h3>{context.attrCN[attr]}</h3></div>{leader && <div className="attribute-best"><small>{context.mode === "legend" ? "统一池最高" : "本模式最高"}</small><strong>{leader.cname}</strong><b>{leader.value}</b></div>}</header><div>{rows.length ? rows.map((player: any, rowIndex: number) => <div className={rowIndex === 0 ? "choice-primary" : ""} key={`${player.playerId}-${rowIndex}`}><span className="choice-rank">{rowIndex + 1}</span><strong>{player.cname}</strong><small>{player.pos}</small><Grade grade={player.grade} value={player.value} /></div>) : <p className="empty">暂无可用球员</p>}</div></article>)}</div><details className="other-player-search"><summary>查找并排除其他球员 <span>队内共 {roster.length} 人</span></summary><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入球员姓名" /><div className="roster-list">{otherPlayers.map((player: any) => { const identity = identityOf(player); const active = excluded.includes(identity); return <button key={player.id} className={active ? "excluded" : ""} onClick={() => toggle(identity)}><span>{player.pos}</span><strong>{player.cname}</strong><em>{active ? "恢复" : "排除"}</em></button>; })}</div></div></details></div></section>;
}

function RankingsSection({ context, position, setPosition }: any) {
  const [attr, setAttr] = useState("threePT");
  const [expanded, setExpanded] = useState(false);
  const ranked = useMemo(() => addRanks((context.rankings[position][attr] || []).slice(0, 40)), [attr, context, position]);
  const visible = expanded ? ranked : ranked.slice(0, 20);
  return <section id="rankings" className="section shell"><SectionHeading index="03" title="每个位置、每项属性前 40" text="默认显示前 20；展开后直接显示完整 1—40。相同实得值使用并列排名，不把同分球员强行拆开。" aside={<span className="method-chip">评级颜色与游戏同步</span>} /><PositionTabs value={position} onChange={setPosition} compact /><div className="attr-tabs">{context.attrs.map((key: string) => <button key={key} className={attr === key ? "active" : ""} onClick={() => { setAttr(key); setExpanded(false); }}>{context.attrCN[key]}</button>)}</div><div className="ranking-panel"><header><div><span>{context.mode === "legend" ? "统一队史属性池 · " : ""}{POSITION_NAMES[position]}</span><h3>{context.attrCN[attr]}榜</h3><p>{context.attrDesc[attr]}</p></div>{ranked[0] && <div className="ranking-leader"><TeamMark team={ranked[0].team} large /><span><small>全榜最高</small><strong>{ranked[0].cname}</strong></span><Grade grade={ranked[0].grade} value={ranked[0].value} /></div>}</header><div className="ranking-columns">{visible.map((player: any, index: number) => <div className={index < 10 ? "featured" : ""} key={`${player.playerId}-${index}`}><PlayerLine player={player} context={context} rank={player.rank} /></div>)}</div><button className="ranking-expand" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起至前 20" : "展开完整 1—40"}<span>{expanded ? "↑" : "↓"}</span></button></div><div className="formula-card"><span>{context.mode === "legend" ? "传奇模式衰减" : "生涯模式衰减"}</span><strong>{context.mode === "legend" ? "传奇系数 = 1 −（1 − 普通系数）× 30%" : "普通系数 = 较小值〔1，目标位置均值 ÷ 来源位置均值〕"}</strong><p>实得值最后统一四舍五入。{context.mode === "legend" ? "所以传奇跨位置损失明显更小。" : "只衰减，不会跨位置增益。"}</p></div></section>;
}

function scoreChoice(choice: any, position: Position, context: any, route: string) {
  const text = [...(choice.effects || []), choice.hint || ""].join(" ");
  let score = 0;
  Object.entries(context.attrCN).forEach(([key, label]) => { const match = text.match(new RegExp(`${label}\\+(\\d+)`)); if (match) score += Number(match[1]) * (context.positions[position].weights[key] || 0.04) * (route === "实战最优" ? 130 : 45); });
  if (route === "实战最优") { if (/球队默契|教练信任|状态波动-/.test(text)) score += 18; if (/伤病.*上升|状态波动\+/.test(text)) score -= 12; }
  if (route === "声望最优") { if (/商业|人气|媒体好感|球迷|教练信任|更衣室/.test(text)) score += 18; if (/争议.*\+/.test(text)) score -= 5; }
  if (route === "传奇判词最优") { if (/历史|传奇剧情分数|王朝|城市羁绊|个人传奇|技艺路线|全国偶像|生涯照护/.test(text)) score += 22; }
  return score;
}

function recommendationLabels(choices: any[], position: Position, context: any) {
  const winners: Record<string, number> = {};
  ROUTES.forEach((route) => {
    let bestIndex = 0;
    let bestScore = -Infinity;
    choices.forEach((choice, index) => { const score = scoreChoice(choice, position, context, route); if (score > bestScore) { bestIndex = index; bestScore = score; } });
    winners[route] = bestIndex;
  });
  return choices.map((_, index) => {
    const labels = ROUTES.filter((route) => winners[route] === index);
    return labels.length === ROUTES.length ? ["综合最优"] : labels;
  });
}

function StorySection({ context, careerData, position, setPosition }: any) {
  const [route, setRoute] = useState(ROUTES[0]);
  const [branch, setBranch] = useState("draft_night");
  const [query, setQuery] = useState("");
  const byBranch = useMemo(() => {
    const map: Record<string, any[]> = { draft_night: DRAFT_EVENTS };
    careerData.events.staged.forEach((event: any) => { if (!map[event.branch]) map[event.branch] = []; map[event.branch].push(event); });
    // 新版传奇模式的起始赛季不再对应旧1984/1996/2003专属事件包。
    return map;
  }, [careerData]);
  const availableGroups = BRANCH_GROUPS.map((group) => ({ ...group, branches: group.branches.filter((key) => byBranch[key]?.length) })).filter((group) => group.branches.length);
  const normalizedQuery = query.trim().toLowerCase();
  const matchedGroups = availableGroups.map((group) => ({ ...group, branches: group.branches.filter((key) => !normalizedQuery || `${BRANCH_LABELS[key]} ${byBranch[key].map((event) => `${event.title}${event.body}`).join(" ")}`.toLowerCase().includes(normalizedQuery)) })).filter((group) => group.branches.length);
  const events = byBranch[branch] || [];
  return <section id="story" className="section shell"><SectionHeading index="05" title="剧情事件怎么选" text="按故事线而不是随机事件堆叠。每条线从入口到后续阶段一次展开，并分别标出实战、声望和传奇判词的推荐。" aside={<span className="method-chip">精确增减来自当前代码</span>} /><div className="story-toolbar"><div><span className="toolbar-label">我的位置</span><PositionTabs value={position} onChange={setPosition} compact /></div><div><span className="toolbar-label">优先看哪条答案</span><div className="route-tabs">{ROUTES.map((value) => <button key={value} className={route === value ? "active" : ""} onClick={() => setRoute(value)}>{value}</button>)}</div></div><div><label htmlFor="story-search">查找剧情</label><input id="story-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="中国男篮、恋爱、商业……" /></div></div><div className="story-directory">{matchedGroups.map((group) => <div key={group.name}><span>{group.name}</span><div>{group.branches.map((key) => <button key={key} className={branch === key ? "active" : ""} onClick={() => setBranch(key)}><strong>{BRANCH_LABELS[key]}</strong><small>{byBranch[key].length} 个阶段</small></button>)}</div></div>)}</div><div className="story-line-head"><div><span>当前完整路线</span><h3>{BRANCH_LABELS[branch]}</h3></div><p>开头不进入这条线，后续节点通常不会再单独跳出来。推荐连线只代表当前目标下的稳妥答案。</p></div><div className="event-flow">{events.map((event: any, eventIndex: number) => { const labels = recommendationLabels(event.choices || [], position, context); return <article className="flow-stage" key={event.id}><div className="flow-rail"><span>{String(eventIndex + 1).padStart(2, "0")}</span><i /></div><div className="event-card"><header><div><small>{event.family || event.phase || "生涯事件"}</small><h3>{event.title}</h3></div><span>{eventIndex === 0 ? "路线入口" : "前置达成后"}</span></header><p className="event-copy">{event.body}</p><div className="choice-list">{(event.choices || []).map((choice: any, choiceIndex: number) => { const tags = labels[choiceIndex]; const focused = tags.includes(route) || tags.includes("综合最优"); return <div className={`story-choice ${focused ? "focused" : ""}`} key={`${event.id}-${choiceIndex}`}><div className="choice-badges">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div><h4>{choice.label}</h4><p>{choice.hint || "推进当前剧情线"}</p><div className="effect-tags">{(choice.effects || []).map((effect: string, index: number) => <span key={index}>{effect.replace("legacyBonus", "历史加成").replace("fanSupport", "球迷支持")}</span>)}</div>{choice.invalid?.length > 0 && <small className="invalid">注意：{choice.invalid.join("；")}</small>}</div></div>; })}</div></div></article>; })}</div>{!events.length && <div className="empty-state">当前筛选没有匹配剧情，请换一个关键词。</div>}<div className="story-warning"><strong>先分清两类加点</strong><p><b>三分、中投、终结等 13 项：</b>直接影响你的赛场能力、数据和综合评分。</p><p><b>商业、媒体、教练、球迷、争议与传奇剧情分：</b>主要影响后续事件、形象声望、稳定性、称号和终局判词，不会直接改造你刚夺取的原始属性。</p></div></section>;
}

function SourceBadge({ kind }: { kind: "游戏公式" | "模型估算" | "实时数据" }) {
  return <span className={`source-badge source-${kind}`}>{kind}</span>;
}

function SeasonTeamCard({ item, position }: { item: any; position: Position }) {
  const powerLabels: Record<string, string> = { offense: "进攻", defense: "防守", athletic: "运动", clutch: "关键", depth: "深度" };
  const risk = item.positionRival && item.positionRival.ovr >= 92
    ? `同位置有 ${item.positionRival.name}（${item.positionRival.ovr}），首发与球权竞争更明显。`
    : item.mvpDifficulty === "极难"
      ? `联盟最强MVP对手是${item.mvpRival}，更适合先冲冠军与最佳阵容。`
      : `阵容没有致命位置冲突，但后续交易、伤病与成长仍会改变结果。`;
  const reason = `${item.isUserStarter ? "约97综评可直接进入首发" : "约97综评仍可能从第六人起步"}；模型胜率提升 ${item.winGain >= 0 ? "+" : ""}${item.winGain}%，预计${item.seed <= 8 ? `分区第 ${item.seed}` : "处于季后赛边缘"}。`;
  return <article className="season-team-card">
    <header>
      <span className={`team-rank rank-${item.rank}`}>{item.rank}</span>
      <TeamMark team={item.team} name={item.teamName} large />
      <div><h3>{item.teamName}</h3><p>{POSITION_NAMES[position]} · {item.isUserStarter ? "预计首发" : "预计第六人"}</p></div>
      <div className="legacy-projection"><small>预计生涯历史分</small><strong>{item.projectedLegacy.mid}</strong><span>{item.projectedLegacy.low}—{item.projectedLegacy.high}</span></div>
    </header>
    <div className="recommend-tags">{item.tags.map((tag: string) => <span key={tag}>{tag}</span>)}<SourceBadge kind="模型估算" /></div>
    <div className="season-metrics">
      <div><span>常规赛胜率</span><strong>{item.winPct}%</strong><small>提升 {item.winGain >= 0 ? "+" : ""}{item.winGain}%</small></div>
      <div><span>季后赛概率</span><strong>{item.playoffPct}%</strong><small>预计分区第 {item.seed}</small></div>
      <div><span>夺冠率</span><strong>{item.titlePct}%</strong><small>七场系列赛模型</small></div>
      <div><span>MVP概率</span><strong>{item.mvpPct}%</strong><small>{item.mvpDifficulty}</small></div>
      <div><span>FMVP主导率</span><strong>{item.fmvpPct}%</strong><small>{item.fmvpDifficulty}</small></div>
      <div><span>DPOY概率</span><strong>{item.dpoyPct}%</strong><small>{item.dpoyDifficulty}</small></div>
    </div>
    <div className="team-model-detail">
      <div className="power-list">{Object.entries(item.power).map(([key, value]: any) => <div key={key}><span>{powerLabels[key]}</span><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i><strong>{value}</strong></div>)}</div>
      <div className="competition-score"><SourceBadge kind="游戏公式" /><span>MVP竞争分</span><strong>{item.mvpScore}</strong><small>比当前最强对手 {item.mvpGap >= 0 ? "+" : ""}{item.mvpGap}</small><p>{item.mvpRival}</p></div>
    </div>
    <div className="rotation-list"><h4>加入你之后的首发与核心轮换</h4>{item.lineup.map((player: any, index: number) => <div className={player.isUser ? "is-user" : ""} key={`${player.name}-${index}`}><span>{player.role}</span><strong>{player.name}</strong><small>{player.position} · {player.ovr}</small>{player.positionCompetition && <em>位置竞争</em>}</div>)}</div>
    <div className="team-verdict"><p><b>为什么选：</b>{reason}</p><p><b>主要风险：</b>{risk}</p></div>
  </article>;
}

function LegendSeasonGuide({ position }: { position: Position }) {
  const [model, setModel] = useState<any>(null);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("2003-04");
  const [showAll, setShowAll] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/season-model.json", { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("赛季模型暂时没有载入");
      return response.json();
    }).then(setModel).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "赛季模型暂时没有载入"); });
    return () => controller.abort();
  }, []);
  const seasonIndex = LEGEND_SEASONS.indexOf(season);
  const rows = model?.data?.[season]?.positions?.[position] || [];
  const visible = showAll ? rows : rows.slice(0, 5);
  const selectSeason = (value: string) => { setSeason(value); setShowAll(false); setPickerOpen(false); };
  return <section id="season-guide" className="section shell season-guide-section">
    <SectionHeading index="04" title="这个年代，去哪个队最容易冲高历史分？" text="先选位置，再选起始赛季。每支球队都按约97综评、符合该位置真实属性结构的自建球员重新排首发并计算。" aside={<SourceBadge kind="模型估算" />} />
    <div className="season-control-panel">
      <div className="season-current"><button disabled={seasonIndex <= 0} onClick={() => selectSeason(LEGEND_SEASONS[seasonIndex - 1])}>上一赛季</button><div><span>当前起始赛季</span><strong>{season}</strong><small>{POSITION_NAMES[position]} · 优先按预计生涯总历史分排序</small></div><button disabled={seasonIndex >= LEGEND_SEASONS.length - 1} onClick={() => selectSeason(LEGEND_SEASONS[seasonIndex + 1])}>下一赛季</button></div>
      <button className="mobile-season-trigger" onClick={() => setPickerOpen(true)}>选择其他赛季</button>
      <div className="season-grid" aria-label="选择起始赛季">{LEGEND_SEASONS.map((value) => <button key={value} className={season === value ? "active" : ""} onClick={() => selectSeason(value)}>{value}</button>)}</div>
    </div>
    <div className="model-note"><SourceBadge kind="游戏公式" /><p>首发五人占球队模型 85%，两名核心轮换占 15%；单场胜率按进攻差×40%＋防守差×40%＋深度差×20%计算，并限制在 15%—85%。</p><details><summary>查看估算边界</summary><span>季后赛、夺冠率与生涯历史分是在固定起始阵容上做的概率投影，无法预知后续交易、选秀、伤病、成长与剧情随机数。</span></details></div>
    {!model && !error && <div className="season-loading">正在载入 21 个赛季的球队模型……</div>}
    {error && <div className="season-loading error">{error}，请刷新页面重试。</div>}
    {model && <><div className="season-guide-head"><div><strong>{season} · {POSITION_NAMES[position]}</strong><span>先看最推荐的 5 队</span></div><p>共 {rows.length} 支可选球队 · 当前展示 {visible.length} 支</p></div><div className="season-team-list">{visible.map((item: any) => <SeasonTeamCard key={item.team} item={item} position={position} />)}</div>{rows.length > 5 && <button className="show-all-teams" onClick={() => setShowAll((value) => !value)}>{showAll ? "收起，只看前 5 队" : `展开查看 ${season} 全部 ${rows.length} 支球队`}</button>}</>}
    {pickerOpen && <div className="season-picker-backdrop"><button className="backdrop-dismiss" aria-label="关闭赛季选择" onClick={() => setPickerOpen(false)} /><aside className="season-picker-sheet"><header><div><span>选择起始赛季</span><strong>1995-96 至 2015-16</strong></div><button onClick={() => setPickerOpen(false)}>关闭</button></header><div>{LEGEND_SEASONS.map((value) => <button key={value} className={season === value ? "active" : ""} onClick={() => selectSeason(value)}>{value}</button>)}</div></aside></div>}
  </section>;
}

function AwardsCurrent() {
  const formulas = [
    ["最有价值球员", "产量＋胜率×9＋出勤×0.02＋综评影响×0.12", "产量＝得分＋篮板×0.55＋助攻×0.75＋抢断盖帽×1.45－失误×0.65。领先不大时，候选之间还会加入有限随机波动。"],
    ["最佳阵容", "产量＋胜率×6＋综评影响×0.2＋时间×0.08", "按后卫、前锋、中锋分组排三阵；MVP会被保送进一阵。高综评只是入场券，球权、时间与数据产量更重要。"],
    ["最佳防守球员", "防守原分×球队×年龄×角色×新秀×连庄系数", "防守原分＝外防×0.5＋内防×0.5＋盖帽×0.8＋综评×0.3。球队排名前10乘1.2；新秀仅乘0.25；连庄会逐年衰减。"],
    ["总决赛最有价值球员", "得分＋篮板×0.75＋助攻×1.05＋抢断盖帽×1.8－失误＋正负值×0.04", "先看冠军队主要轮换，再从前三得分点里比较。若头号得分手领先第二名至少5分，且综合分差不超过3，会优先给头号得分手。"],
  ];
  return <section id="awards" className="section shell"><SectionHeading index="06" title="奖项和胜率，游戏到底怎么算" text="这里不再用模糊的“评分够高就行”。先看固定公式，再决定你该补个人数据、球队胜率还是防守环境。" aside={<SourceBadge kind="游戏公式" />} /><div className="award-formula-list">{formulas.map(([title, formula, note]) => <article key={title}><header><h3>{title}</h3><SourceBadge kind="游戏公式" /></header><strong>{formula}</strong><p>{note}</p></article>)}</div><div className="win-formula"><div><h3>常规赛与季后赛胜率</h3><p>净实力差＝进攻差×0.4＋防守差×0.4＋深度差×0.2＋季后赛种子加成；胜率＝50%＋净实力差÷25，最后限制在15%—85%。</p></div><div><span>首发五人</span><strong>85%</strong><span>两名核心轮换</span><strong>15%</strong></div></div><div className="season-points"><div><span>赛季后加点</span><h3>先补高权重，再补获奖短板</h3></div><div><p><b>控球后卫</b>护球 → 传球 → 外防 → 三分</p><p><b>得分后卫</b>三分／中投 → 关键 → 终结 → 外防</p><p><b>小前锋</b>终结／外防 → 三分／中投 → 运动</p><p><b>大前锋</b>终结／内防 → 篮板／外防 → 力量</p><p><b>中锋</b>终结／内防 → 盖帽／篮板 → 力量</p></div></div></section>;
}

function LegacyScoreGuide() {
  const honors = [["总冠军", 18], ["最有价值球员", 16], ["总决赛最有价值球员", 14], ["最佳防守球员", 10], ["最佳阵容", 5], ["全明星", 3]];
  return <section id="legacy-score" className="section shell legacy-score-guide"><SectionHeading index="07" title="怎么把历史分推到最高" text="历史分只认荣誉、累计数据、忠诚年限、退役综评和四个真正写进公式的告别剧情。商业、媒体等声望会改故事与判词，但不会自动兑换历史分。" aside={<SourceBadge kind="游戏公式" />} /><div className="theoretical-max"><div><span>数学理论上限</span><strong>1260</strong><p>18个赛季把全部主要荣誉拿满的极端情况，几乎不可能在正常存档稳定复现。</p></div><div><p><b>1188</b>18季六项主要荣誉全部拿满</p><p><b>35</b>生涯得分达到87500分</p><p><b>12</b>18×82场只能得到12分出场奖励</p><p><b>10</b>同一球队效力至少8年</p><p><b>8</b>退役时综评至少94</p><p><b>7</b>三个正向告别剧情全部触发</p></div></div><div className="legacy-practical"><article><span>实战成型</span><strong>500+</strong><p>持续最佳阵容和全明星，配合多次MVP或冠军。</p></article><article><span>顶级存档</span><strong>700+</strong><p>需要长期处于MVP与争冠中心，FMVP不能经常被队友拿走。</p></article><article><span>冲榜区间</span><strong>850+</strong><p>接近当前在线榜门槛；具体分数以实时模块为准。</p></article></div><div className="honor-value-grid">{honors.map(([name, score]) => <div key={name}><span>{name}</span><strong>+{score}</strong><small>每次</small></div>)}</div><div className="score-mechanics"><article><h3>四个真正加减分的剧情</h3><p>最后一场全力输出 +2；回母队告别 +3；完美谢幕 +2；带伤告别 −1。其他“历史评价”或声望变量目前没有进入最终历史分公式。</p></article><article><h3>GOAT不是只看总分</h3><p>MVP至少5次、总冠军至少6次、FMVP至少6次，并且三项合计至少18次。即使历史分很高，缺一项也不会显示GOAT级别。</p></article><article><h3>队史球衣单独结算</h3><p>队史分＝效力年数×7＋冠军×12＋MVP×10＋FMVP×8＋全明星×2；达到80，或满足冠军／MVP的年限捷径，即可触发退役球衣。</p></article></div></section>;
}

function leaderboardScore(row: any, teamBoard = false) {
  const value = teamBoard ? row?.team_score : (row?.historical_score ?? row?.legacy_score ?? row?.score);
  return Number(value || 0);
}

function thresholdAt(rows: any[], index: number, teamBoard = false) {
  return rows[index] ? leaderboardScore(rows[index], teamBoard) : null;
}

function estimateRank(rows: any[], score: number, teamBoard = false) {
  if (!score || !rows.length) return "输入分数后估算";
  const rank = rows.filter((row) => leaderboardScore(row, teamBoard) > score).length + 1;
  return rank <= rows.length ? `预计第 ${rank} 名` : `${rows.length} 名之外`;
}

function LiveLeaderboard({ teamNames }: { teamNames: Record<string, string> }) {
  const [online, setOnline] = useState<any>(null);
  const [teamBoard, setTeamBoard] = useState<any>(null);
  const [team, setTeam] = useState("LAL");
  const [onlineScore, setOnlineScore] = useState("");
  const [teamScore, setTeamScore] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/leaderboard").then((response) => { if (!response.ok) throw new Error("在线榜暂时无法连接"); return response.json(); }).then(setOnline).catch((reason) => setError(reason instanceof Error ? reason.message : "在线榜暂时无法连接"));
  }, []);
  useEffect(() => {
    fetch(`/api/leaderboard?team=${team}`).then((response) => { if (!response.ok) throw new Error("队史榜暂时无法连接"); return response.json(); }).then(setTeamBoard).catch((reason) => setError(reason instanceof Error ? reason.message : "队史榜暂时无法连接"));
  }, [team]);
  const onlineRows = online?.leaderboard || [];
  const teamRows = teamBoard?.leaderboard || [];
  const updatedAt = online?.updatedAt ? new Date(online.updatedAt).toLocaleString("zh-CN", { hour12: false }) : "等待数据";
  return <section id="live-board" className="section shell live-board-section"><SectionHeading index="08" title="现在多少分，才能真的上榜？" text="读取原游戏公开的在线榜与队史留名榜，只做只读展示。每3—5分钟刷新；接口异常时保留最近一次成功结果。" aside={<SourceBadge kind="实时数据" />} /><div className="live-status"><span className={error ? "status-error" : "status-live"} /> <strong>{error || "榜单已连接"}</strong><p>最近数据：{updatedAt}{online?.stale ? " · 当前为缓存结果" : ""}</p></div><div className="leaderboard-layout"><article><header><div><span>全服在线排行榜</span><h3>历史分门槛</h3></div><strong>{onlineRows.length ? leaderboardScore(onlineRows[0]) : "—"}<small>当前榜首</small></strong></header><div className="threshold-row">{[[9, "前10"], [49, "前50"], [99, "前100"]].map(([index, label]) => <div key={label}><span>{label}</span><strong>{thresholdAt(onlineRows, Number(index)) ?? "—"}</strong></div>)}</div><label>输入我的历史分<input inputMode="numeric" value={onlineScore} onChange={(event) => setOnlineScore(event.target.value.replace(/\D/g, ""))} placeholder="例如 900" /></label><p className="rank-estimate">{estimateRank(onlineRows, Number(onlineScore))}</p></article><article><header><div><span>球队队史留名榜</span><h3>{teamNames[team]}门槛</h3></div><select value={team} onChange={(event) => setTeam(event.target.value)}>{Object.entries(teamNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></header><div className="threshold-row">{[[9, "前10"], [49, "前50"], [99, "前100"]].map(([index, label]) => <div key={label}><span>{label}</span><strong>{thresholdAt(teamRows, Number(index), true) ?? "—"}</strong></div>)}</div><label>输入我的队史分<input inputMode="numeric" value={teamScore} onChange={(event) => setTeamScore(event.target.value.replace(/\D/g, ""))} placeholder="例如 550" /></label><p className="rank-estimate">{estimateRank(teamRows, Number(teamScore), true)}</p></article></div><div className="leaderboard-privacy"><SourceBadge kind="实时数据" /><p>本站不读取登录状态，不提交或修改游戏数据。榜单门槛随玩家成绩变化，缓存只用于原接口临时故障时继续显示最近结果。</p></div></section>;
}

const PROFILE_CARDS = [
  { key: "商业价值", accent: "#f6c75b", exact: "广告、品牌、经纪与公众曝光事件累计", plain: "想赚钱、冲全国知名度就堆；不直接给你三分或扣篮。", affects: "解锁商业剧情、提高品牌路线权重，参与人物形象与传奇判词。" },
  { key: "球迷好感", accent: "#66d9ef", exact: "城市、公益、国家队与球迷互动事件累计", plain: "这是路人缘和主场基本盘，越高越容易走城市图腾路线。", affects: "影响球迷事件、城市羁绊、部分称号与终局评价。" },
  { key: "教练信任", accent: "#b9f56a", exact: "接受定位、训练态度、球队合练与场外选择累计", plain: "最实用的场外数值。想稳上场、少坐冷板凳，优先保它。", affects: "影响角色稳定、轮换语境、部分剧情与赛季波动。" },
  { key: "争议度", accent: "#ff7b7b", exact: "公开冲突、媒体对线、拒绝与高风险选择累计", plain: "不是越低越好；想走争议巨星可以堆，但纯赢球路线别乱加。", affects: "改变媒体与球迷叙事，过高会增加负面剧情，同时可解锁争议判词。" },
];
const PROFILE_TIERS = ["负数：受损", "0—19：起步", "20—39：小有名气", "40—59：知名", "60—79：备受瞩目", "80+：传奇级"];

function ProfileSection({ mode }: { mode: Mode }) {
  return <section id="profile" className="section shell"><SectionHeading index="06" title="形象声望到底影响什么" text="赛季结算页新增的形象声望不是第二套球员属性。它记录你在球场外成为什么样的人，并继续影响剧情、稳定性、称号与最终判词。" aside={mode === "legend" ? <span className="verified-chip">传奇模式重点板块</span> : undefined} /><div className="profile-tier"><span>游戏统一档位</span><div>{PROFILE_TIERS.map((tier) => <b key={tier}>{tier}</b>)}</div></div><div className="profile-grid">{PROFILE_CARDS.map((card) => <article key={card.key} style={{ "--accent": card.accent } as React.CSSProperties}><span>{card.key}</span><h3>{card.plain}</h3><p><b>精确口径：</b>{card.exact}</p><p><b>实际影响：</b>{card.affects}</p></article>)}</div>{mode === "legend" && <div className="legend-score-panel"><header><span>传奇剧情内部计分</span><h3>这些分数最后会拼成你的“历史怎么评价你”</h3></header><div>{["同届竞争", "王朝线", "个人传奇", "城市羁绊", "媒体热度", "媒体信任", "更衣室", "技艺路线", "季后赛神话", "历史偏移", "巨星同盟", "全国偶像", "生涯照护"].map((item) => <span key={item}>{item}</span>)}</div><p>例如：城市羁绊高、长期留队，容易走“一城一人的图腾”；巨星同盟高，会更靠近“超级球队共犯”；技艺路线和历史偏移高，更像“时代桥梁”。</p></div>}</section>;
}

const LEGACY = [
  ["历史最佳级别", "特殊硬条件", "最有价值球员 ≥ 5、总冠军 ≥ 6、总决赛最有价值球员 ≥ 6，且三项合计 ≥ 18。"],
  ["历史前十级别", "180 分", "冠军与最有价值球员权重最高，典型王朝路线。"],
  ["历史前二十级别", "155 分", "稳定拿最佳阵容、全明星并积累数据。"],
  ["历史百大", "140 分", "同时满足游戏的历史百大标签。"],
  ["名人堂稳进", "100 分", "达到即入选，不再看随机。"],
  ["名人堂边缘", "75 分", "75—99 分按递增概率入选。"],
  ["队史传奇", "60 分", "长期效力一队最容易达成。"],
];

function LegacySection({ mode }: { mode: Mode }) {
  return <section id="legacy" className="section shell"><SectionHeading index="07" title="历史地位与终局判词" text="历史分看荣誉、累计数据、忠诚和告别剧情；传奇判词再读取你一路积累的形象与故事分。两者不是一回事。" /><div className="legacy-layout"><div className="legacy-list">{LEGACY.map(([tier, score, note], index) => <article className={index === 0 ? "goat" : ""} key={tier}><span>{String(index + 1).padStart(2, "0")}</span><strong>{tier}</strong><b>{score}</b><p>{note}</p></article>)}</div><aside className="legacy-formula"><span>历史分主要权重</span><p><b>总冠军</b> × 18</p><p><b>最有价值球员</b> × 16</p><p><b>总决赛最有价值球员</b> × 14</p><p><b>最佳防守球员</b> × 10</p><p><b>最佳阵容</b> × 5 · <b>全明星</b> × 3</p><hr /><p>每 2500 生涯得分 +1，最多 35</p><p>每 120 场 +1，最多 18</p><p>同队 8 年+：+10 · 最终评分 94+：+8</p><p>告别剧情最多 +7，带伤告别 -1</p></aside></div>{mode === "legend" && <div className="verdict-examples"><article><span>王朝路线</span><h3>王朝窗口的守夜人</h3><p>王朝线高、至少两冠，且多次选择保住争冠窗口。</p></article><article><span>城市路线</span><h3>城市记忆里的号码</h3><p>城市羁绊高，或城市羁绊达到中高值并长期留队。</p></article><article><span>个人路线</span><h3>没有加入同盟的人</h3><p>个人传奇高、巨星同盟低，独自扛队的选择会成为证据。</p></article><article><span>时代路线</span><h3>把两个时代接起来的人</h3><p>历史偏移与技艺路线高，愿意适应空间、数据与新打法。</p></article></div>}</section>;
}

function titleDifficulty(item: any) {
  const tags = item.tags || [];
  if (tags.some((tag: string) => ["legacy", "dynasty", "mvp", "fmvp"].includes(tag))) return "稀世";
  if (tags.some((tag: string) => ["champion", "defense", "one_city", "longevity"].includes(tag))) return "高难";
  if (tags.some((tag: string) => ["allstar", "scorer", "playmaker", "big"].includes(tag))) return "进阶";
  return "常规";
}

function TitleLibrary({ data }: { data: any }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("全部");
  const [tag, setTag] = useState("全部");
  const tags = ["全部", ...Array.from(new Set(data.titles.flatMap((item: any) => item.tags))) as string[]];
  const filtered = data.titles.filter((item: any) => (difficulty === "全部" || titleDifficulty(item) === difficulty) && (tag === "全部" || item.tags.includes(tag)) && item.title.includes(query.trim()));
  return <section id="titles" className="section shell"><SectionHeading index="08" title="100 个称号档案" text="称号先按生涯生成标签，再从标签匹配度最高的候选池稳定抽取。同一条件不保证每个存档得到同一个名称。" /><div className="title-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="查找称号，例如：王朝、关键、禁区" /><div className="difficulty-tabs">{["全部", "稀世", "高难", "进阶", "常规"].map((value) => <button key={value} className={difficulty === value ? "active" : ""} onClick={() => setDifficulty(value)}>{value}</button>)}</div></div><div className="tag-tabs title-tags">{tags.map((value) => <button key={value} className={tag === value ? "active" : ""} onClick={() => setTag(value)}>{value === "全部" ? value : TAG_LABELS[value]}</button>)}</div><div className="title-grid">{filtered.map((item: any) => <article key={item.id}><span>{titleDifficulty(item)} · {item.tags.map((value: string) => TAG_LABELS[value]).join(" · ")}</span><h3>{item.title}</h3><p>{item.tags.map((value: string) => TAG_LABELS[value]).join(" ＋ ")}</p></article>)}</div>{!filtered.length && <div className="empty-state">没有匹配称号，试试清空难度或标签。</div>}</section>;
}

function DataSectionCurrent({ careerData, legendData }: any) {
  return <section id="data" className="section shell"><SectionHeading index="12" title={`数据快照 · ${cnDate(legendData.meta.extractedAt)}`} text="固定球员值与规则来自当前游戏脚本；胜率与生涯收益另行标注为模型估算；实时榜单只读取原游戏公开接口。" /><div className="data-grid"><article><span>生涯模式</span><h3>{careerData.meta.playerCount} 人</h3><p>30队确定性现役球员；随机生成新秀不混进静态属性榜。</p></article><article><span>传奇夺取池</span><h3>{legendData.meta.playerCount} 人</h3><p>30队统一队史池，不再按起始年代删减球队或球员。</p></article><article><span>自由起始赛季</span><h3>21 季</h3><p>1995-96至2015-16；每季逐队展示阵容和五位置模型。</p></article><article><span>完整模型</span><h3>3150 卡</h3><p>21赛季×5位置×每季完整球队，统一按约97综评计算。</p></article></div><div className="data-notes"><div><span>游戏公式</span><p>属性衰减、球队五项实力、单场胜率、MVP／最佳阵容／DPOY／FMVP分数与最终历史分。</p></div><div><span>模型估算</span><p>常规赛预计胜率、季后赛概率、夺冠率、获奖概率与生涯历史分区间。</p></div><div><span>实时数据</span><p>在线排行榜与30支球队队史榜门槛；每3—5分钟更新并保留最近成功结果。</p></div><div><span>最重要的边界</span><p>起始阵容能够核验，但后续交易、选秀、伤病、成长与剧情随机数无法提前确定。</p></div></div></section>;
}

export default function GuideApp({ careerSummary, legendSummary }: { careerSummary: any; legendSummary: any }) {
  const [mode, setMode] = useState<Mode>("career");
  const [position, setPosition] = useState<Position>("PG");
  const [team, setTeam] = useState("ATL");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const [careerData, setCareerData] = useState<any>(null);
  const [legendData, setLegendData] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- URL 与本机偏好只能在浏览器挂载后同步，避免服务端水合不一致。 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = JSON.parse(window.localStorage.getItem("legend-guide-state") || "{}");
    const nextMode = params.get("mode") || stored.mode;
    const nextPosition = params.get("pos") || stored.position;
    const nextTeam = params.get("team");
    if (nextMode === "career" || nextMode === "legend") setMode(nextMode);
    if (POSITIONS.includes(nextPosition as Position)) setPosition(nextPosition as Position);
    if (nextTeam) setTeam(nextTeam);
    setStateReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let idleId = 0;
    let timerId = 0;
    const load = async () => {
      try {
        setLoadError("");
        const [careerResponse, legendResponse] = await Promise.all([
          fetch("/data/guide-data.json", { signal: controller.signal }),
          fetch("/data/legend-data.json", { signal: controller.signal }),
        ]);
        if (!careerResponse.ok || !legendResponse.ok) throw new Error("完整数据请求失败，请检查网络后重试。");
        const [nextCareerData, nextLegendData] = await Promise.all([careerResponse.json(), legendResponse.json()]);
        if (!disposed) {
          setCareerData(nextCareerData);
          setLegendData(nextLegendData);
        }
      } catch (error) {
        if (!disposed && !controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "完整数据暂时无法载入。");
      }
    };
    const browserWindow = window as any;
    if (browserWindow.requestIdleCallback) idleId = browserWindow.requestIdleCallback(load, { timeout: 350 });
    else timerId = window.setTimeout(load, 80);
    return () => {
      disposed = true;
      controller.abort();
      if (idleId && browserWindow.cancelIdleCallback) browserWindow.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [loadAttempt]);

  const context = useMemo(() => {
    if (!careerData || !legendData) return null;
    if (mode === "career") return {
      ...careerData, mode, teams: Object.keys(careerData.teamNames), players: careerData.players,
      teamNames: careerData.teamNames, rankings: careerData.rankings, optimal: careerData.optimal,
    };
    const players = legendData.teams.flatMap((code: string) => legendData.playersByTeam[code] || []);
    return {
      ...legendData, mode, teams: legendData.teams, players, teamNames: legendData.teamNames,
      rankings: legendData.rankings, optimal: legendData.optimal,
    };
  }, [careerData, legendData, mode]);

  const validTeam = context && context.teams.includes(team) ? team : (context?.teams?.[0] || team);

  useEffect(() => {
    if (!stateReady) return;
    window.localStorage.setItem("legend-guide-state", JSON.stringify({ mode, position }));
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.searchParams.delete("era");
    url.searchParams.set("pos", position);
    url.searchParams.set("team", validTeam);
    window.history.replaceState(null, "", url);
  }, [mode, position, stateReady, validTeam]);

  const visibleNav = NAV.filter(([, href]) => mode === "legend" || href !== "#season-guide");
  return <main className={`mode-${mode}`}>
    <nav className="top-nav">
      <a className="brand" href="#top"><span>传</span><strong>传奇球星攻略</strong></a>
      <div className="global-position-tabs" aria-label="全站切换位置">{POSITIONS.map((value) => <button key={value} data-pos={value} className={position === value ? "active" : ""} onClick={() => setPosition(value)} aria-pressed={position === value}><b>{value}</b><span>{POSITION_NAMES[value]}</span></button>)}</div>
      <div className="desktop-links">{visibleNav.slice(1, 6).map(([name, href]) => <a key={href} href={href}>{name}</a>)}</div>
      <button className="menu-trigger" onClick={() => setMenuOpen(true)}>目录</button>
    </nav>
    <HeroCurrent mode={mode} setMode={setMode} careerSummary={careerSummary} legendSummary={legendSummary} />
    {context && careerData && legendData ? <>
      <div className="quick-nav shell">{visibleNav.map(([name, href], index) => <a key={href} href={href}><span>{String(index).padStart(2, "0")}</span>{name}</a>)}</div>
      {mode === "legend" ? <LegendOverviewCurrent legendData={legendData} /> : <CareerOverview careerData={careerData} />}
      <OptimalSection context={context} position={position} setPosition={setPosition} />
      <TeamSection key={mode} context={context} position={position} setPosition={setPosition} team={validTeam} setTeam={setTeam} />
      <RankingsSection key={`${mode}-${position}`} context={context} position={position} setPosition={setPosition} />
      {mode === "legend" && <LegendSeasonGuide key={position} position={position} />}
      <StorySection context={context} careerData={careerData} position={position} setPosition={setPosition} />
      <AwardsCurrent />
      <LegacyScoreGuide />
      <LiveLeaderboard teamNames={careerData.teamNames} />
      <ProfileSection mode={mode} />
      <LegacySection mode={mode} />
      <TitleLibrary data={careerData} />
      <DataSectionCurrent careerData={careerData} legendData={legendData} />
    </> : <DataLoading error={loadError} onRetry={() => setLoadAttempt((value) => value + 1)} />}
    <footer><div className="shell"><div><strong>打造我的传奇球星全方位攻略</strong><p>最新核验：{cnDate(legendSummary.meta.extractedAt)} · 统一队史属性池 · 21个传奇起始赛季。</p></div><a href="#top">回到顶部</a></div></footer>
    <a className="back-top" href="#top" aria-label="回到顶部">↑</a>
    {menuOpen && <div className="menu-backdrop"><button className="backdrop-dismiss" aria-label="关闭页面目录" onClick={() => setMenuOpen(false)} /><aside className="mobile-menu"><header><div><span>页面目录</span><strong>{mode === "career" ? "生涯模式" : "新版传奇模式"}</strong></div><button onClick={() => setMenuOpen(false)}>关闭</button></header><div>{visibleNav.map(([name, href], index) => <a key={href} href={href} onClick={() => setMenuOpen(false)}><span>{String(index).padStart(2, "0")}</span>{name}</a>)}</div></aside></div>}
    <button className="mobile-menu-button" onClick={() => setMenuOpen(true)}><span>目录</span><b>{mode === "career" ? "生涯" : "传奇"}</b></button>
  </main>;
}
