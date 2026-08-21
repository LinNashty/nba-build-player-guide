"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useMemo, useState } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
const POSITION_NAMES: Record<string, string> = { PG: "控球后卫", SG: "得分后卫", SF: "小前锋", PF: "大前锋", C: "中锋" };
const POSITION_HINTS: Record<string, string> = {
  PG: "控场优先：手感、传球与外防", SG: "火力优先：三分、中投与关键球", SF: "全能优先：攻防均衡与运动能力", PF: "锋线支点：终结、内防与篮板", C: "禁区核心：终结、护筐、篮板与力量",
};
const ROUTES = ["冲击奖项", "提高胜率", "长期成长", "稳健健康"];
const BRANCH_LABELS: Record<string, string> = {
  draft_night: "选秀前置线", china_team: "中国男篮", relationship: "恋爱线", network: "人脉线", superstar_recruit: "巨星招募",
  training: "夏日训练", team_practice: "球队合练", teammate_bond: "队友关系", transfer: "转会风波", rich_paul: "经纪团队",
  family: "家庭生活", family_children: "家人与孩子", mental_health: "心理健康", city_culture: "城市文化", reading: "读书成长",
  china_market: "中国市场", media: "媒体关系", fan_culture: "球迷文化", brand: "品牌商业", crossover: "跨界演出",
  training_camp: "个人训练营", charity: "公益事业", violence_conflict: "冲突停赛", retirement_countdown: "退役倒计时", post_career: "退役之后",
};
const BRANCH_GROUPS = [
  { name: "生涯起点", branches: ["draft_night"] },
  { name: "篮球主线", branches: ["china_team", "training", "team_practice", "teammate_bond", "transfer", "superstar_recruit", "rich_paul"] },
  { name: "关系与生活", branches: ["relationship", "family", "family_children", "mental_health", "city_culture", "reading"] },
  { name: "商业与公众", branches: ["china_market", "media", "fan_culture", "brand", "crossover", "training_camp", "charity", "violence_conflict"] },
  { name: "生涯后期", branches: ["retirement_countdown", "post_career"] },
];
const TAG_LABELS: Record<string, string> = {
  champion: "总冠军", dynasty: "三冠王朝", mvp: "最有价值球员", fmvp: "总决赛最有价值球员", defense: "最佳防守球员", allstar: "全明星", scorer: "生涯场均得分 25+", playmaker: "生涯场均助攻 7+", big: "生涯场均篮板 10+", longevity: "生涯 12 季+", one_city: "终身一队", multi: "效力 3 队+", clutch: "关键属性 80+", leader: "更衣室信任或领导力 60+", camp: "训练营长期标签", legacy: "历史百大或更高档位",
};
type Position = (typeof POSITIONS)[number];

function cnDate(value: string) { const [y, m, d] = value.split("-"); return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`; }

function gradeFor(value: number, data: any) {
  return data.rules.grades.find((item: any) => value >= item.min) || data.rules.grades[data.rules.grades.length - 1];
}

function adjustedPlayer(player: any, position: Position, attr: string, data: any) {
  const source = player.sourcePosition || String(player.pos || "SF").split("/")[0].trim();
  const sourceAverage = data.positions[source]?.averages?.[attr] || 1;
  const targetAverage = data.positions[position].averages[attr] || sourceAverage;
  const value = Math.round(Number(player.raw[attr] || 0) * Math.min(1, targetAverage / sourceAverage));
  return { ...player, playerId: player.id, attr, attrCN: data.attrCN[attr], value, grade: gradeFor(value, data) };
}

const DRAFT_EVENTS = [
  { id: "draft_entry", title: "选秀前夜", phase: "生涯开始", body: "选秀大会前一晚，经纪人问你：明天想让联盟先记住你什么？", choices: [
    { label: "仔细看球探报告", hint: "更清楚自己的定位", effects: ["媒体好感+1"], invalid: [] },
    { label: "关掉手机睡觉", hint: "让身体先休息", effects: ["状态波动-1"], invalid: [] },
  ] },
  { id: "draft_agent", title: "经纪团队", phase: "生涯开始", body: "大牌公司、中型团队或家人朋友团队，会决定未来十年的说话方式。", choices: [
    { label: "大牌经纪公司", hint: "适合冲商业与曝光", effects: ["人气+2", "商业价值+1", "媒体压力+1"], invalid: [] },
    { label: "中型团队", hint: "最稳妥的竞技路线", effects: ["教练信任+1"], invalid: [] },
    { label: "家人朋友团队", hint: "适合忠诚路线", effects: ["忠诚+2", "商业价值-1"], invalid: [] },
  ] },
  { id: "draft_prep", title: "试训策略", phase: "生涯开始", body: "联合试训曝光最高，单独试训最稳，不试训会明显拖累顺位。", choices: [
    { label: "参加联合试训", hint: "顺位上限最高，但有 10% 受伤风险", effects: ["顺位修正 0～+3", "受伤时状态波动+1", "受伤时媒体压力+1"], invalid: [] },
    { label: "只参加单独试训", hint: "推荐：稳定抬升教练信任", effects: ["45% 概率顺位+1", "教练信任+1"], invalid: [] },
    { label: "不试训", hint: "不推荐：顺位必然下滑", effects: ["顺位修正-2～-5", "争议+1", "媒体好感-1"], invalid: [] },
  ] },
  { id: "draft_result", title: "选秀顺位判定", phase: "生涯开始", body: "最终综合评分叠加试训修正后决定档位：88+ 为前五，84+ 为乐透，78+ 为首轮，70+ 为次轮，否则落选。", choices: [
    { label: "综合评分 88+", hint: "首轮第 1～5 顺位", effects: ["4 年合同"], invalid: [] },
    { label: "综合评分 84～87", hint: "首轮第 6～14 顺位", effects: ["4 年合同"], invalid: [] },
    { label: "综合评分 78～83", hint: "首轮第 15～30 顺位", effects: ["3～4 年合同"], invalid: [] },
    { label: "综合评分 70～77", hint: "次轮第 31～45 顺位", effects: ["2 年合同"], invalid: [] },
    { label: "综合评分低于 70", hint: "落选", effects: ["1 年起步合同"], invalid: [] },
  ] },
  { id: "draft_press", title: "新秀发布会", phase: "加盟球队", body: "媒体回应只改变人物档案与下赛季压力，不直接增加 13 项建球属性。", choices: [
    { label: "谦逊回应", hint: "推荐：最稳健", effects: ["媒体好感+1", "媒体压力-1"], invalid: [] },
    { label: "自信回应", hint: "适合冲人气", effects: ["人气+1", "争议+1"], invalid: [] },
    { label: "沉默寡言", hint: "适合球迷路线", effects: ["球迷支持+1", "媒体好感-1"], invalid: [] },
  ] },
  { id: "draft_first_practice", title: "教练角色谈话", phase: "加盟球队", body: "教练要求你先接受球队需要的定位。这里直接影响教练信任与赛季稳定性。", choices: [
    { label: "接受定位", hint: "推荐：最快进入轮换", effects: ["教练信任+2"], invalid: [] },
    { label: "争取更多球权", hint: "高风险野心路线", effects: ["教练信任-1", "状态波动+1"], invalid: [] },
    { label: "用表现说话", hint: "次优：稳定发展", effects: ["教练信任+1", "状态波动-1"], invalid: [] },
  ] },
];

function Grade({ grade, value }: { grade: any; value?: number }) {
  return <span className="grade" style={{ "--grade": grade.color } as React.CSSProperties}>{value != null && <strong>{value}</strong>}<em>{grade.letter}</em></span>;
}

function PositionTabs({ value, onChange, compact = false }: { value: Position; onChange: (p: Position) => void; compact?: boolean }) {
  return <div className={`segmented position-tabs ${compact ? "compact" : ""}`} aria-label="选择球场位置">{POSITIONS.map((pos) => <button key={pos} className={value === pos ? "active" : ""} data-pos={pos} onClick={() => onChange(pos)} aria-pressed={value === pos}><span>{POSITION_NAMES[pos]}</span>{!compact && <small>{POSITION_HINTS[pos]}</small>}</button>)}</div>;
}

function Headshot({ player, data, size = 72 }: { player: any; data: any; size?: number }) {
  const sprite = data.headshots?.positions?.[player.name];
  if (!sprite) return <div className="avatar-fallback" style={{ width: size, height: size }}>{player.cname?.slice(0, 1) || "球"}</div>;
  const scale = size / data.headshots.size;
  return <div className="headshot" style={{ width: size, height: size }} aria-hidden="true"><div style={{ width: data.headshots.size, height: data.headshots.size, transform: `scale(${scale})`, transformOrigin: "top left", backgroundImage: `url(${data.headshots.files[sprite.sheet].local})`, backgroundPosition: `-${sprite.x}px -${sprite.y}px` }} /></div>;
}

function PlayerLine({ player, data, rank }: { player: any; data: any; rank?: number }) {
  return <div className="player-line">{rank != null && <span className={`rank rank-${rank}`}>{String(rank).padStart(2, "0")}</span>}{rank != null && rank <= 3 ? <Headshot player={player} data={data} size={48} /> : <img className="team-mark tiny" src={`/teams/${player.team}.png`} alt="" />}<span className="player-name"><strong>{player.cname}</strong><small>{data.teamNames[player.team]} · {player.pos}</small></span><Grade grade={player.grade} value={player.value} /></div>;
}

function SectionHeading({ eyebrow, title, text, aside }: { eyebrow: string; title: string; text: string; aside?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="sr-only">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{aside && <div className="heading-aside">{aside}</div>}</div>;
}

function scoreChoice(choice: any, pos: Position, route: string, data: any) {
  let score = 0; const effectText = [...(choice.effects || []), choice.hint || ""].join(" ");
  Object.entries(data.attrCN).forEach(([key, label]) => { const match = effectText.match(new RegExp(`${label}\\+(\\d+)`)); if (match) score += Number(match[1]) * (data.positions[pos].weights[key] || 0.04) * 120; });
  if (/关键/.test(effectText)) score += route === "冲击奖项" ? 10 : 5;
  if (/球队默契|更衣室信任|教练信任/.test(effectText)) score += route === "提高胜率" ? 15 : 6;
  if (/legacyBonus|长期标签|领导力/.test(effectText)) score += route === "长期成长" ? 14 : 5;
  if (/状态波动略降|伤病风险下降|伤病风险降低|恢复/.test(effectText)) score += route === "稳健健康" ? 20 : 6;
  if (/伤病风险上升|伤病风险提高/.test(effectText)) score -= route === "稳健健康" ? 22 : 5;
  if (/耐力\+/.test(effectText)) score -= 2;
  if (/商业价值|媒体好感|球迷|人气/.test(effectText)) score += route === "长期成长" ? 5 : 2;
  if (/争议值\+/.test(effectText)) score -= route === "稳健健康" ? 8 : 2;
  return score;
}

function Hero({ data }: { data: any }) {
  return <header className="hero" id="top"><div className="hero-glow one" /><div className="hero-glow two" /><div className="hero-inner shell"><div className="source-pill"><span /> 游戏当前源码版 · 更新于 {cnDate(data.meta.extractedAt)}</div><h1>把每一次选择，<br /><span>变成传奇的最优解。</span></h1><p className="hero-copy">从 525 名球员中夺取 13 项属性。先选位置，本站会直接告诉你该拿谁、剧情怎么选、怎样提高胜率与奖项概率。</p><div className="hero-actions"><a className="button primary" href="#optimal">开始选球员 <span>↓</span></a><a className="button secondary" href="#story">查看剧情最优解</a></div><div className="hero-stats"><div><strong>{data.meta.playerCount}</strong><span>确定性球员</span></div><div><strong>5 × 13</strong><span>位置属性榜</span></div><div><strong>{data.events.staged.length}</strong><span>当前剧情事件</span></div><div><strong>{data.titles.length}</strong><span>档案称号</span></div></div></div></header>;
}

function OptimalSection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG");
  const picks = useMemo(() => [...data.optimal[pos]].sort((a, b) => b.weight - a.weight), [data, pos]);
  return <section id="optimal" className="section shell"><SectionHeading eyebrow="第一步 · 建球答案" title="无冲突最优组合" text="同一名球员只能选择一次。13 项按当前位置权重做全局匹配；每项替补已全部展开，方便一眼比较。" aside={<span className="method-chip">精确匹配算法</span>} /><PositionTabs value={pos} onChange={setPos} /><div className="position-banner" data-pos={pos}><div><span>当前位置</span><strong>{POSITION_NAMES[pos]}</strong><p>{POSITION_HINTS[pos]}</p></div><div className="weight-list"><span>最重要的三项</span>{picks.slice(0, 3).map((p) => <b key={p.attr}>{p.attrCN} {Math.round(p.weight * 100)}%</b>)}</div></div><div className="optimal-grid">{picks.map((pick, index) => { const differs = pick.selected.playerId !== pick.absoluteBest.playerId; return <article className="pick-card" key={pick.attr}><div className="pick-top"><span className="attr-index">{String(index + 1).padStart(2, "0")}</span><div><small>权重 {Math.round(pick.weight * 100)}%</small><h3>{pick.attrCN}</h3></div><Grade grade={pick.selected.grade} value={pick.selected.value} /></div><div className="featured-player"><Headshot player={pick.selected} data={data} size={76} /><div><strong>{pick.selected.cname}</strong><span>{data.teamNames[pick.selected.team]} · {pick.selected.pos}</span></div></div>{differs ? <div className="conflict-note"><span>单项最高</span><b>{pick.absoluteBest.cname} · {pick.absoluteBest.value}</b><p>最高者被分配给贡献更大的属性。</p></div> : <div className="best-note">同时也是该项全库最高</div>}<div className="replacement-block"><span>常驻替补 · 按顺序替换</span><div className="alternatives">{pick.alternatives.map((p: any, i: number) => <div className="replacement-line" key={p.playerId}><PlayerLine player={p} data={data} /><small>第 {i + 1} 替补 · 替换 {pick.selected.cname} · 少 {pick.selected.value - p.value} 点</small></div>)}</div></div></article>; })}</div></section>;
}

function TeamSection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG");
  const [team, setTeam] = useState("ATL");
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const roster = useMemo(() => data.players.filter((p: any) => p.team === team), [data, team]);
  const excludedIds = useMemo(() => excluded[team] || [], [excluded, team]);
  const attrBest = useMemo(() => data.attrs.map((attr: string) => {
    const candidates = roster.filter((p: any) => !excludedIds.includes(p.id)).map((p: any) => adjustedPlayer(p, pos, attr, data));
    candidates.sort((a: any, b: any) => b.value - a.value || b.raw?.[attr] - a.raw?.[attr] || a.cname.localeCompare(b.cname, "zh-CN"));
    return { attr, player: candidates[0] || null };
  }), [data, pos, roster, excludedIds]);
  const holderIds = new Set(attrBest.map((item: any) => item.player?.playerId).filter(Boolean));
  const rosterSorted = [...roster].sort((a: any, b: any) => Number(holderIds.has(b.id)) - Number(holderIds.has(a.id)) || b.ovr - a.ovr);
  const visibleRoster = rosterSorted.filter((p: any) => `${p.cname}${p.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const primary = attrBest.map(({ attr, player }: any) => player ? ({ ...player, contribution: player.value * data.positions[pos].weights[attr] }) : null).filter(Boolean).sort((a: any, b: any) => b.contribution - a.contribution)[0];
  function togglePlayer(id: string) { setExcluded((prev) => ({ ...prev, [team]: (prev[team] || []).includes(id) ? (prev[team] || []).filter((x) => x !== id) : [...(prev[team] || []), id] })); }
  return <section id="team" className="section shell"><SectionHeading eyebrow="第二步 · 临场速查" title="随机到这支队，每项应该选谁？" text="五个位置都常驻展示完整 13 项。若球员已被使用，直接排除他，所有属性会即时重算下一位。" /><div className="team-sticky"><PositionTabs value={pos} onChange={setPos} compact /><div className="selected-team"><img src={`/teams/${team}.png`} alt="" /><span>{data.teamNames[team]}</span><small>{POSITION_NAMES[pos]} · 已排除 {excludedIds.length} 人</small></div></div><div className="team-picker" aria-label="选择球队">{Object.keys(data.teamNames).map((code) => <button key={code} className={team === code ? "active" : ""} onClick={() => { setTeam(code); setQuery(""); }} title={data.teamNames[code]}><img src={`/teams/${code}.png`} alt="" /><span>{data.teamNames[code]}</span></button>)}</div><div className="team-result"><div className="team-result-head"><img src={`/teams/${team}.png`} alt="" /><div><small>{POSITION_NAMES[pos]} · 当前第一优先</small><h3>{data.teamNames[team]}</h3></div>{primary && <div className="primary-summary"><span>{primary.attrCN}</span><strong>{primary.cname}</strong><Grade grade={primary.grade} value={primary.value} /></div>}</div><div className="team-best-grid">{attrBest.map(({ attr, player }: any, index: number) => <article key={attr} className="attribute-pick-card"><span className="attribute-order">{String(index + 1).padStart(2, "0")}</span><h4>{data.attrCN[attr]}</h4>{player ? <><strong>{player.cname}</strong><Grade grade={player.grade} value={player.value} /><small>{data.teamNames[player.team]} · {player.pos}</small></> : <p>已无可用球员</p>}</article>)}</div><div className="exclude-panel"><div className="exclude-head"><div><span>球员排除器</span><p>最高项球员优先排列；排除状态在本队五个位置间共享。</p></div><button onClick={() => setExcluded((prev) => ({ ...prev, [team]: [] }))} disabled={!excludedIds.length}>一键清空</button></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索完整队内名单" aria-label="搜索队内球员" /><div className="roster-options">{visibleRoster.map((p: any) => { const isExcluded = excludedIds.includes(p.id); return <button key={p.id} className={isExcluded ? "excluded" : ""} onClick={() => togglePlayer(p.id)} aria-pressed={isExcluded}><span>{holderIds.has(p.id) ? "当前最高" : p.pos}</span><strong>{p.cname}</strong><em>{isExcluded ? "恢复" : "排除"}</em></button>; })}</div></div></div></section>;
}

function RankingsSection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG"); const [attr, setAttr] = useState("threePT");
  const list = data.rankings[pos][attr].slice(0, 30);
  return <section id="rankings" className="section shell"><SectionHeading eyebrow="第三步 · 完整榜单" title="五位置 × 十三属性排行" text="每项前 30 全部常驻展示：前 10 完整高亮，第 11—30 紧凑速查。数值与游戏字母评级完全同步。" /><PositionTabs value={pos} onChange={setPos} compact /><div className="attr-tabs" role="tablist">{data.attrs.map((key: string) => <button key={key} className={attr === key ? "active" : ""} onClick={() => setAttr(key)}>{data.attrCN[key]}</button>)}</div><div className="ranking-panel"><div className="ranking-head"><div><span>{POSITION_NAMES[pos]}</span><h3>{data.attrCN[attr]}榜</h3><p>{data.attrDesc[attr]}</p></div><div className="leader-mini"><span>最高值</span><Headshot player={list[0]} data={data} size={64} /><strong>{list[0].cname}</strong><Grade grade={list[0].grade} value={list[0].value} /></div></div><div className="ranking-list">{list.map((player: any, index: number) => <div className={index >= 10 ? "ranking-compact" : "ranking-featured"} key={`${player.playerId}-${index}`}><PlayerLine player={player} data={data} rank={index + 1} /></div>)}</div></div><div className="formula-note"><strong>跨位置衰减</strong><p>实得值 = 四舍五入（原值 × 较小值〔1，目标位置该属性平均值 ÷ 球员主位置该属性平均值〕）。只衰减，不会跨位置增益。</p></div></section>;
}

/* eslint-disable jsx-a11y/label-has-associated-control */
function StorySection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG"); const [route, setRoute] = useState(ROUTES[0]); const [query, setQuery] = useState(""); const [branch, setBranch] = useState("draft_night");
  const byBranch = useMemo(() => Object.fromEntries(Object.keys(BRANCH_LABELS).filter((key) => key !== "draft_night").map((key) => [key, data.events.staged.filter((e: any) => e.branch === key)])), [data]);
  const events = branch === "draft_night" ? DRAFT_EVENTS : (byBranch[branch] || []);
  const q = query.trim().toLowerCase();
  const branchMatches = (key: string) => !q || `${BRANCH_LABELS[key]} ${(key === "draft_night" ? DRAFT_EVENTS : byBranch[key] || []).map((e: any) => `${e.title}${e.body}`).join(" ")}`.toLowerCase().includes(q);
  function goalLabel(choice: any, order: number) { const text = `${choice.label}${choice.hint}${(choice.effects || []).join(" ")}`; if (order === 0) return "当前位置最优"; if (/伤病|恢复|状态波动|身体/.test(text)) return "保身体"; if (/商业|人气|媒体|球迷/.test(text)) return "提商业"; if (/历史|传奇|关键|冠军/.test(text)) return "冲传奇"; return "特殊路线"; }
  return <section id="story" className="section shell"><SectionHeading eyebrow="第四步 · 故事线" title="按事件线，一次看清全部流程" text="先选剧情线，整条路线会从触发条件到最终影响完整展开；不再逐条点开。选秀前置线固定排在第一位。" aside={<span className="method-chip">当前主剧情 {data.events.staged.length} 条</span>} /><div className="story-controls glass-panel"><div><label>我的位置</label><PositionTabs value={pos} onChange={setPos} compact /></div><div><label>本轮目标</label><div className="segmented route-tabs">{ROUTES.map((r) => <button key={r} className={route === r ? "active" : ""} onClick={() => setRoute(r)}>{r}</button>)}</div></div><div><label htmlFor="event-search">查找事件线</label><input id="event-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="如：中国男篮、伤病、商业" /></div></div><div className="branch-directory">{BRANCH_GROUPS.map((group) => <div key={group.name}><span>{group.name}</span><div>{group.branches.filter(branchMatches).map((key) => <button key={key} className={branch === key ? "active" : ""} onClick={() => setBranch(key)}><strong>{BRANCH_LABELS[key]}</strong><small>{key === "draft_night" ? DRAFT_EVENTS.length : (byBranch[key]?.length || 0)} 个阶段</small></button>)}</div></div>)}</div><div className="flow-header"><div><span>当前路线</span><h3>{BRANCH_LABELS[branch]}</h3></div><p>{branch === "draft_night" ? "建球完成后必定触发；试训策略会改变选秀顺位，人物档案数值不会直接改动 13 项属性。" : "完成上一阶段并满足源码中的分支条件后触发；未进入该线时，后续节点不会单独出现。"}</p></div>{branch === "china_team" && <div className="branch-insight"><strong>真实分支速记</strong><p>首次接受 → 定位之争 → 绝对核心 → 国际大赛关键战；首次婉拒不会终止，而会进入“再一次电话”，之后仍可回主线、继续婉拒或承诺未来窗口。</p><div><span>自己解决：58% 胜率，赢球后关键 +2</span><span>团队篮球：68% 胜率，传球 +1～2</span><span>带伤坚持：历史加成 +5，伤病风险大幅上升</span></div></div>}<div className="event-flow">{events.map((event: any, stageIndex: number) => { const ranked = (event.choices || []).map((choice: any, i: number) => ({ choice, i, score: scoreChoice(choice, pos, route, data) })).sort((a: any, b: any) => b.score - a.score); return <article className="flow-stage" key={event.id}><div className="flow-rail"><span>{String(stageIndex + 1).padStart(2, "0")}</span><i /></div><div className="flow-card"><div className="flow-card-head"><div><small>{event.phase === "offseason" ? "休赛期" : event.phase || "生涯事件"}</small><h3>{event.title}</h3></div><span>{stageIndex === 0 ? "触发入口" : "前置分支达成后"}</span></div><p className="event-copy">{event.body}</p><div className="choice-list">{ranked.map(({ choice, i }: any, order: number) => <div className={`choice ${order === 0 ? "recommended" : ""}`} key={`${event.id}-${i}`}><span className="choice-rank">{goalLabel(choice, order)}</span><div><h4>{choice.label}</h4><p>{choice.hint || "推进当前剧情线"}</p><div className="effect-tags">{(choice.effects || []).map((effect: string, n: number) => <span className={choice.invalid?.length ? "warning" : ""} key={n}>{effect.replace("legacyBonus", "历史加成").replace("fanSupport", "球迷支持").replace("chinaPopularity", "国内人气")}</span>)}</div>{choice.invalid?.length > 0 && <small className="invalid">注意：{choice.invalid.join("；")}</small>}</div></div>)}</div></div></article>; })}</div><div className="warning-panel"><strong>读懂这些加点</strong><div>{data.events.invalidNotes.map((note: string) => <p key={note}>{note}</p>)}</div></div></section>;
}
/* eslint-enable jsx-a11y/label-has-associated-control */

function AwardsSection() {
  const awards = [
    { n: "最有价值球员", key: "先把综合评分做到 92+", text: "达到 92 才进入抽签池；分区前三拥有 2 张票，否则 1 张。31 岁及以上不再参与，连续两届后下一季受限。", accent: "amber" },
    { n: "最佳防守球员", key: "抢断 + 盖帽 ≥ 3.55", text: "还必须带队进入分区前三才能夺奖。合计 3.0 可到第三名，2.5 可到第四名；连续两届后下一季固定为第二名。", accent: "cyan" },
    { n: "最佳阵容", key: "分区前四 + 综合评分 85+", text: "2035 年后基础门槛降到 80。评分约为得分×0.4 + 篮板×0.15 + 助攻×0.15 + 综合评分/99×5；最终全联盟取 5 人且每队最多 1 人，最有价值球员保送。", accent: "violet" },
  ];
  return <section id="awards" className="section shell"><SectionHeading eyebrow="第五步 · 生涯模拟" title="奖项、常规赛与季后赛的底层逻辑" text="把复杂源码压缩成能直接执行的目标线：先看硬门槛，再决定赛季加点。" /><div className="award-grid">{awards.map((a) => <article className={`award-card ${a.accent}`} key={a.n}><span>{a.n}</span><h3>{a.key}</h3><p>{a.text}</p></article>)}</div><div className="win-grid"><article className="logic-card"><span className="logic-num">01</span><h3>胜率只看整队，不只看你</h3><p>系统先按位置排出 5 名首发，再取最强 2 名轮换。首发合计占球队实力 85%，两名替补合计占 15%；球星会按综合评分得到更高份额。</p><b>结论：去阵容完整、同位置竞争较弱的球队，你更容易进入首发并提高整体实力。</b></article><article className="logic-card"><span className="logic-num">02</span><h3>攻、防、深度按 4 : 4 : 2</h3><p>净实力差 = 进攻差×0.4 + 防守差×0.4 + 深度差×0.2。胜率 = 50% + 净实力差÷25，常规赛最终限制在 15%—85%。</p><b>结论：单纯堆得分不够，均衡提升攻防比只追一个华丽属性更能赢球。</b></article><article className="logic-card"><span className="logic-num">03</span><h3>季后赛沿用同一公式</h3><p>季后赛仍使用整队实力，并叠加种子保护；当前源码中的用户季后赛属性减益为 0。比分只是结果后的展示，不会反向改变胜负。</p><b>结论：常规赛争取高种子最重要，关键属性适合补强高压回合，但不替代整队实力。</b></article></div><div className="season-plan"><div><span>赛季加点优先级</span><h3>先补高权重，再补赢球维度</h3></div><div className="season-columns"><p><b>控球后卫</b>手感 → 传球 → 外防 → 三分</p><p><b>得分后卫</b>三分/中投 → 关键 → 终结 → 外防</p><p><b>小前锋</b>终结/外防 → 三分/中投 → 内防 → 运动</p><p><b>大前锋</b>终结/内防 → 篮板/外防 → 力量</p><p><b>中锋</b>终结/内防 → 盖帽/篮板 → 力量</p></div></div></section>;
}

const LEGACY = [
  { tier: "历史最佳级别", score: "特殊硬条件", note: "最有价值球员 ≥ 5、总冠军 ≥ 6、总决赛最有价值球员 ≥ 6，且三项合计 ≥ 18。" },
  { tier: "历史前十级别", score: "180 分", note: "冠军和最有价值球员权重最高，适合王朝路线。" },
  { tier: "历史前二十级别", score: "155 分", note: "稳定拿最佳阵容、全明星并积累得分和出场。" },
  { tier: "历史百大", score: "140 分", note: "同时自动满足历史百大入选条件。" },
  { tier: "名人堂稳进", score: "100 分", note: "无随机，达到即入选。" },
  { tier: "名人堂边缘", score: "75 分", note: "75—99 分按 25% 起的递增概率入选。" },
  { tier: "队史传奇", score: "60 分", note: "长期效力一队更容易达成。" },
];

function LegacySection({ data }: { data: any }) {
  return <section id="legacy" className="section shell"><SectionHeading eyebrow="第六步 · 历史地位" title="历史档位如何结算？" text="历史分不是综合评分。荣誉、累积数据、忠诚度与告别剧情会共同计分；历史最佳级别另有独立硬条件。" /><div className="legacy-layout"><div className="legacy-tiers">{LEGACY.map((row, i) => <div key={row.tier} className={i === 0 ? "goat" : ""}><span>{String(i + 1).padStart(2, "0")}</span><strong>{row.tier}</strong><b>{row.score}</b><p>{row.note}</p></div>)}</div><aside className="score-card"><span>历史分公式</span><p><b>总冠军</b> × 18</p><p><b>最有价值球员</b> × 16</p><p><b>总决赛最有价值球员</b> × 14</p><p><b>最佳防守球员</b> × 10</p><p><b>最佳阵容</b> × 5 · <b>全明星</b> × 3</p><hr /><p>每 2500 分生涯总得分 +1，最多 35</p><p>每 120 场 +1，最多 18</p><p>同队 8 年+：+10 · 最终评分 94+：+8</p><p>告别剧情：最多额外 +7，带伤告别 -1</p></aside></div><TitleLibrary data={data} /></section>;
}

function TitleLibrary({ data }: { data: any }) {
  const [query, setQuery] = useState(""); const [tag, setTag] = useState("全部"); const tags = ["全部", ...Array.from(new Set(data.titles.flatMap((t: any) => t.tags))) as string[]];
  const filtered = data.titles.filter((t: any) => (tag === "全部" || t.tags.includes(tag)) && t.title.includes(query));
  return <div className="title-library"><div className="title-library-head"><div><span className="eyebrow">档案称号库</span><h3>100 个称号，实际按标签池确定</h3><p>先根据生涯生成标签；含有最多匹配标签的称号进入候选池，再用存档编号稳定抽取。相同条件不保证得到同一个名称。</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="查找称号" /></div><div className="tag-tabs">{tags.map((t) => <button key={t} className={tag === t ? "active" : ""} onClick={() => setTag(t)}>{t === "全部" ? "全部" : TAG_LABELS[t]}</button>)}</div><div className="title-grid">{filtered.map((item: any) => <article key={item.id}><span>{item.tags.map((t: string) => TAG_LABELS[t]).join(" · ")}</span><h4>{item.title}</h4><p>{item.tags.map((t: string) => TAG_LABELS[t]).join(" ＋ ")}</p></article>)}</div><div className="title-rule"><strong>判定条件速记</strong><div>{Object.entries(TAG_LABELS).map(([k, v]) => <p key={k}><span>{v}</span>{k === "champion" ? "至少 1 次总冠军" : k === "dynasty" ? "至少 3 次总冠军" : k === "mvp" ? "至少 1 次最有价值球员" : k === "fmvp" ? "至少 1 次总决赛最有价值球员" : k === "defense" ? "至少 1 次最佳防守球员" : k === "allstar" ? "至少 1 次全明星" : v}</p>)}</div></div></div>;
}

function UpdateSection({ data }: { data: any }) {
  return <section id="updates" className="section shell"><SectionHeading eyebrow="版本核验" title={`本次数据更新于 ${cnDate(data.meta.extractedAt)}`} text="以游戏当前嵌入页实际加载源码为唯一权威，并与 2026 年 7 月 20 日旧站快照逐项比较。" /><div className="update-grid"><article className="update-primary"><span>新增确定性球员</span><h3>{data.diff.added.length}</h3>{data.diff.added.map((p: any) => <div key={p.name}><img src={`/teams/${p.team}.png`} alt="" /><strong>{p.cname}</strong><p>{data.teamNames[p.team]} · 综合评分 {p.ovr}</p></div>)}</article><article><span>属性改动</span><h3>{data.diff.attributeChanges.length}</h3><p>与旧快照相比，525 人确定性属性未发现数值改动。</p></article><article><span>榜单改动</span><h3>{data.diff.leaderboardChanges.length}</h3><p>五位置前 20 暂未检测到排序变化。</p></article><article><span>2026 届新秀</span><h3>随机生成</h3><p>生涯模式新秀已加入，但属性由代码每局随机生成，因此不进入静态建球榜。</p></article></div><div className="verification-note"><strong>关于“米里克·托马斯”</strong><p>当前确定性球员脚本未发现该姓名或对应英文名，骑士名单也没有此人。骑士的托马斯相关球员为托马斯-布莱恩特（中锋，篮板 80、力量 80）；黄蜂锡安-詹姆斯在控卫位置的实得力量为 77。本站不把无法从当前源码验证的球员写入榜单。</p></div></section>;
}

const NAV = [["最优组合", "#optimal"], ["球队速查", "#team"], ["属性榜", "#rankings"], ["剧情", "#story"], ["奖项", "#awards"], ["历史", "#legacy"]];

export default function GuideApp({ data }: { data: any }) {
  return <main><nav className="top-nav"><a className="brand" href="#top"><span>传</span><strong>传奇球星攻略</strong></a><div>{NAV.map(([n, href]) => <a key={href} href={href}>{n}</a>)}</div><a className="update-nav" href="#updates">{cnDate(data.meta.extractedAt)} 版</a></nav><Hero data={data} /><div className="quick-nav shell">{NAV.map(([n, href], i) => <a key={href} href={href}><span>{String(i + 1).padStart(2, "0")}</span>{n}</a>)}</div><OptimalSection data={data} /><TeamSection data={data} /><RankingsSection data={data} /><StorySection data={data} /><AwardsSection /><LegacySection data={data} /><UpdateSection data={data} /><footer><div className="shell"><div><strong>打造我的传奇球星 · 全方位攻略</strong><p>数据来自游戏当前公开前端源码；玩法可能随游戏更新而变化。</p></div><a href="#top">回到顶部 ↑</a></div></footer><div className="mobile-nav">{NAV.map(([n, href], i) => <a key={href} href={href}><span>{i + 1}</span>{n}</a>)}</div><a className="back-top" href="#top" aria-label="回到顶部">↑</a></main>;
}
