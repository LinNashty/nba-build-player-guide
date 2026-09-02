import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders a fast, complete first viewport", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.ok(Buffer.byteLength(html) < 100_000, "initial HTML should stay below 100 KB");
  assert.match(html, /<title>打造我的传奇球星｜全方位攻略<\/title>/i);
  assert.match(html, /生涯模式/);
  assert.match(html, /传奇模式/);
  assert.match(html, /每一项属性，都选对/);
  assert.match(html, /正在载入完整攻略/);
  assert.match(html, /查看最优组合/);
  assert.doesNotMatch(html, /class="pick-card"/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships complete deferred strategy data", async () => {
  const [careerData, legendData] = await Promise.all([
    readFile(new URL("../public/data/guide-data.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../public/data/legend-data.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.equal(careerData.players.length, 525);
  assert.equal(careerData.attrs.length, 13);
  assert.equal(careerData.optimal.PG.length, 13);
  assert.equal(Object.keys(careerData.rankings.PG).length, 13);
  assert.equal(legendData.meta.playerCount, 457);
  assert.equal(legendData.meta.teamCount, 30);
  assert.equal(legendData.attrs.length, 13);
  assert.equal(legendData.optimal.PG.length, 13);
  assert.equal(Object.keys(legendData.rankings.PG).length, 13);
  assert.equal(legendData.rankings.PG.DNK[0].cname, "史蒂夫-弗朗西斯");
  assert.equal(legendData.rankings.PG.DNK[0].value, 96);
  const mcginnis = legendData.rankings.PG.REB.find((row) => row.cname === "乔治-麦金尼斯");
  assert.equal(mcginnis?.value, 90);
  assert.equal(mcginnis?.rank, 12);
});

test("ships all 32 start-season team models and rookie award boards", async () => {
  const seasonModel = await readFile(new URL("../public/data/season-model.json", import.meta.url), "utf8").then(JSON.parse);
  assert.deepEqual(seasonModel.meta.recruitmentNodes, [2, 6, 10, 14, 18]);
  assert.equal(seasonModel.meta.modelOvrByPosition.PG, 98);
  assert.equal(seasonModel.userProfiles.PG.boostedAttr, "IDEF");
  assert.equal(seasonModel.userProfiles.PG.boostedTo, 99);
  assert.equal(seasonModel.seasons.length, 32);
  assert.equal(seasonModel.seasons[0], "1984-85");
  assert.equal(seasonModel.seasons.at(-1), "2015-16");
  assert.equal(seasonModel.meta.cardCount, 4500);
  for (const position of ["PG", "SG", "SF", "PF", "C"]) {
    for (const award of ["mvp", "dpoy", "fmvp", "title"]) {
      assert.equal(seasonModel.awardLeaderboards[position][award].length, 10);
    }
  }
  const season1984 = await readFile(new URL("../public/data/seasons/1984-85.json", import.meta.url), "utf8").then(JSON.parse);
  const season1988 = await readFile(new URL("../public/data/seasons/1988-89.json", import.meta.url), "utf8").then(JSON.parse);
  const season1989 = await readFile(new URL("../public/data/seasons/1989-90.json", import.meta.url), "utf8").then(JSON.parse);
  assert.equal(season1984.teams.length, 23);
  assert.equal(season1988.teams.length, 25);
  assert.equal(season1989.teams.length, 27);
  const seasonData = await readFile(new URL("../public/data/seasons/2003-04.json", import.meta.url), "utf8").then(JSON.parse);
  assert.equal(seasonData.positions.PG.length, seasonData.teams.length);
  const topTeam = seasonData.positions.PG[0];
  assert.equal(topTeam.lineup.length, 5);
  assert.equal(topTeam.recruitment.timeline.length, 5);
  assert.equal(topTeam.recruitment.candidates.length, 6);
  assert.ok(topTeam.fmvpPct <= topTeam.titlePct);
  assert.equal(topTeam.lineup.some((player) => player.isUser), false);
  assert.equal(topTeam.dpoyPct, 0, "rookie DPOY should retain the game's 0.25 multiplier");
  assert.ok(
    topTeam.recruitment.timeline.some((node) => node.dpoyPct > topTeam.dpoyPct),
    "later recruitment seasons must not reuse the rookie DPOY multiplier",
  );
});

test("serves leaderboard data without relying on the platform cache API", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /\/api\/score\/leaderboard\?limit=100$/);
    return Response.json({ leaderboard: [{ historical_score: 999 }] });
  };
  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("leaderboard-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/api/leaderboard"),
      {},
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.leaderboard[0].historical_score, 999);
    assert.equal(payload.stale, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
