"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useMemo, useState } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
const POSITION_NAMES: Record<string, string> = { PG: "控球后卫", SG: "得分后卫", SF: "小前锋", PF: "大前锋", C: "中锋" };
const POSITION_HINTS: Record<string, string> = {
  PG: "控场优先：手感、传球与外防", SG: "火力优先：三分、中投与关键球", SF: "全能优先：攻防均衡与运动能力", PF: "锋线支点：终结、内防与篮板", C: "禁区核心：终结、护筐、篮板与力量",
};
const ROUTES = ["冲击奖项", "提高胜率", "长期成长", "稳健健康"];
const TAG_LABELS: Record<string, string> = {
  champion: "总冠军", dynasty: "三冠王朝", mvp: "最有价值球员", fmvp: "总决赛最有价值球员", defense: "最佳防守球员", allstar: "全明星", scorer: "生涯场均得分 25+", playmaker: "生涯场均助攻 7+", big: "生涯场均篮板 10+", longevity: "生涯 12 季+", one_city: "终身一队", multi: "效力 3 队+", clutch: "关键属性 80+", leader: "更衣室信任或领导力 60+", camp: "训练营长期标签", legacy: "历史百大或更高档位",
};
type Position = (typeof POSITIONS)[number];

function cnDate(value: string) { const [y, m, d] = value.split("-"); return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`; }

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
  return <section id="optimal" className="section shell"><SectionHeading eyebrow="第一步 · 建球答案" title="无冲突最优组合" text="同一名球员只能选择一次。这里不是逐项贪最高，而是按该位置权重求出的 13 人全局最优解。" aside={<span className="method-chip">精确匹配算法</span>} /><PositionTabs value={pos} onChange={setPos} /><div className="position-banner" data-pos={pos}><div><span>当前位置</span><strong>{POSITION_NAMES[pos]}</strong><p>{POSITION_HINTS[pos]}</p></div><div className="weight-list"><span>最重要的三项</span>{picks.slice(0, 3).map((p) => <b key={p.attr}>{p.attrCN} {Math.round(p.weight * 100)}%</b>)}</div></div><div className="optimal-grid">{picks.map((pick, index) => { const differs = pick.selected.playerId !== pick.absoluteBest.playerId; return <article className="pick-card" key={pick.attr}><div className="pick-top"><span className="attr-index">{String(index + 1).padStart(2, "0")}</span><div><small>权重 {Math.round(pick.weight * 100)}%</small><h3>{pick.attrCN}</h3></div><Grade grade={pick.selected.grade} value={pick.selected.value} /></div><div className="featured-player"><Headshot player={pick.selected} data={data} size={76} /><div><strong>{pick.selected.cname}</strong><span>{data.teamNames[pick.selected.team]} · {pick.selected.pos}</span></div></div>{differs ? <div className="conflict-note"><span>单项最高</span><b>{pick.absoluteBest.cname} · {pick.absoluteBest.value}</b><p>最高者被留给贡献更大的属性，以避免冲突。</p></div> : <div className="best-note">同时也是该项全库最高</div>}<details><summary>查看 3 名替补</summary><div className="alternatives">{pick.alternatives.map((p: any) => <PlayerLine key={p.playerId} player={p} data={data} />)}</div></details></article>; })}</div></section>;
}

function TeamSection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG"); const [team, setTeam] = useState("ATL"); const advice = data.teamAdvice[pos][team];
  const attrBest = Object.entries(advice.byAttribute).filter(([, v]) => v).map(([key, v]) => ({ key, player: v as any }));
  return <section id="team" className="section shell"><SectionHeading eyebrow="第二步 · 临场速查" title="随机到这支队，这一轮该怎么选？" text="先选你的球场位置，再点球队。系统按当前位置的实得数值和属性权重给出第一推荐、三名替补与队内各项最高。" /><PositionTabs value={pos} onChange={setPos} compact /><div className="team-layout"><div className="team-picker" aria-label="选择球队">{Object.keys(data.teamNames).map((code) => <button key={code} className={team === code ? "active" : ""} onClick={() => setTeam(code)} title={data.teamNames[code]}><img src={`/teams/${code}.png`} alt="" /><span>{data.teamNames[code]}</span></button>)}</div><div className="team-result"><div className="team-result-head"><img src={`/teams/${team}.png`} alt="" /><div><small>{POSITION_NAMES[pos]} · 第一推荐</small><h3>{data.teamNames[team]}</h3></div></div><div className="primary-pick"><Headshot player={advice.primary} data={data} size={104} /><div><span>优先夺取「{advice.primary.attrCN}」</span><h3>{advice.primary.cname}</h3><p>该项贡献 {advice.primary.contribution.toFixed(2)} · 球员位置 {advice.primary.pos}</p></div><Grade grade={advice.primary.grade} value={advice.primary.value} /></div><div className="backup-row"><span>如果没刷到，依次选择</span>{advice.backups.map((p: any, i: number) => <div key={p.playerId}><b>{i + 1}</b><span><strong>{p.cname}</strong><small>{p.attrCN} · {p.value}</small></span><em style={{ color: p.grade.color }}>{p.grade.letter}</em></div>)}</div><details className="team-detail"><summary>查看这支球队 13 项队内最高</summary><div className="team-best-grid">{attrBest.map(({ key, player }) => <div key={key}><span>{data.attrCN[key]}</span><strong>{player.cname}</strong><Grade grade={player.grade} value={player.value} /></div>)}</div></details></div></div></section>;
}

function RankingsSection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG"); const [attr, setAttr] = useState("threePT"); const [expanded, setExpanded] = useState(false);
  const list = data.rankings[pos][attr].slice(0, expanded ? 30 : 20);
  return <section id="rankings" className="section shell"><SectionHeading eyebrow="第三步 · 完整榜单" title="五位置 × 十三属性排行" text="数值为球员放到当前目标位置后的实得值，字母评级与游戏完全同步；不混入随机生成属性的 2026 届生涯新秀。" /><PositionTabs value={pos} onChange={(p) => { setPos(p); setExpanded(false); }} compact /><div className="attr-tabs" role="tablist">{data.attrs.map((key: string) => <button key={key} className={attr === key ? "active" : ""} onClick={() => { setAttr(key); setExpanded(false); }}>{data.attrCN[key]}</button>)}</div><div className="ranking-panel"><div className="ranking-head"><div><span>{POSITION_NAMES[pos]}</span><h3>{data.attrCN[attr]}榜</h3><p>{data.attrDesc[attr]}</p></div><div className="leader-mini"><span>最高值</span><Headshot player={list[0]} data={data} size={64} /><strong>{list[0].cname}</strong><Grade grade={list[0].grade} value={list[0].value} /></div></div><div className="ranking-list">{list.map((player: any, index: number) => <PlayerLine key={`${player.playerId}-${index}`} player={player} data={data} rank={index + 1} />)}</div><button className="expand-button" onClick={() => setExpanded(!expanded)}>{expanded ? "收起第 21—30 名" : "展开第 21—30 名"}<span>{expanded ? "↑" : "↓"}</span></button></div><div className="formula-note"><strong>跨位置衰减</strong><p>实得值 = 四舍五入（原值 × 较小值〔1，目标位置该属性平均值 ÷ 球员主位置该属性平均值〕）。只衰减，不会跨位置增益。</p></div></section>;
}

/* eslint-disable jsx-a11y/label-has-associated-control */
function StorySection({ data }: { data: any }) {
  const [pos, setPos] = useState<Position>("PG"); const [route, setRoute] = useState(ROUTES[0]); const [query, setQuery] = useState(""); const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => data.events.staged.filter((e: any) => `${e.title}${e.body}${e.branch}`.includes(query.trim())), [data, query]);
  const visible = showAll || query ? filtered : filtered.slice(0, 24);
  return <section id="story" className="section shell"><SectionHeading eyebrow="第四步 · 故事线" title="每一个剧情事件，怎么选最优？" text="推荐会同时考虑当前位置属性权重和你的生涯目标。点开事件即可查看全部选项、直接属性变化与长期影响。" aside={<span className="method-chip">当前有效事件 {data.events.staged.length} 条</span>} /><div className="story-controls glass-panel"><div><label>我的位置</label><PositionTabs value={pos} onChange={setPos} compact /></div><div><label>本轮目标</label><div className="segmented route-tabs">{ROUTES.map((r) => <button key={r} className={route === r ? "active" : ""} onClick={() => setRoute(r)}>{r}</button>)}</div></div><div><label htmlFor="event-search">查找剧情</label><input id="event-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入事件名或关键词" /></div></div><div className="event-list">{visible.map((event: any) => { const ranked = event.choices.map((choice: any, i: number) => ({ choice, i, score: scoreChoice(choice, pos, route, data) })).sort((a: any, b: any) => b.score - a.score); const best = ranked[0]; return <details className="event-card" key={event.id}><summary><div><span>{event.phase === "offseason" ? "休赛期" : event.phase || "生涯事件"} · {event.branch}</span><h3>{event.title}</h3></div><div className="event-answer"><small>推荐选择</small><strong>{best?.choice.label || "按剧情偏好选择"}</strong></div><i>＋</i></summary><div className="event-body"><p className="event-copy">{event.body}</p><div className="choice-list">{ranked.map(({ choice, i }: any, order: number) => <div className={`choice ${order === 0 ? "recommended" : ""}`} key={`${event.id}-${i}`}><span className="choice-rank">{order === 0 ? "最优" : `备选 ${order}`}</span><div><h4>{choice.label}</h4><p>{choice.hint || "剧情推进选项"}</p><div className="effect-tags">{choice.effects.map((effect: string, n: number) => <span className={choice.invalid?.length ? "warning" : ""} key={n}>{effect.replace("legacyBonus", "历史加成").replace("fanSupport", "球迷支持").replace("chinaPopularity", "国内人气")}</span>)}</div>{choice.invalid?.length > 0 && <small className="invalid">注意：{choice.invalid.join("；")}</small>}</div></div>)}</div></div></details>; })}</div>{!query && filtered.length > 24 && <button className="expand-button wide" onClick={() => setShowAll(!showAll)}>{showAll ? "收起全部剧情" : `展开全部 ${filtered.length} 条剧情`}<span>{showAll ? "↑" : "↓"}</span></button>}<div className="warning-panel"><strong>当前版本失效项</strong><div>{data.events.invalidNotes.map((note: string) => <p key={note}>{note}</p>)}</div></div></section>;
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
