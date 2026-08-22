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
  assert.match(html, /抽到谁，怎么选/);
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
  assert.equal(legendData.attrs.length, 13);
  assert.equal(legendData.eras["2003"].playerCount, 442);
  assert.equal(legendData.optimal["2003"].PG.length, 13);
  assert.equal(Object.keys(legendData.rankings["2003"].PG).length, 13);
});
