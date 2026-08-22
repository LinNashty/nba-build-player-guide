import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const research = path.join(root, "research", "current-2026-08-21");
const dataSource = path.join(research, "2678-5hu3djrc-upload-1783494754597-12.js");
const configSource = path.join(research, "2678-qlg35lrc-upload-1783494754597-24.js");
const spriteSource = path.join(research, "2678-mdo4zerc-upload-1783494754597-21.js");
const liveHtmlSource = "/tmp/live-hupu-legend-app.html";
const htmlSource = fs.existsSync(liveHtmlSource) ? liveHtmlSource : path.join(research, "__ai_app.html");
const oldGuideSource = "/Users/linnashty/Documents/Codex/2026-07-20/visualize-plugin-visualize-openai-bundled/outputs/nba-build-player-guide.html";

function evaluateSource(file, expose) {
  const source = fs.readFileSync(file, "utf8");
  const context = Object.create(null);
  vm.runInNewContext(`${source}\n;globalThis.__EXTRACTED__ = ${expose};`, context, {
    filename: file,
    timeout: 5000,
  });
  return context.__EXTRACTED__;
}

function findBalanced(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced ${openChar}${closeChar} at ${openIndex}`);
}

function extractAssignedArray(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing marker: ${marker}`);
  const open = source.indexOf("[", markerIndex + marker.length);
  const close = findBalanced(source, open, "[", "]");
  return { source: source.slice(open, close + 1), start: open, end: close + 1 };
}

function safeEvaluateArray(arraySource, label) {
  try {
    return vm.runInNewContext(`(${arraySource})`, Object.create(null), { timeout: 3000, filename: label });
  } catch (error) {
    console.warn(`Unable to evaluate ${label}: ${error.message}`);
    return [];
  }
}

function functionSource(value) {
  return typeof value === "function" ? Function.prototype.toString.call(value) : "";
}

const ATTR_LABELS = {
  threePT: "三分", MID: "中投", FIN: "终结", DNK: "扣篮", HAN: "护球", PAS: "传球",
  PDEF: "外防", IDEF: "内防", BLK: "盖帽", REB: "篮板", ATH: "运动", STR: "力量",
  CLU: "关键", STA: "耐力",
};

const PROFILE_LABELS = {
  businessValue: "商业价值", coachTrust: "教练信任", fanFavor: "球迷好感", fanTrust: "球迷好感",
  mediaTrust: "媒体好感", lockerRoomTrust: "更衣室信任", leadership: "领导力", fame: "人气",
  controversy: "争议值",
};

const LEGEND_SCORE_LABELS = {
  classRivalry: "同届竞争", dynasty: "王朝线", individualLegend: "个人传奇",
  cityBond: "城市羁绊", mediaHeat: "媒体热度", mediaTrust: "媒体信任",
  lockerRoom: "更衣室", craft: "技艺路线", playoffMyth: "季后赛神话",
  historyShift: "历史偏移", superteam: "巨星同盟", nationalIcon: "全国偶像",
  legacyCare: "生涯照护", commercialPull: "商业拉力", nextFacePressure: "接班压力",
  oldSchoolRespect: "老派认可",
};

function summarizeChoice(choice) {
  const code = functionSource(choice.apply);
  const effects = [];
  const invalid = [];
  for (const match of code.matchAll(/addAttrDelta\(\s*['"]([^'"]+)['"]\s*,\s*(-?\d+)/g)) {
    const [, key, amount] = match;
    if (key === "STA") invalid.push("耐力加点：当前属性列表没有 STA，代码会直接忽略");
    else effects.push(`${ATTR_LABELS[key] || key}${Number(amount) >= 0 ? "+" : ""}${amount}`);
  }
  for (const match of code.matchAll(/addProfileDelta\(\s*['"]([^'"]+)['"]\s*,\s*(-?\d+)/g)) {
    const [, key, amount] = match;
    effects.push(`${PROFILE_LABELS[key] || key}${Number(amount) >= 0 ? "+" : ""}${amount}`);
  }
  for (const match of code.matchAll(/addLegendStoryScore\(\s*['"]([^'"]+)['"]\s*,\s*(-?\d+)/g)) {
    const [, key, amount] = match;
    effects.push(`${LEGEND_SCORE_LABELS[key] || key}${Number(amount) >= 0 ? "+" : ""}${amount}`);
  }
  if (/injuryRiskBonus/.test(code)) effects.push("改变下赛季伤病风险");
  if (/formVariance/.test(code)) effects.push("改变下赛季状态波动");
  if (/teamChemistry/.test(code)) effects.push("改变球队默契");
  if (/flags\./.test(code) || /setBranchNode|advanceBranch/.test(code)) effects.push("推进剧情或写入长期标签");
  return {
    label: choice.label || "未命名选项",
    hint: choice.hint || "",
    lockHint: choice.lockHint || "",
    effects: [...new Set(effects)],
    invalid: [...new Set(invalid)],
    effectCode: code,
    requiresCode: functionSource(choice.requires),
  };
}

function normalizeEvent(event, family) {
  return {
    id: event.id || event.key || `${family}-${event.title || "event"}`,
    family,
    branch: event.branch || "随机事件",
    phase: event.phase || event.when || "赛季中",
    slot: event.slot || "",
    weight: event.weight ?? null,
    title: event.title || "未命名事件",
    body: event.body || event.scene || "",
    scenes: Array.isArray(event.scenes) ? event.scenes : [],
    choices: Array.isArray(event.choices) ? event.choices.map(summarizeChoice) : [],
    requiresCode: functionSource(event.requires || event.condition),
    hooks: event.hooks ? Object.keys(event.hooks) : [],
  };
}

function extractRegistryEvents(html) {
  const events = [];
  const token = "EVENT_REGISTRY.push(";
  let cursor = 0;
  while (true) {
    const start = html.indexOf(token, cursor);
    if (start < 0) break;
    const open = html.indexOf("(", start + token.length - 1);
    const close = findBalanced(html, open, "(", ")");
    const objectSource = html.slice(open + 1, close);
    try {
      const event = vm.runInNewContext(`(${objectSource})`, Object.create(null), { timeout: 500, filename: "event-registry" });
      events.push(normalizeEvent(event, "赛季随机事件"));
    } catch {
      const title = objectSource.match(/title\s*:\s*['"]([^'"]+)/)?.[1] || "待实测事件";
      events.push({ id: `registry-${events.length + 1}`, family: "赛季随机事件", title, body: "", choices: [], parsePending: true });
    }
    cursor = close + 1;
  }
  return events;
}

function grade(value) {
  if (value >= 95) return { letter: "A+", color: "#ff6b6b" };
  if (value >= 90) return { letter: "A", color: "#ff8787" };
  if (value >= 85) return { letter: "A-", color: "#ffa07a" };
  if (value >= 80) return { letter: "B+", color: "#ffd43b" };
  if (value >= 75) return { letter: "B", color: "#ffd43b" };
  if (value >= 70) return { letter: "B-", color: "#ffd43b" };
  if (value >= 65) return { letter: "C+", color: "#69db7c" };
  if (value >= 60) return { letter: "C", color: "#69db7c" };
  if (value >= 55) return { letter: "C-", color: "#69db7c" };
  if (value >= 50) return { letter: "D+", color: "#74c0fc" };
  if (value >= 45) return { letter: "D", color: "#74c0fc" };
  if (value >= 40) return { letter: "D-", color: "#74c0fc" };
  return { letter: "F", color: "#868e96" };
}

function mainPosition(player, posAvg) {
  const key = String(player.pos || "SF").split("/")[0].trim();
  return posAvg[key] ? key : "SF";
}

function adjustedValue(player, position, attr, config) {
  const sourcePosition = mainPosition(player, config.POS_AVG);
  const sourceAverage = config.POS_AVG[sourcePosition]?.[attr];
  const targetAverage = config.POS_AVG[position]?.[attr];
  const penalty = !sourceAverage || sourceAverage <= 0 ? 1 : Math.min(1, targetAverage / sourceAverage);
  const raw = Number(player[attr] ?? 0);
  return { raw, penalty, value: Math.round(raw * penalty), sourcePosition };
}

function hungarianMin(cost) {
  const n = cost.length;
  const m = cost[0].length;
  const u = Array(n + 1).fill(0);
  const v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0);
  const way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity);
    const used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= m; j += 1) if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  return assignment;
}

function htmlDecode(value) {
  return value
    .replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function extractOldGuide() {
  if (!fs.existsSync(oldGuideSource)) return null;
  const html = fs.readFileSync(oldGuideSource, "utf8");
  const startToken = "const GUIDE = ";
  const start = html.indexOf(startToken);
  if (start < 0) return null;
  const jsonStart = start + startToken.length;
  const end = html.indexOf(";\n  const state", jsonStart);
  if (end < 0) return null;
  return JSON.parse(htmlDecode(html.slice(jsonStart, end)));
}

const current = evaluateSource(dataSource, "({ NBA2K_DATA, NBA2K_TEAMS })");
const config = evaluateSource(configSource, "SIM_CONFIG");
const sprites = evaluateSource(spriteSource, "({ SPRITE_FILES, SPRITE_SIZE, SPRITE_POS })");
const html = fs.readFileSync(htmlSource, "utf8");
const attrs = [...config.ATTR_LIST];
const positions = [...config.POS_LIST];
const players = [];
const currentNameFixes = { "Tamar Bates": "塔马尔-贝茨", "Trey Lyles": "特雷-莱尔斯" };
for (const team of current.NBA2K_TEAMS) {
  (current.NBA2K_DATA[team] || []).forEach((player, index) => {
    players.push({
      id: `${team}-${index}`,
      team,
      name: player.name,
      cname: currentNameFixes[player.name] || player.cname || player.name,
      pos: player.pos || "SF",
      sourcePosition: mainPosition(player, config.POS_AVG),
      ovr: Number(player.ovr || 0),
      type: player.type || "",
      raw: Object.fromEntries(attrs.map((attr) => [attr, Number(player[attr] ?? 0)])),
    });
  });
}

function rankingRow(player, position, attr) {
  const adjusted = adjustedValue({ ...player.raw, pos: player.pos }, position, attr, config);
  return {
    playerId: player.id, name: player.name, cname: player.cname, team: player.team, pos: player.pos,
    sourcePosition: adjusted.sourcePosition, raw: adjusted.raw, value: adjusted.value,
    penalty: Math.round(adjusted.penalty * 10000) / 10000, grade: grade(adjusted.value),
  };
}

const rankings = {};
const optimal = {};
const teamAdvice = {};
for (const position of positions) {
  rankings[position] = {};
  for (const attr of attrs) {
    rankings[position][attr] = players.map((player) => rankingRow(player, position, attr)).sort((a, b) =>
      b.value - a.value || b.raw - a.raw || a.cname.localeCompare(b.cname, "zh-CN") || a.playerId.localeCompare(b.playerId)
    ).slice(0, 40);
  }
  const costs = attrs.map((attr) => players.map((player) => {
    const value = adjustedValue({ ...player.raw, pos: player.pos }, position, attr, config).value;
    return -(value * config.OVR_WEIGHTS[position][attr]);
  }));
  const assignment = hungarianMin(costs);
  optimal[position] = attrs.map((attr, attrIndex) => {
    const selected = players[assignment[attrIndex]];
    const row = rankingRow(selected, position, attr);
    const alternatives = rankings[position][attr].filter((item) => item.playerId !== selected.id).slice(0, 3);
    return {
      attr, attrCN: config.ATTR_CN[attr], weight: config.OVR_WEIGHTS[position][attr], selected: row,
      alternatives, absoluteBest: rankings[position][attr][0],
      conflictReason: rankings[position][attr][0].playerId === row.playerId ? "" : "全库最高者被分配到对综合评分贡献更大的属性，避免球员冲突。",
    };
  });
  teamAdvice[position] = {};
  for (const team of current.NBA2K_TEAMS) {
    const teamPlayers = players.filter((player) => player.team === team);
    const allChoices = [];
    for (const attr of attrs) {
      const weight = config.OVR_WEIGHTS[position][attr];
      for (const player of teamPlayers) {
        const row = rankingRow(player, position, attr);
        allChoices.push({ attr, attrCN: config.ATTR_CN[attr], weight, contribution: Math.round(row.value * weight * 100) / 100, ...row });
      }
    }
    allChoices.sort((a, b) => b.contribution - a.contribution || b.value - a.value || a.cname.localeCompare(b.cname, "zh-CN"));
    teamAdvice[position][team] = {
      primary: allChoices[0] || null,
      backups: allChoices.slice(1, 4),
      byAttribute: Object.fromEntries(attrs.map((attr) => [attr, rankings[position][attr].filter((row) => row.team === team)[0] || null])),
    };
  }
}

const branchEvents = safeEvaluateArray(extractAssignedArray(html, "const BRANCH_EVENTS =").source, "branch-events")
  .map((event) => normalizeEvent(event, "旧版分支事件"));
const stagedBranchEvents = safeEvaluateArray(extractAssignedArray(html, "const STAGED_BRANCH_EVENTS =").source, "staged-branch-events")
  .map((event) => normalizeEvent(event, "当前分阶段剧情"));
const registryEvents = extractRegistryEvents(html);
const legendStoryEvents = {
  "1984": safeEvaluateArray(extractAssignedArray(html, "const LEGEND_STORY_1984_EVENTS =").source, "legend-story-1984").map((event) => normalizeEvent(event, "1984 时代专属")),
  "1996": safeEvaluateArray(extractAssignedArray(html, "const LEGEND_STORY_1996_EVENTS =").source, "legend-story-1996").map((event) => normalizeEvent(event, "1996 时代专属")),
  "2003": safeEvaluateArray(extractAssignedArray(html, "const LEGEND_STORY_EVENTS =").source, "legend-story-2003").map((event) => normalizeEvent(event, "2003 时代专属")),
};
const careerTitles = safeEvaluateArray(extractAssignedArray(html, "var CAREER_TITLE_POOL =").source, "career-title-pool")
  .map((item, index) => ({ id: `title-${index + 1}`, title: item.title, tags: item.tags || [] }));

const teamLogoObjectStart = html.indexOf("window.TEAM_LOGOS = {");
const teamLogoOpen = html.indexOf("{", teamLogoObjectStart);
const teamLogoClose = findBalanced(html, teamLogoOpen, "{", "}");
const teamLogos = vm.runInNewContext(`(${html.slice(teamLogoOpen, teamLogoClose + 1)})`, Object.create(null));

const oldGuide = extractOldGuide();
const diff = { baseline: "2026-07-20", added: [], removed: [], teamChanges: [], attributeChanges: [], leaderboardChanges: [] };
if (oldGuide) {
  const oldByName = new Map(oldGuide.players.map((player) => [player.name, player]));
  const newByName = new Map(players.map((player) => [player.name, player]));
  diff.added = players.filter((player) => !oldByName.has(player.name)).map((player) => ({ name: player.name, cname: player.cname, team: player.team, ovr: player.ovr }));
  diff.removed = oldGuide.players.filter((player) => !newByName.has(player.name)).map((player) => ({ name: player.name, cname: player.cname, team: player.team, ovr: player.ovr }));
  for (const player of players) {
    const old = oldByName.get(player.name);
    if (!old) continue;
    if (old.team !== player.team) diff.teamChanges.push({ name: player.name, cname: player.cname, from: old.team, to: player.team });
    const changes = [];
    for (const attr of attrs) {
      const before = Number(old.raw?.[attr] ?? 0);
      const after = player.raw[attr];
      if (before !== after) changes.push({ attr, attrCN: config.ATTR_CN[attr], before, after, delta: after - before });
    }
    if (Number(old.ovr || 0) !== player.ovr) changes.push({ attr: "ovr", attrCN: "总评", before: Number(old.ovr || 0), after: player.ovr, delta: player.ovr - Number(old.ovr || 0) });
    if (changes.length) diff.attributeChanges.push({ name: player.name, cname: player.cname, team: player.team, changes, maxDelta: Math.max(...changes.map((change) => Math.abs(change.delta))) });
  }
  diff.attributeChanges.sort((a, b) => b.maxDelta - a.maxDelta || a.cname.localeCompare(b.cname, "zh-CN"));
  for (const position of positions) for (const attr of attrs) {
    const oldIds = (oldGuide.byPosition?.[position]?.rankings?.[attr] || oldGuide.rankings?.[position]?.[attr] || []).slice(0, 20).map((row) => row.name);
    const newIds = rankings[position][attr].slice(0, 20).map((row) => row.name);
    if (oldIds.length && oldIds.join("|") !== newIds.join("|")) {
      diff.leaderboardChanges.push({ position, attr, attrCN: config.ATTR_CN[attr], entered: newIds.filter((name) => !oldIds.includes(name)), exited: oldIds.filter((name) => !newIds.includes(name)) });
    }
  }
}

const guide = {
  meta: {
    source: "我创造的完美球员",
    extractedAt: "2026-08-22",
    pageTitle: "我创造的完美球员",
    playerCount: players.length,
    teamCount: current.NBA2K_TEAMS.length,
    attrCount: attrs.length,
    formula: "round(raw × min(1, targetPositionAverage / sourceMainPositionAverage))",
    notes: ["2026 届生涯模式新秀由代码随机生成属性，不纳入静态建球排行榜。", "排行榜只使用进入建球球员库的确定性现役球员数据。"],
  },
  attrs,
  attrCN: config.ATTR_CN,
  attrDesc: config.ATTR_DESC,
  positions: Object.fromEntries(positions.map((position) => [position, { name: config.POSITIONS[position], averages: config.POS_AVG[position], weights: config.OVR_WEIGHTS[position] }])),
  teamNames: config.TEAM_NAMES,
  teamLogos,
  headshots: {
    files: sprites.SPRITE_FILES.map((url, index) => ({ url, local: `/headshots/sprite-${index + 1}.png` })),
    size: sprites.SPRITE_SIZE,
    positions: sprites.SPRITE_POS,
  },
  players,
  rankings,
  optimal,
  teamAdvice,
  events: {
    staged: stagedBranchEvents,
    legendByEra: legendStoryEvents,
    legacy: branchEvents,
    registry: registryEvents,
    invalidNotes: [
      "所有向 STA（耐力）加点的选项当前不会改变属性：addAttrDelta 会拒绝不在 13 项属性列表中的键。",
      "旧版 BRANCH_EVENTS 已被 STAGED_BRANCH_EVENTS 取代；仅在源码保留，不作为当前主剧情推荐。",
      "只写剧情旗标或 profile 数值的选项不会直接改变建球 13 项属性，但可能改变后续事件、伤病、状态或档案称号。",
    ],
  },
  titles: careerTitles,
  diff,
  rules: {
    grades: [
      { min: 95, letter: "A+", color: "#ff6b6b" }, { min: 90, letter: "A", color: "#ff8787" },
      { min: 85, letter: "A-", color: "#ffa07a" }, { min: 80, letter: "B+", color: "#ffd43b" },
      { min: 75, letter: "B", color: "#ffd43b" }, { min: 70, letter: "B-", color: "#ffd43b" },
      { min: 65, letter: "C+", color: "#69db7c" }, { min: 60, letter: "C", color: "#69db7c" },
      { min: 55, letter: "C-", color: "#69db7c" }, { min: 50, letter: "D+", color: "#74c0fc" },
      { min: 45, letter: "D", color: "#74c0fc" }, { min: 40, letter: "D-", color: "#74c0fc" },
      { min: 0, letter: "F", color: "#868e96" },
    ],
  },
};

const outputDir = path.join(root, "app", "data");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "guide-data.json"), JSON.stringify(guide));
fs.writeFileSync(path.join(outputDir, "guide-summary.json"), JSON.stringify({
  meta: guide.meta,
  diff: guide.diff,
  eventCounts: { staged: stagedBranchEvents.length, legacy: branchEvents.length, registry: registryEvents.length },
  titleCount: careerTitles.length,
}, null, 2));

console.log(JSON.stringify({
  players: players.length,
  teams: current.NBA2K_TEAMS.length,
  stagedEvents: stagedBranchEvents.length,
  legacyEvents: branchEvents.length,
  registryEvents: registryEvents.length,
  titles: careerTitles.length,
  diff: {
    added: diff.added.length,
    removed: diff.removed.length,
    teamChanges: diff.teamChanges.length,
    attributeChanges: diff.attributeChanges.length,
    leaderboardChanges: diff.leaderboardChanges.length,
  },
}, null, 2));
