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
  assert.match(html, /无冲突最优组合/);
  assert.match(html, /随机到这支队，每项应该选谁/);
  assert.match(html, /五位置 × 十三属性排行/);
  assert.match(html, /按事件线，一次看清全部流程/);
  assert.match(html, /选秀前置线/);
  assert.match(html, /球员排除器/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the required always-visible strategy surfaces", async () => {
  const html = await (await render()).text();
  assert.equal((html.match(/attribute-pick-card/g) || []).length, 13);
  assert.match(html, /replacement-block/);
  assert.match(html, /ranking-compact/);
  assert.match(html, /branch-directory/);
  assert.match(html, /tag-tabs/);
});
