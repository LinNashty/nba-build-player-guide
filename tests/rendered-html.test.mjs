import assert from "node:assert/strict";
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

test("server-renders the complete Chinese strategy guide", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>打造我的传奇球星｜全方位攻略<\/title>/i);
  assert.match(html, /生涯模式/);
  assert.match(html, /传奇模式/);
  assert.match(html, /无冲突最优组合/);
  assert.match(html, /随机到这支队，每项选谁/);
  assert.match(html, /每个位置、每项属性前 40/);
  assert.match(html, /剧情事件怎么选/);
  assert.match(html, /选秀前置/);
  assert.match(html, /队内位置适配前 5/);
  assert.match(html, /形象声望到底影响什么/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the required always-visible strategy surfaces", async () => {
  const html = await (await render()).text();
  assert.equal((html.match(/class="pick-card"/g) || []).length, 13);
  assert.equal((html.match(/class="attribute-choice"/g) || []).length, 13);
  assert.match(html, /class="choice-rank">1</);
  assert.match(html, /class="grade"[^>]+aria-label="评级 [A-F]/);
  assert.doesNotMatch(html, /class="status-dock"/);
  assert.match(html, /class="alternatives"/);
  assert.match(html, /class="ranking-columns"/);
  assert.match(html, /class="story-directory"/);
  assert.match(html, /class="tag-tabs title-tags"/);
});
