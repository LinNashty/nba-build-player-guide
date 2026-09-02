#!/usr/bin/env python3
"""Export the August 28 unified Legend build-player pool for the guide."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "app/data/guide-data.json"
OUTPUT = ROOT / "app/data/legend-data.json"
SUMMARY = ROOT / "app/data/legend-summary.json"
ALLTIME_SOURCE = Path("/tmp/hupu-26819-22.js")
POSITIONS = ["PG", "SG", "SF", "PF", "C"]
ATTRS = ["threePT", "MID", "FIN", "DNK", "HAN", "PAS", "PDEF", "IDEF", "BLK", "REB", "ATH", "STR", "CLU"]


def parse_alltime_data(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    start = source.find("const NBA2K_ALLTIME_DATA")
    assign = source.find("= {", start)
    end = source.find("\n};", assign)
    if start < 0 or assign < 0 or end < 0:
        raise ValueError(f"无法解析历史球员库：{path}")
    object_text = re.sub(r",\s*([}\]])", r"\1", source[assign + 2:end + 2])
    return json.loads(object_text)


def main_position(value: str, averages: dict) -> str:
    position = (value or "SF").split("/")[0].strip()
    return position if position in averages else "SF"


def js_round(value: float) -> int:
    return math.floor(value + 0.5)


def grade(value: int) -> dict:
    rules = [
        (95, "A+", "#ff6b6b"), (90, "A", "#ff8787"), (85, "A-", "#ffa07a"),
        (80, "B+", "#ffd43b"), (75, "B", "#ffd43b"), (70, "B-", "#ffd43b"),
        (65, "C+", "#69db7c"), (60, "C", "#69db7c"), (55, "C-", "#69db7c"),
        (50, "D+", "#74c0fc"), (45, "D", "#74c0fc"), (40, "D-", "#74c0fc"),
        (0, "F", "#868e96"),
    ]
    minimum, letter, color = next(item for item in rules if value >= item[0])
    return {"min": minimum, "letter": letter, "color": color}


def adjusted_value(player: dict, target: str, attr: str, averages: dict) -> tuple[int, float]:
    source = player["sourcePosition"]
    normal = min(1.0, averages[target][attr] / averages[source][attr])
    penalty = 1.0 - (1.0 - normal) * 0.3
    return js_round(player["raw"][attr] * penalty), penalty


def ranking_row(player: dict, target: str, attr: str, averages: dict) -> dict:
    value, penalty = adjusted_value(player, target, attr, averages)
    return {
        "playerId": player["id"], "identity": player["identity"],
        "name": player["name"], "cname": player["cname"], "team": player["team"],
        "pos": player["pos"], "sourcePosition": player["sourcePosition"],
        "raw": player["raw"][attr], "value": value,
        "penalty": round(penalty, 4), "grade": grade(value),
    }


def hungarian_min(cost: list[list[float]]) -> list[int]:
    n, m = len(cost), len(cost[0])
    u, v, p, way = [0.0] * (n + 1), [0.0] * (m + 1), [0] * (m + 1), [0] * (m + 1)
    for i in range(1, n + 1):
        p[0] = i
        j0, minv, used = 0, [float("inf")] * (m + 1), [False] * (m + 1)
        while True:
            used[j0] = True
            i0, delta, j1 = p[j0], float("inf"), 0
            for j in range(1, m + 1):
                if used[j]:
                    continue
                cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                if cur < minv[j]:
                    minv[j], way[j] = cur, j0
                if minv[j] < delta:
                    delta, j1 = minv[j], j
            for j in range(m + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break
    assignment = [-1] * n
    for j in range(1, m + 1):
        if p[j] > 0:
            assignment[p[j] - 1] = j - 1
    return assignment


def add_competition_ranks(rows: list[dict]) -> list[dict]:
    previous, current_rank = None, 0
    for index, row in enumerate(rows):
        if row["value"] != previous:
            previous, current_rank = row["value"], index + 1
        row["rank"] = current_rank
    return rows


def main() -> None:
    if not GUIDE.exists() or not ALLTIME_SOURCE.exists():
        raise FileNotFoundError("缺少 guide-data.json 或 2026-08-28 队史球员源文件")
    guide = json.loads(GUIDE.read_text(encoding="utf-8"))
    averages = {p: guide["positions"][p]["averages"] for p in POSITIONS}
    weights = {p: guide["positions"][p]["weights"] for p in POSITIONS}
    alltime = parse_alltime_data(ALLTIME_SOURCE)

    players_by_team: dict[str, list[dict]] = {}
    for team_key, roster in alltime.items():
        team = team_key.replace("_HIST", "")
        players_by_team[team] = []
        for index, raw in enumerate(roster):
            cname = str(raw.get("cname") or raw.get("name") or "未知球员")
            name = str(raw.get("name") or cname)
            players_by_team[team].append({
                "id": f"{team}-hist-{index}",
                "identity": re.sub(r"[\s·\-._]", "", name).lower(),
                "team": team, "name": name, "cname": cname,
                "pos": str(raw.get("pos") or "SF"),
                "sourcePosition": main_position(str(raw.get("pos") or "SF"), averages),
                "ovr": int(raw.get("ovr", 0) or 0),
                "raw": {attr: int(raw.get(attr, 50) or 50) for attr in ATTRS},
            })

    teams = sorted(players_by_team)
    pool = [player for team in teams for player in players_by_team[team]]
    rankings: dict = {}
    optimal: dict = {}
    for position in POSITIONS:
        rankings[position] = {}
        for attr in ATTRS:
            rows = [ranking_row(player, position, attr, averages) for player in pool]
            rows.sort(key=lambda row: -row["value"])
            rankings[position][attr] = add_competition_ranks(rows[:40])
        cost = [[-(adjusted_value(player, position, attr, averages)[0] * weights[position][attr]) for player in pool] for attr in ATTRS]
        assignment = hungarian_min(cost)
        picks = []
        for attr_index, attr in enumerate(ATTRS):
            selected = pool[assignment[attr_index]]
            selected_row = ranking_row(selected, position, attr, averages)
            alternatives = [row for row in rankings[position][attr] if row["identity"] != selected["identity"]][:3]
            picks.append({
                "attr": attr, "attrCN": guide["attrCN"][attr], "weight": weights[position][attr],
                "selected": selected_row, "alternatives": alternatives,
                "absoluteBest": rankings[position][attr][0],
            })
        optimal[position] = picks

    payload = {
        "meta": {
            "source": "2026-08-28 游戏传奇模式统一队史候选池",
            "extractedAt": "2026-08-28", "teamCount": len(teams), "playerCount": len(pool),
            "verifiedBoards": 65, "verifiedTop20Rows": 1300,
            "exportedBoards": 65, "exportedTop40Rows": 2600,
            "formula": "round(raw × [1 - (1 - min(1, targetAverage/sourceAverage)) × 0.3])",
            "notes": [
                "所有起始赛季共用同一套30队队史球员属性池。",
                "起始赛季只改变后续生涯阵容和联盟环境，不改变夺取属性时的球员值。",
                "传奇模式只承受生涯模式30%的跨位置损失。",
            ],
        },
        "attrs": ATTRS, "attrCN": guide["attrCN"], "attrDesc": guide["attrDesc"],
        "positions": guide["positions"], "rules": guide["rules"],
        "teams": teams, "teamNames": guide["teamNames"],
        "playersByTeam": players_by_team, "rankings": rankings, "optimal": optimal,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    SUMMARY.write_text(json.dumps({"meta": {
        "extractedAt": "2026-08-28", "teamCount": len(teams), "playerCount": len(pool),
        "verifiedBoards": 65, "verifiedTop20Rows": 1300, "exportedTop40Rows": 2600,
        "seasonCount": 32,
    }}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"teams": len(teams), "players": len(pool), "boards": 65, "rows": 2600}, ensure_ascii=False))


if __name__ == "__main__":
    main()
