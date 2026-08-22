#!/usr/bin/env python3
"""Export the verified Legend-mode candidate pool for the strategy site.

The game keeps the build-player pool in each team's ``*_HIST`` roster.  Era
packs only decide which teams are available at the selected starting year.
This exporter mirrors the live game's lighter Legend cross-position penalty,
then writes the complete top 40 and the no-conflict optimal assignment for
every era, target position and attribute.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CURRENT_GUIDE = ROOT / "app/data/guide-data.json"
OUTPUT = ROOT / "app/data/legend-data.json"
ALLTIME_SOURCE = Path("/tmp/live-legend-alltime.js")
ERA_SOURCES = {
    "1984": Path("/tmp/live-legend-era-1984.js"),
    "1996": Path("/tmp/live-legend-era-1996.js"),
    "2003": Path("/tmp/live-legend-era-2003.js"),
}

POSITIONS = ["PG", "SG", "SF", "PF", "C"]
ATTRS = [
    "threePT", "MID", "FIN", "DNK", "HAN", "PAS",
    "PDEF", "IDEF", "BLK", "REB", "ATH", "STR", "CLU",
]
ERA_META = {
    "1984": {"label": "1984 黄金一代", "season": "1984—85 赛季开局", "accent": "#D9A441"},
    "1996": {"label": "1996 黄金一代", "season": "1996—97 赛季开局", "accent": "#A58BFF"},
    "2003": {"label": "2003 白金一代", "season": "2003—04 赛季开局", "accent": "#58B5FF"},
}
ERA_TEAM_OVERRIDES = {
    "1984": {"WAS": "子弹"},
    "1996": {"WAS": "子弹"},
    "2003": {},
}


def parse_static_pack(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    match = re.search(
        r"window\.LEGEND_ERA_\d+_STATIC\s*=\s*(\{.*?\})\s*;\s*window\.LEGEND_ERA_STATIC_PACKS",
        source,
        re.S,
    )
    if not match:
        raise ValueError(f"无法解析时代包：{path}")
    return json.loads(match.group(1))


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


def adjusted_value(player: dict, target_position: str, attr: str, averages: dict) -> tuple[int, float]:
    source_position = player["sourcePosition"]
    normal = min(1.0, averages[target_position][attr] / averages[source_position][attr])
    penalty = 1.0 - (1.0 - normal) * 0.3
    return js_round(player["raw"][attr] * penalty), penalty


def ranking_row(player: dict, target_position: str, attr: str, averages: dict) -> dict:
    value, penalty = adjusted_value(player, target_position, attr, averages)
    return {
        "playerId": player["id"],
        "identity": player["identity"],
        "name": player["name"],
        "cname": player["cname"],
        "team": player["team"],
        "pos": player["pos"],
        "sourcePosition": player["sourcePosition"],
        "raw": player["raw"][attr],
        "value": value,
        "penalty": round(penalty, 4),
        "grade": grade(value),
    }


def hungarian_min(cost: list[list[float]]) -> list[int]:
    n = len(cost)
    m = len(cost[0])
    u = [0.0] * (n + 1)
    v = [0.0] * (m + 1)
    p = [0] * (m + 1)
    way = [0] * (m + 1)
    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [float("inf")] * (m + 1)
        used = [False] * (m + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = float("inf")
            j1 = 0
            for j in range(1, m + 1):
                if used[j]:
                    continue
                cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                if cur < minv[j]:
                    minv[j] = cur
                    way[j] = j0
                if minv[j] < delta:
                    delta = minv[j]
                    j1 = j
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
    previous = None
    current_rank = 0
    for index, row in enumerate(rows):
        if row["value"] != previous:
            current_rank = index + 1
            previous = row["value"]
        row["rank"] = current_rank
    return rows


def main() -> None:
    missing = [str(path) for path in [CURRENT_GUIDE, ALLTIME_SOURCE, *ERA_SOURCES.values()] if not path.exists()]
    if missing:
        raise FileNotFoundError(f"缺少传奇数据源：{missing}")

    current = json.loads(CURRENT_GUIDE.read_text(encoding="utf-8"))
    averages = {position: current["positions"][position]["averages"] for position in POSITIONS}
    weights = {position: current["positions"][position]["weights"] for position in POSITIONS}
    alltime = parse_alltime_data(ALLTIME_SOURCE)
    packs = {era: parse_static_pack(path) for era, path in ERA_SOURCES.items()}

    players_by_team: dict[str, list[dict]] = {}
    for team_key, roster in alltime.items():
        team = team_key.replace("_HIST", "")
        players_by_team[team] = []
        for index, raw in enumerate(roster):
            cname = str(raw.get("cname") or raw.get("name") or "未知球员")
            name = str(raw.get("name") or cname)
            players_by_team[team].append({
                "id": f"{team}-hist-{index}",
                "identity": re.sub(r"[\s·\-._]", "", cname).lower(),
                "team": team,
                "name": name,
                "cname": cname,
                "pos": str(raw.get("pos") or "SF"),
                "sourcePosition": main_position(str(raw.get("pos") or "SF"), averages),
                "ovr": int(raw.get("ovr", 0) or 0),
                "raw": {attr: int(raw.get(attr, 50) or 50) for attr in ATTRS},
            })

    rankings: dict = {}
    optimal: dict = {}
    era_payload: dict = {}
    board_count = 0
    row_count = 0
    for era, pack in packs.items():
        active_teams = pack["activeTeams"]
        pool = [player for team in active_teams for player in players_by_team.get(team, [])]
        era_payload[era] = {
            **ERA_META[era],
            "activeTeams": active_teams,
            "teamNames": {**current["teamNames"], **ERA_TEAM_OVERRIDES[era]},
            "teamCount": len(active_teams),
            "playerCount": len(pool),
        }
        rankings[era] = {}
        optimal[era] = {}
        for position in POSITIONS:
            rankings[era][position] = {}
            for attr in ATTRS:
                rows = [ranking_row(player, position, attr, averages) for player in pool]
                # JavaScript's Array.sort is stable. The live game sorts only
                # by adjusted value, so equal values retain team/roster order.
                rows.sort(key=lambda row: -row["value"])
                rankings[era][position][attr] = add_competition_ranks(rows[:40])
                board_count += 1
                row_count += len(rankings[era][position][attr])

            cost = []
            for attr in ATTRS:
                cost.append([
                    -(adjusted_value(player, position, attr, averages)[0] * weights[position][attr])
                    for player in pool
                ])
            assignment = hungarian_min(cost)
            picks = []
            for attr_index, attr in enumerate(ATTRS):
                selected = pool[assignment[attr_index]]
                selected_row = ranking_row(selected, position, attr, averages)
                alternatives = [row for row in rankings[era][position][attr] if row["identity"] != selected["identity"]][:3]
                picks.append({
                    "attr": attr,
                    "attrCN": current["attrCN"][attr],
                    "weight": weights[position][attr],
                    "selected": selected_row,
                    "alternatives": alternatives,
                    "absoluteBest": rankings[era][position][attr][0],
                })
            optimal[era][position] = picks

    payload = {
        "meta": {
            "source": "游戏传奇模式队史候选池",
            "extractedAt": "2026-08-22",
            "verifiedBoards": 195,
            "verifiedTop20Rows": 3900,
            "exportedBoards": board_count,
            "exportedTop40Rows": row_count,
            "formula": "round(raw × [1 - (1 - min(1, targetAverage/sourceAverage)) × 0.3])",
            "notes": [
                "三个时代共用球队历史球员库；时代只改变可随机到的球队集合。",
                "同一球员版本跨时代数值不变，榜单差异只来自时代球队池差异。",
                "传奇模式只承受生涯模式 30% 的跨位置损失。",
            ],
        },
        "attrs": ATTRS,
        "attrCN": current["attrCN"],
        "attrDesc": current["attrDesc"],
        "positions": current["positions"],
        "rules": current["rules"],
        "eras": era_payload,
        "playersByTeam": players_by_team,
        "rankings": rankings,
        "optimal": optimal,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "output": str(OUTPUT),
        "eras": {era: {"teams": meta["teamCount"], "players": meta["playerCount"]} for era, meta in era_payload.items()},
        "boards": board_count,
        "top40Rows": row_count,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
