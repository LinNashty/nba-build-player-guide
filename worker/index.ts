/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const SCORE_API = "https://ai-1785249273930-d3e9xdg7daff9ed-1252166086.tcloudbaseapp.com";
const SCORE_CACHE_TTL = 3 * 60 * 1000;
const scoreCache = new Map<string, { leaderboard: unknown[]; updatedAt: string; cachedAt: number }>();
const SCORE_TEAMS = new Set([
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
]);

async function leaderboardResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const team = String(url.searchParams.get("team") || "").toUpperCase();
  if (team && !SCORE_TEAMS.has(team)) {
    return Response.json({ error: "未知球队" }, { status: 400 });
  }
  const cacheKey = team || "all";
  const cached = scoreCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SCORE_CACHE_TTL) {
    return Response.json({
      leaderboard: cached.leaderboard, team: team || null, updatedAt: cached.updatedAt, stale: false,
    }, {
      headers: { "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
    });
  }

  const path = team
    ? `/api/score/team-leaderboard?team_id=${encodeURIComponent(team)}&limit=100`
    : "/api/score/leaderboard?limit=100";
  try {
    const upstream = await fetch(`${SCORE_API}${path}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 0 },
    } as RequestInit);
    if (!upstream.ok) throw new Error(`榜单接口返回 ${upstream.status}`);
    const payload = await upstream.json() as { leaderboard?: unknown[]; data?: { leaderboard?: unknown[] } };
    const leaderboard = Array.isArray(payload.leaderboard)
      ? payload.leaderboard
      : (Array.isArray(payload.data?.leaderboard) ? payload.data?.leaderboard : []);
    const updatedAt = new Date().toISOString();
    scoreCache.set(cacheKey, { leaderboard, updatedAt, cachedAt: Date.now() });
    const response = Response.json({
      leaderboard, team: team || null, updatedAt, stale: false,
    }, {
      headers: { "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
    });
    return response;
  } catch {
    if (cached) {
      return Response.json({
        leaderboard: cached.leaderboard, team: team || null, updatedAt: cached.updatedAt, stale: true,
      }, {
        headers: { "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
      });
    }
    return Response.json({ error: "原游戏榜单暂时无法连接" }, { status: 503 });
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      return leaderboardResponse(request);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
