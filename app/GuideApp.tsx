"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
const ERAS = ["1984", "1996", "2003"] as const;
const POSITION_NAMES: Record<string, string> = { PG: "控球后卫", SG: "得分后卫", SF: "小前锋", PF: "大前锋", C: "中锋" };
const POSITION_HINTS: Record<string, string> = {
  PG: "控场优先：护球、传球、外防", SG: "火力优先：三分、中投、关键", SF: "全能优先：攻防均衡与运动", PF: "锋线支点：终结、内防、篮板", C: "禁区核心：终结、护筐、篮板",
};
const ROUTES = ["实战最优", "声望最优", "传奇判词最优"];
const NAV = [
  ["概览", "#overview"], ["最优组合", "#optimal"], ["球队速查", "#team"], ["属性榜", "#rankings"],
  ["剧情路线", "#story"], ["奖项胜率", "#awards"], ["形象声望", "#profile"], ["历史判词", "#legacy"], ["称号档案", "#titles"], ["数据说明", "#data"],
];
const BRANCH_LABELS: Record<string, string> = {
  draft_night: "选秀前置", legend_era: "时代专属", china_team: "中国男篮", relationship: "恋爱线", network: "人脉线",
  superstar_recruit: "巨星招募", training: "夏日训练", team_practice: "球队合练", teammate_bond: "队友关系",
  transfer: "转会风波", rich_paul: "经纪团队", family: "家庭生活", family_children: "家人与孩子", mental_health: "心理健康",
  city_culture: "城市文化", reading: "读书成长", china_market: "中国市场", media: "媒体关系", fan_culture: "球迷文化",
  brand: "品牌商业", crossover: "跨界演出", training_camp: "个人训练营", charity: "公益事业", violence_conflict: "冲突停赛",
  retirement_countdown: "退役倒计时", post_career: "退役之后", mentor: "巨星训练营", skill_training: "专项突破",
};
const BRANCH_GROUPS = [
  { name: "生涯起点", branches: ["draft_night", "legend_era"] },
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
type Era = (typeof ERAS)[number];
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

function Hero({ mode, setMode, era, setEra, careerSummary, legendSummary }: any) {
  return <header id="top" className="hero"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><div className="hero-grid" aria-hidden="true" /><div className="shell hero-inner"><div className="source-pill">攻略数据已核验至 {cnDate(legendSummary.meta.extractedAt)}</div><p className="hero-kicker">打造我的传奇球星全方位攻略</p><h1>抽到谁，怎么选？<br /><span>答案就在这一屏。</span></h1><p className="hero-copy">查位置衰减、无冲突组合、球队备选、剧情加点和终局判词。</p><div className="mode-selector" aria-label="选择游戏模式"><button className={mode === "career" ? "active career" : "career"} onClick={() => setMode("career")}><span>生涯模式</span><strong>{careerSummary.meta.playerCount} 名现役球员</strong><p>当前阵容，正常跨位置衰减</p></button><button className={mode === "legend" ? "active legend" : "legend"} onClick={() => setMode("legend")}><span>传奇模式</span><strong>球队历史阵容</strong><p>只承受 30% 跨位置损失</p></button></div>{mode === "legend" && <div className="era-selector" aria-label="选择传奇时代">{ERAS.map((value) => { const item = legendSummary.eras[value]; return <button key={value} className={era === value ? "active" : ""} style={{ "--era": item.accent } as React.CSSProperties} onClick={() => setEra(value)}><b>{value}</b><span>{item.label.replace(value, "")}</span><small>{item.teamCount} 队，{item.playerCount} 条候选</small></button>; })}</div>}<div className="hero-actions"><a className="button primary" href="#optimal">查看最优组合</a><a className="button ghost" href="#team">随机球队速查</a></div><div className="hero-proof"><div><strong>{mode === "career" ? careerSummary.meta.playerCount : legendSummary.eras[era].playerCount}</strong><span>{mode === "career" ? "现役确定性球员" : "当前时代候选"}</span></div><div><strong>5 × 13</strong><span>全位置属性榜</span></div><div><strong>1-40</strong><span>榜单展开范围</span></div><div><strong>{mode === "legend" ? legendSummary.meta.verifiedTop20Rows : careerSummary.eventCounts.staged}</strong><span>{mode === "legend" ? "条前 20 已核验" : "条分阶段剧情"}</span></div></div></div></header>;
}

function DataLoading({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <section className="data-loading shell" aria-live="polite"><div className="loading-copy"><span>{error ? "数据加载遇到问题" : "首屏已就绪"}</span><h2>{error ? "攻略数据暂时没有载入" : "正在载入完整攻略"}</h2><p>{error || "球员库与榜单正在后台加载，不影响模式和年代选择。"}</p>{error && <button onClick={onRetry}>重新加载</button>}</div><div className="loading-bars" aria-hidden="true"><i /><i /><i /></div></section>;
}

function LegendOverview({ legendData, era }: any) {
  const item = legendData.eras[era];
  const facts = [
    ["01", "抽的是队史球员", "选到火箭，不是只看当年阵容，而是从火箭历史球员库里抢属性。"],
    ["02", "年代只改球队池", `${era} 开局共有 ${item.teamCount} 支有效球队；同一球员版本跨时代数值不变。`],
    ["03", "跨位置衰减更轻", "传奇模式只吃普通模式 30% 的位置损失，所以大个子给控卫拿篮板、力量更香。"],
    ["04", "建球后按年代跑生涯", `${item.season}开始模拟；后续阵容、赛程、剧情和时代节奏都跟着年代走。`],
    ["05", "多了一套传奇判词", "商业、媒体、更衣室、城市羁绊等会写进人物形象和退役判词，不直接改建球原始值。"],
  ];
  return <section id="overview" className="section shell overview-section"><SectionHeading index="00" title="30 秒看懂传奇模式" text="JRS 版一句话：抽人看队史库，打生涯看年代；球员没变，球队池和衰减规则变了。" aside={<span className="verified-chip">已核验 195 榜 / 3900 条</span>} /><div className="fact-grid">{facts.map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div><div className="example-strip"><span>实测例子</span><p><b>2003 · 控卫 · 扣篮：</b>史蒂夫·弗朗西斯 96，第 1</p><p><b>2003 · 控卫 · 篮板：</b>步行者乔治·麦金尼斯 90，并列第 12</p></div></section>;
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
  useEffect(() => { setExcluded([]); setQuery(""); }, [team, context.mode, context.era]);
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
  return <section id="team" className="section shell"><SectionHeading index="02" title="随机到这支队，每项选谁？" text="13 项每项同时给第一、第二、第三选择。点队内前 5 或查找其他球员即可多选排除，全部答案即时重算。" /><div className={`team-control-bar ${context.mode === "career" ? "career-top" : ""}`}><PositionTabs value={position} onChange={setPosition} compact /><div className="current-team"><TeamMark team={team} name={context.teamNames[team]} large /><div><strong>{context.teamNames[team]}</strong><span>{context.mode === "legend" ? `${context.era} 时代` : "生涯模式"} · 已排除 {excluded.length} 人</span></div></div></div><div className="team-picker">{context.teams.map((code: string) => <button key={code} className={team === code ? "active" : ""} onClick={() => setTeam(code)} title={context.teamNames[code]}><img src={`/teams/${code}.png`} alt="" /><span>{context.teamNames[code]}</span></button>)}</div><div className="team-result"><div className="team-result-title"><div><span>队内位置适配前 5</span><h3>先排除已经用过的人</h3><p>位置适配分按当前 13 项实得值与位置权重综合计算，不是游戏总评。</p></div>{excluded.length > 0 && <button onClick={() => setExcluded([])}>清空排除</button>}</div><div className="fit-five">{topFive.map((player: any) => { const active = excluded.includes(player.identity); return <button key={player.id} className={active ? "excluded" : ""} onClick={() => toggle(player.identity)} aria-pressed={active}><TeamMark team={player.team} /><span><strong>{player.cname}</strong><small>{player.pos}</small></span><b>{player.fitScore}</b><em>{active ? "已排除" : "点选排除"}</em></button>; })}</div><div className="attribute-choice-grid">{choices.map(({ attr, rows, leader }: any, index: number) => <article className="attribute-choice" key={attr}><header><div className="attribute-label"><span>{String(index + 1).padStart(2, "0")}</span><h3>{context.attrCN[attr]}</h3></div>{leader && <div className="era-attribute-best"><small>{context.mode === "legend" ? "本年代最高" : "本模式最高"}</small><strong>{leader.cname}</strong><b>{leader.value}</b></div>}</header><div>{rows.length ? rows.map((player: any, rowIndex: number) => <div className={rowIndex === 0 ? "choice-primary" : ""} key={`${player.playerId}-${rowIndex}`}><span className="choice-rank">{rowIndex + 1}</span><strong>{player.cname}</strong><small>{player.pos}</small><Grade grade={player.grade} value={player.value} /></div>) : <p className="empty">暂无可用球员</p>}</div></article>)}</div><details className="other-player-search"><summary>查找并排除其他球员 <span>队内共 {roster.length} 人</span></summary><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入球员姓名" /><div className="roster-list">{otherPlayers.map((player: any) => { const identity = identityOf(player); const active = excluded.includes(identity); return <button key={player.id} className={active ? "excluded" : ""} onClick={() => toggle(identity)}><span>{player.pos}</span><strong>{player.cname}</strong><em>{active ? "恢复" : "排除"}</em></button>; })}</div></div></details></div></section>;
}

function RankingsSection({ context, position, setPosition }: any) {
  const [attr, setAttr] = useState("threePT");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [attr, context.mode, context.era, position]);
  const ranked = useMemo(() => addRanks((context.rankings[position][attr] || []).slice(0, 40)), [attr, context, position]);
  const visible = expanded ? ranked : ranked.slice(0, 20);
  return <section id="rankings" className="section shell"><SectionHeading index="03" title="每个位置、每项属性前 40" text="默认显示前 20；展开后直接显示完整 1—40。相同实得值使用并列排名，不把同分球员强行拆开。" aside={<span className="method-chip">评级颜色与游戏同步</span>} /><PositionTabs value={position} onChange={setPosition} compact /><div className="attr-tabs">{context.attrs.map((key: string) => <button key={key} className={attr === key ? "active" : ""} onClick={() => setAttr(key)}>{context.attrCN[key]}</button>)}</div><div className="ranking-panel"><header><div><span>{context.mode === "legend" ? `${context.era} 时代 · ` : ""}{POSITION_NAMES[position]}</span><h3>{context.attrCN[attr]}榜</h3><p>{context.attrDesc[attr]}</p></div>{ranked[0] && <div className="ranking-leader"><TeamMark team={ranked[0].team} large /><span><small>全榜最高</small><strong>{ranked[0].cname}</strong></span><Grade grade={ranked[0].grade} value={ranked[0].value} /></div>}</header><div className="ranking-columns">{visible.map((player: any, index: number) => <div className={index < 10 ? "featured" : ""} key={`${player.playerId}-${index}`}><PlayerLine player={player} context={context} rank={player.rank} /></div>)}</div><button className="ranking-expand" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起至前 20" : "展开完整 1—40"}<span>{expanded ? "↑" : "↓"}</span></button></div><div className="formula-card"><span>{context.mode === "legend" ? "传奇模式衰减" : "生涯模式衰减"}</span><strong>{context.mode === "legend" ? "传奇系数 = 1 −（1 − 普通系数）× 30%" : "普通系数 = 较小值〔1，目标位置均值 ÷ 来源位置均值〕"}</strong><p>实得值最后统一四舍五入。{context.mode === "legend" ? "所以传奇跨位置损失明显更小。" : "只衰减，不会跨位置增益。"}</p></div></section>;
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
    if (context.mode === "legend") map.legend_era = careerData.events.legendByEra?.[context.era] || [];
    return map;
  }, [careerData, context.era, context.mode]);
  useEffect(() => { if (context.mode === "career" && branch === "legend_era") setBranch("draft_night"); }, [branch, context.mode]);
  const availableGroups = BRANCH_GROUPS.map((group) => ({ ...group, branches: group.branches.filter((key) => byBranch[key]?.length) })).filter((group) => group.branches.length);
  const normalizedQuery = query.trim().toLowerCase();
  const matchedGroups = availableGroups.map((group) => ({ ...group, branches: group.branches.filter((key) => !normalizedQuery || `${BRANCH_LABELS[key]} ${byBranch[key].map((event) => `${event.title}${event.body}`).join(" ")}`.toLowerCase().includes(normalizedQuery)) })).filter((group) => group.branches.length);
  const events = byBranch[branch] || [];
  return <section id="story" className="section shell"><SectionHeading index="04" title="剧情事件怎么选" text="按故事线而不是随机事件堆叠。每条线从入口到后续阶段一次展开，并分别标出实战、声望和传奇判词的推荐。" aside={<span className="method-chip">精确增减来自当前代码</span>} /><div className="story-toolbar"><div><label>我的位置</label><PositionTabs value={position} onChange={setPosition} compact /></div><div><label>优先看哪条答案</label><div className="route-tabs">{ROUTES.map((value) => <button key={value} className={route === value ? "active" : ""} onClick={() => setRoute(value)}>{value}</button>)}</div></div><div><label htmlFor="story-search">查找剧情</label><input id="story-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="中国男篮、恋爱、商业……" /></div></div><div className="story-directory">{matchedGroups.map((group) => <div key={group.name}><span>{group.name}</span><div>{group.branches.map((key) => <button key={key} className={branch === key ? "active" : ""} onClick={() => setBranch(key)}><strong>{BRANCH_LABELS[key]}</strong><small>{byBranch[key].length} 个阶段</small></button>)}</div></div>)}</div><div className="story-line-head"><div><span>当前完整路线</span><h3>{BRANCH_LABELS[branch]}</h3></div><p>{branch === "legend_era" ? `${context.era} 年代专属剧情；这些分数会进入传奇生涯的形象与终局判词。` : "开头不进入这条线，后续节点通常不会再单独跳出来。推荐连线只代表当前目标下的稳妥答案。"}</p></div><div className="event-flow">{events.map((event: any, eventIndex: number) => { const labels = recommendationLabels(event.choices || [], position, context); return <article className="flow-stage" key={event.id}><div className="flow-rail"><span>{String(eventIndex + 1).padStart(2, "0")}</span><i /></div><div className="event-card"><header><div><small>{event.family || event.phase || "生涯事件"}</small><h3>{event.title}</h3></div><span>{eventIndex === 0 ? "路线入口" : "前置达成后"}</span></header><p className="event-copy">{event.body}</p><div className="choice-list">{(event.choices || []).map((choice: any, choiceIndex: number) => { const tags = labels[choiceIndex]; const focused = tags.includes(route) || tags.includes("综合最优"); return <div className={`story-choice ${focused ? "focused" : ""}`} key={`${event.id}-${choiceIndex}`}><div className="choice-badges">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div><h4>{choice.label}</h4><p>{choice.hint || "推进当前剧情线"}</p><div className="effect-tags">{(choice.effects || []).map((effect: string, index: number) => <span key={index}>{effect.replace("legacyBonus", "历史加成").replace("fanSupport", "球迷支持")}</span>)}</div>{choice.invalid?.length > 0 && <small className="invalid">注意：{choice.invalid.join("；")}</small>}</div></div>; })}</div></div></article>; })}</div>{!events.length && <div className="empty-state">当前筛选没有匹配剧情，请换一个关键词。</div>}<div className="story-warning"><strong>先分清两类加点</strong><p><b>三分、中投、终结等 13 项：</b>直接影响你的赛场能力、数据和综合评分。</p><p><b>商业、媒体、教练、球迷、争议与传奇剧情分：</b>主要影响后续事件、形象声望、稳定性、称号和终局判词，不会直接改造你刚夺取的原始属性。</p></div></section>;
}

function AwardsSection({ mode }: { mode: Mode }) {
  const awards = [
    { title: "最有价值球员", hard: "综合评分 92+ 才进入抽签池", safe: "稳妥线：评分 95+、分区前三、避免连续两届后的限制", detail: "分区前三有 2 张票，否则 1 张；31 岁及以上不再参与。" },
    { title: "最佳防守球员", hard: "抢断 + 盖帽 ≥ 3.55，且分区前三", safe: "稳妥线：外防／内防／盖帽拉高，合计稳定过 4.0", detail: "合计 3.0 可到第三，2.5 可到第四；连续两届后下一季固定第二。" },
    { title: "最佳阵容", hard: "分区前四 + 综合评分 85+", safe: "稳妥线：保证出场和球权，把得分、篮板、助攻至少一项做尖", detail: "2035 年后门槛降到 80；全联盟取 5 人且每队最多 1 人，最有价值球员保送。" },
  ];
  const factors = [
    ["01", "最终属性与位置适配", "最可控。先补当前位置高权重项，再补攻防短板。"],
    ["02", "球队阵容", "首发约占整队实力 85%，两名主要替补约占 15%。"],
    ["03", "教练信任、伤病、剧情状态", "决定上场稳定性和赛季波动，低信任或高伤病会吃掉纸面优势。"],
    ["04", mode === "legend" ? "时代节奏与年代阵容" : "联盟环境与赛程", mode === "legend" ? "不同年代的球队池、节奏和阵容会改变实际数据分布。" : "同一套属性在不同球队和赛程下不会产出完全相同的数据。"],
    ["05", "随机波动", "最后才是运气；别指望用随机波动弥补阵容和属性缺口。"],
  ];
  return <section id="awards" className="section shell"><SectionHeading index="05" title="奖项、常规赛与季后赛" text="硬门槛是代码事实，稳妥线是为了少看脸。胜率先看整队强度，再叠加信任、伤病、时代和随机波动。" /><div className="award-grid">{awards.map((award) => <article key={award.title}><span>{award.title}</span><h3>{award.hard}</h3><b>{award.safe}</b><p>{award.detail}</p></article>)}</div><div className="factor-panel"><header><span>胜率影响因素 · 按可控性排序</span><h3>先修你能控制的，再谈玄学</h3></header><div>{factors.map(([index, title, text]) => <article key={index}><span>{index}</span><div><h4>{title}</h4><p>{text}</p></div></article>)}</div></div><div className="season-points"><div><span>赛季后加点</span><h3>按位置直接抄作业</h3></div><div><p><b>控球后卫</b>护球 → 传球 → 外防 → 三分</p><p><b>得分后卫</b>三分／中投 → 关键 → 终结 → 外防</p><p><b>小前锋</b>终结／外防 → 三分／中投 → 运动</p><p><b>大前锋</b>终结／内防 → 篮板／外防 → 力量</p><p><b>中锋</b>终结／内防 → 盖帽／篮板 → 力量</p></div></div></section>;
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

function DataSection({ careerData, legendData }: any) {
  return <section id="data" className="section shell"><SectionHeading index="09" title={`数据快照 · ${cnDate(legendData.meta.extractedAt)}`} text="站点使用人工核验快照，不在打开页面时偷偷读取远端脚本。这样游戏临时改版也不会让旧结论无声漂移。" /><div className="data-grid"><article><span>生涯模式</span><h3>{careerData.meta.playerCount} 人</h3><p>30 队确定性现役球员；随机生成的新秀不混进静态榜。</p></article><article><span>传奇时代</span><h3>23 / 29 / 29 队</h3><p>1984 为 352 条候选；1996、2003 均为 442 条候选。</p></article><article><span>完整核验</span><h3>195 榜</h3><p>3 时代 × 5 位置 × 13 属性；前 20 共 3900 条逐项通过。</p></article><article><span>网页扩展</span><h3>7800 条</h3><p>每榜额外提供至第 40 名，便于排除球员后继续查找。</p></article></div><div className="data-notes"><div><span>生涯模式公式</span><p>实得 = 四舍五入〔原值 × 较小值（1，目标位置均值 ÷ 来源位置均值）〕。</p></div><div><span>传奇模式公式</span><p>传奇系数 = 1 −（1 − 普通系数）× 30%；实得 = 四舍五入（原值 × 传奇系数）。</p></div><div><span>三个时代为什么会有榜单差异</span><p>同一球队、同一球员版本的数值没变；差异只来自该时代可随机到的球队集合不同。</p></div><div><span>同名球员规则</span><p>不同球队版本会分别展示在榜上，但建球时同一姓名整局共用一次使用机会。</p></div></div></section>;
}

export default function GuideApp({ careerSummary, legendSummary }: { careerSummary: any; legendSummary: any }) {
  const [mode, setMode] = useState<Mode>("career");
  const [era, setEra] = useState<Era>("2003");
  const [position, setPosition] = useState<Position>("PG");
  const [team, setTeam] = useState("ATL");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const [careerData, setCareerData] = useState<any>(null);
  const [legendData, setLegendData] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = JSON.parse(window.localStorage.getItem("legend-guide-state") || "{}");
    const nextMode = params.get("mode") || stored.mode;
    const nextEra = params.get("era") || stored.era;
    const nextPosition = params.get("pos") || stored.position;
    const nextTeam = params.get("team");
    if (nextMode === "career" || nextMode === "legend") setMode(nextMode);
    if (ERAS.includes(nextEra as Era)) setEra(nextEra as Era);
    if (POSITIONS.includes(nextPosition as Position)) setPosition(nextPosition as Position);
    if (nextTeam) setTeam(nextTeam);
    setStateReady(true);
  }, []);

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
      ...careerData, mode, era: null, teams: Object.keys(careerData.teamNames), players: careerData.players,
      teamNames: careerData.teamNames, rankings: careerData.rankings, optimal: careerData.optimal,
    };
    const eraData = legendData.eras[era];
    const players = eraData.activeTeams.flatMap((code: string) => legendData.playersByTeam[code] || []);
    return {
      ...legendData, mode, era, teams: eraData.activeTeams, players, teamNames: eraData.teamNames,
      rankings: legendData.rankings[era], optimal: legendData.optimal[era], meta: { ...legendData.meta, ...eraData },
    };
  }, [careerData, era, legendData, mode]);

  useEffect(() => {
    if (context && !context.teams.includes(team)) setTeam(context.teams[0]);
  }, [context, team]);

  useEffect(() => {
    if (!stateReady) return;
    window.localStorage.setItem("legend-guide-state", JSON.stringify({ mode, era, position }));
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    if (mode === "legend") url.searchParams.set("era", era); else url.searchParams.delete("era");
    url.searchParams.set("pos", position);
    url.searchParams.set("team", team);
    window.history.replaceState(null, "", url);
  }, [era, mode, position, stateReady, team]);

  return <main className={`mode-${mode}`}>
    <nav className="top-nav"><a className="brand" href="#top"><span>传</span><strong>传奇球星攻略</strong></a><div className="desktop-links">{NAV.slice(1, 8).map(([name, href]) => <a key={href} href={href}>{name}</a>)}</div><button className="menu-trigger" onClick={() => setMenuOpen(true)}>目录</button></nav>
    <Hero mode={mode} setMode={setMode} era={era} setEra={setEra} careerSummary={careerSummary} legendSummary={legendSummary} />
    {mode === "legend" && <div className="status-dock"><div className="shell"><div className="era-dock" aria-label="快速切换传奇年代"><span>切换年代</span>{ERAS.map((value) => { const item = legendSummary.eras[value]; return <button key={value} className={era === value ? "active" : ""} style={{ "--era": item.accent } as React.CSSProperties} onClick={() => setEra(value)} aria-pressed={era === value}><strong>{value}</strong><small>{item.label.replace(value, "")}</small></button>; })}</div></div></div>}
    {context && careerData && legendData ? <>
      <div className="quick-nav shell">{NAV.map(([name, href], index) => <a key={href} href={href}><span>{String(index).padStart(2, "0")}</span>{name}</a>)}</div>
      {mode === "legend" ? <LegendOverview legendData={legendData} era={era} /> : <CareerOverview careerData={careerData} />}
      <OptimalSection context={context} position={position} setPosition={setPosition} />
      <TeamSection context={context} position={position} setPosition={setPosition} team={team} setTeam={setTeam} />
      <RankingsSection context={context} position={position} setPosition={setPosition} />
      <StorySection context={context} careerData={careerData} position={position} setPosition={setPosition} />
      <AwardsSection mode={mode} />
      <ProfileSection mode={mode} />
      <LegacySection mode={mode} />
      <TitleLibrary data={careerData} />
      <DataSection careerData={careerData} legendData={legendData} />
    </> : <DataLoading error={loadError} onRetry={() => setLoadAttempt((value) => value + 1)} />}
    <footer><div className="shell"><div><strong>打造我的传奇球星全方位攻略</strong><p>当前数据快照：{cnDate(legendSummary.meta.extractedAt)}。游戏更新后请以新核验版本为准。</p></div><a href="#top">回到顶部 ↑</a></div></footer>
    <a className="back-top" href="#top" aria-label="回到顶部">↑</a>
    {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)}><aside className="mobile-menu" onClick={(event) => event.stopPropagation()}><header><div><span>页面目录</span><strong>{mode === "career" ? "生涯模式" : `传奇模式 · ${era}`}</strong></div><button onClick={() => setMenuOpen(false)}>关闭</button></header><div>{NAV.map(([name, href], index) => <a key={href} href={href} onClick={() => setMenuOpen(false)}><span>{String(index).padStart(2, "0")}</span>{name}</a>)}</div></aside></div>}
    <button className="mobile-menu-button" onClick={() => setMenuOpen(true)}><span>目录</span><b>{mode === "career" ? "生涯" : `${era} 传奇`}</b></button>
  </main>;
}
