#!/usr/bin/env python3
"""Build the 21-season, five-position Legend recommendation model.

Fixed mechanics mirror the game code. Probabilities and career projections are
clearly exported as estimates, because trades, drafts, aging and random game
rolls cannot be known at guide-build time.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEASON_SOURCE = Path("/tmp/hupu-26826-15.js")
GUIDE = ROOT / "app/data/guide-data.json"
LEGEND = ROOT / "app/data/legend-data.json"
OUTPUT = ROOT / "public/data/season-model.json"
POSITIONS = ["PG", "SG", "SF", "PF", "C"]
ATTRS = ["threePT", "MID", "FIN", "DNK", "HAN", "PAS", "PDEF", "IDEF", "BLK", "REB", "ATH", "STR", "CLU"]
POS_ORDER = ["PG", "SG", "SF", "PF", "C"]
COMPATIBLE = {"PG": ["SG"], "SG": ["PG"], "SF": ["PF"], "PF": ["SF", "C"], "C": ["PF"]}
EAST = {"ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS"}
WEST = {"DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA"}

TEAM_POWER = {
    "offense": {"threePT": .2, "MID": .15, "FIN": .2, "PAS": .15, "HAN": .1, "DNK": .1, "ATH": .1},
    "defense": {"PDEF": .25, "IDEF": .25, "BLK": .15, "REB": .15, "ATH": .1, "STR": .1},
    "athletic": {"ATH": .3, "DNK": .2, "STR": .2, "FIN": .15, "threePT": .15},
    "clutch": {"CLU": .4, "threePT": .2, "MID": .2, "PAS": .2},
}
POS_SCALE = {
    "PG": {"reb": .35, "ast": .9}, "SG": {"reb": .35, "ast": .6},
    "SF": {"reb": .6, "ast": .55}, "PF": {"reb": .85, "ast": .55},
    "C": {"reb": 1, "ast": .55},
}
STL_FACTORS = {
    "PG": {"PDEF": .4, "ATH": .25, "HAN": .2}, "SG": {"PDEF": .4, "ATH": .25, "HAN": .15},
    "SF": {"PDEF": .4, "ATH": .2, "HAN": .15}, "PF": {"PDEF": .3, "ATH": .15, "HAN": .1},
    "C": {"PDEF": .2, "ATH": .1, "HAN": .08},
}
BLK_FACTORS = {
    "PG": {"BLK": .3, "IDEF": .2, "ATH": .1}, "SG": {"BLK": .3, "IDEF": .2, "ATH": .1},
    "SF": {"BLK": .35, "IDEF": .25, "ATH": .1}, "PF": {"BLK": .4, "IDEF": .3, "ATH": .1},
    "C": {"BLK": .45, "IDEF": .3, "ATH": .08},
}
BASE_USAGE = {"PG": .18, "SG": .17, "SF": .16, "PF": .14, "C": .15}
OFF_ATTRS = {
    "PG": ["threePT", "MID", "HAN", "PAS"], "SG": ["threePT", "MID", "FIN", "HAN"],
    "SF": ["threePT", "MID", "FIN", "DNK", "ATH"], "PF": ["MID", "FIN", "DNK", "STR", "REB"],
    "C": ["FIN", "DNK", "STR", "MID"],
}
SHOT_DIST = {
    "PG": {"threePT": .35, "MID": .25, "FIN": .25}, "SG": {"threePT": .38, "MID": .22, "FIN": .22},
    "SF": {"threePT": .3, "MID": .2, "FIN": .3}, "PF": {"threePT": .2, "MID": .18, "FIN": .38},
    "C": {"threePT": .08, "MID": .18, "FIN": .48},
}


def clamp(low: float, value: float, high: float) -> float:
    return max(low, min(high, value))


def logistic(value: float) -> float:
    return 1 / (1 + math.exp(-clamp(-20, value, 20)))


def season_data() -> dict:
    source = SEASON_SOURCE.read_text(encoding="utf-8")
    return json.loads(source[source.index("=") + 1:source.rfind(";")])


def player_positions(value: str) -> list[str]:
    return [part.strip() for part in str(value or "SF").split("/") if part.strip()]


def position_fit(value: str, target: str) -> int:
    positions = player_positions(value)
    if target in positions:
        return 2
    return 1 if any(pos in positions for pos in COMPATIBLE[target]) else 0


def attr(player: dict, key: str) -> float:
    return float(player.get(key, 50) or 50)


def best_lineup(roster: list[dict]) -> dict:
    candidates_by_pos: list[list[int]] = []
    for target in POS_ORDER:
        ranked = sorted(
            [(index, position_fit(player.get("pos", ""), target), int(player.get("ovr", 0) or 0)) for index, player in enumerate(roster)],
            key=lambda row: (-row[1], -row[2]),
        )
        exact = [index for index, fit, _ in ranked if fit == 2][:4]
        adjacent = [index for index, fit, _ in ranked if fit == 1][:4]
        pool = exact + adjacent
        if not pool:
            pool = [index for index, _, _ in sorted(ranked, key=lambda row: -row[2])[:4]]
        candidates_by_pos.append(pool)

    @lru_cache(maxsize=None)
    def solve(pos_index: int, used: tuple[int, ...]) -> tuple[float, tuple[int, ...]]:
        if pos_index == len(POS_ORDER):
            return 0.0, ()
        best_score, best_assignment = -1e9, ()
        used_set = set(used)
        for player_index in candidates_by_pos[pos_index]:
            if player_index in used_set:
                continue
            player = roster[player_index]
            fit = position_fit(player.get("pos", ""), POS_ORDER[pos_index])
            contribution = float(player.get("ovr", 0) or 0) * (1 if fit else .25)
            tail_score, tail = solve(pos_index + 1, tuple(sorted((*used, player_index))))
            if contribution + tail_score > best_score:
                best_score, best_assignment = contribution + tail_score, (player_index, *tail)
        if not best_assignment:
            tail_score, tail = solve(pos_index + 1, used)
            return tail_score, (-1, *tail)
        return best_score, best_assignment

    _, assignment = solve(0, ())
    starters = {pos: roster[index] for pos, index in zip(POS_ORDER, assignment) if index >= 0}
    used = {index for index in assignment if index >= 0}
    bench = sorted([player for index, player in enumerate(roster) if index not in used], key=lambda p: -(int(p.get("ovr", 0) or 0)))
    user = next((player for player in roster if player.get("_isUser")), None)
    is_user_starter = user in starters.values() if user else False
    if user and not is_user_starter:
        bench = [user, *[player for player in bench if player is not user]]
    return {"starters": starters, "bench": bench, "isUserStarter": is_user_starter}


def team_power(lineup: dict) -> dict:
    starters = list(lineup["starters"].values())
    bench = lineup["bench"][:2]
    if not starters:
        return {"offense": 50, "defense": 50, "athletic": 50, "clutch": 50, "depth": 50}
    starter_ovr = sum(float(player.get("ovr", 50) or 50) for player in starters)
    bench_weight = .15 / len(bench) if bench else 0
    weighted = [(player, .85 * float(player.get("ovr", 50) or 50) / starter_ovr) for player in starters]
    weighted += [(player, bench_weight) for player in bench]
    def dimension(weights: dict) -> float:
        return sum(sum(attr(player, key) * weight for player, weight in weighted) * coefficient for key, coefficient in weights.items()) / sum(weights.values())
    return {
        "offense": dimension(TEAM_POWER["offense"]), "defense": dimension(TEAM_POWER["defense"]),
        "athletic": dimension(TEAM_POWER["athletic"]), "clutch": dimension(TEAM_POWER["clutch"]),
        "depth": sum(float(player.get("ovr", 50) or 50) * weight for player, weight in weighted),
    }


def game_probability(a: dict, b: dict, seed_bonus: float = 0) -> float:
    net = (a["offense"] - b["offense"]) * .4 + (a["defense"] - b["defense"]) * .4 + (a["depth"] - b["depth"]) * .2 + seed_bonus
    return clamp(.15, .5 + net / 25, .85)


def series_probability(p: float) -> float:
    return sum(math.comb(3 + losses, losses) * p ** 4 * (1 - p) ** losses for losses in range(4))


def af(value: float) -> float:
    factor = ((clamp(25, value, 99) - 25) / 74) ** .85
    return factor ** 1.5


def user_stats(attrs: dict, position: str, lineup: dict) -> dict:
    starters = list(lineup["starters"].values())
    starter_avg = sum(float(p.get("ovr", 75) or 75) for p in starters) / max(1, len(starters))
    usage_bias = 1.06 * (97 / starter_avg) if lineup["isUserStarter"] else .82
    minutes = clamp(26, 34 * math.sqrt(usage_bias), 40)
    minutes_factor = clamp(.75, minutes / 34, 1.15)
    off_avg = sum(attrs[key] for key in OFF_ATTRS[position]) / len(OFF_ATTRS[position])
    usage_scale = 1 + (97 - 75) * .018
    fga = 89 * BASE_USAGE[position] * usage_scale * usage_bias * (.1 + af(off_avg) * .9) * (minutes / 48)
    max_fga = (1 + af(off_avg) * 24) * clamp(.7, usage_scale, 1.5)
    fga = clamp(2, fga, max_fga)
    dist = dict(SHOT_DIST[position])
    dist["threePT"] = clamp(.05, dist["threePT"] + (attrs["threePT"] - 50) * .003, .55)
    dist["FIN"] = clamp(.05, dist["FIN"] + (((attrs["FIN"] + attrs["DNK"]) / 2) - 50) * .002, .55)
    dist["MID"] = clamp(.05, dist["MID"] + (attrs["MID"] - 50) * .002, .55)
    total_dist = sum(dist.values())
    attempts = {key: fga * value / total_dist for key, value in dist.items()}
    pct3 = clamp(.28, .36 + (attrs["threePT"] - 50) * .0025, .45)
    pct_mid = clamp(.32, .42 + (attrs["MID"] - 50) * .0025, .52)
    fin_avg = (attrs["FIN"] + attrs["DNK"]) / 2
    pct_fin = clamp(.45, .58 + (fin_avg - 50) * .0025, .70)
    fta = fga * min(.3, .1 + attrs["FIN"] / 500)
    ft_pct = clamp(.55, .75 + (attrs["CLU"] - 50) * .002, .9)
    pts = attempts["threePT"] * pct3 * 3 + attempts["MID"] * pct_mid * 2 + attempts["FIN"] * pct_fin * 2 + fta * ft_pct
    reb = af(attrs["REB"]) * POS_SCALE[position]["reb"] * 12 * minutes_factor
    pas_avg = (attrs["PAS"] + attrs["HAN"] + attrs["CLU"]) / 3
    ast = af(pas_avg) * POS_SCALE[position]["ast"] * 9 * minutes_factor
    stl_f = STL_FACTORS[position]
    stl = sum(af(attrs[key]) * weight for key, weight in stl_f.items()) / sum(stl_f.values()) * 2 * minutes_factor
    blk_f = BLK_FACTORS[position]
    blk = sum(af(attrs[key]) * weight for key, weight in blk_f.items()) / sum(blk_f.values()) * 2 * minutes_factor
    tov = max(.5, fga * .2 * (1 - af((attrs["HAN"] + attrs["CLU"]) / 2) * .4))
    return {"pts": pts, "reb": reb, "ast": ast, "stl": stl, "blk": blk, "tov": tov, "min": minutes}


def mvp_score(stats: dict, win_pct: float, ovr: float = 97, games: float = 82) -> float:
    production = stats["pts"] + stats["reb"] * .55 + stats["ast"] * .75 + (stats["stl"] + stats["blk"]) * 1.45 - stats["tov"] * .65
    return production + win_pct * 9 + min(games, 82) * .02 + max(0, ovr - 70) * .12


def all_nba_score(stats: dict, win_pct: float, ovr: float = 97) -> float:
    production = stats["pts"] + stats["reb"] * .55 + stats["ast"] * .75 + (stats["stl"] + stats["blk"]) * 1.45 - stats["tov"] * .65
    return production + win_pct * 6 + max(0, ovr - 70) * .2 + stats["min"] * .08


def dpoy_score(player: dict, team_rank: int, user: bool = False) -> float:
    raw = attr(player, "PDEF") * .5 + attr(player, "IDEF") * .5 + attr(player, "BLK") * .8 + float(player.get("ovr", 97) or 97) * .3
    team_factor = 1.2 if team_rank <= 10 else (1 if team_rank <= 20 else .8)
    minutes = float(player.get("min", 34) or 34)
    role_factor = 1 if minutes >= 28 else (.9 if minutes >= 20 else .75)
    return raw * team_factor * role_factor


def final_score(stats: dict) -> float:
    return stats["pts"] + stats["reb"] * .75 + stats["ast"] * 1.05 + (stats["stl"] + stats["blk"]) * 1.8 - stats["tov"]


def calibrate_attrs(position: str, legend: dict) -> dict:
    weights = legend["positions"][position]["weights"]
    values = {pick["attr"]: int(pick["selected"]["value"]) for pick in legend["optimal"][position]}
    current = sum(values[key] * weights[key] for key in ATTRS)
    shift = 97 - current
    values = {key: int(round(clamp(35, value + shift, 99))) for key, value in values.items()}
    for _ in range(50):
        overall = round(sum(values[key] * weights[key] for key in ATTRS))
        if overall == 97:
            break
        direction = 1 if overall < 97 else -1
        for key in sorted(ATTRS, key=lambda item: -weights[item]):
            next_value = values[key] + direction
            if 35 <= next_value <= 99:
                values[key] = next_value
                break
    return values


def historical_team_name(team: str, season: str, base: dict) -> str:
    year = int(season[:4])
    if team == "BKN" and year <= 2011: return "新泽西篮网"
    if team == "OKC" and year <= 2007: return "西雅图超音速"
    if team == "MEM" and year <= 2000: return "温哥华灰熊"
    if team == "WAS" and year <= 1996: return "华盛顿子弹"
    if team == "CHA" and year <= 2001: return "夏洛特黄蜂"
    if team == "CHA" and 2004 <= year <= 2013: return "夏洛特山猫"
    if team == "NOP" and year <= 2012: return "新奥尔良黄蜂"
    return base.get(team, team)


def compact_player(player: dict, role: str, position: str) -> dict:
    return {
        "name": player.get("cname") or player.get("name") or "未知球员",
        "position": player.get("pos", "—"), "ovr": int(player.get("ovr", 0) or 0),
        "role": role, "isUser": bool(player.get("_isUser")),
        "positionCompetition": (not player.get("_isUser")) and position in player_positions(player.get("pos", "")),
    }


def difficulty(probability: float) -> str:
    if probability >= .72: return "友好"
    if probability >= .48: return "可冲"
    if probability >= .25: return "激烈"
    return "极难"


def main() -> None:
    data = season_data()
    guide = json.loads(GUIDE.read_text(encoding="utf-8"))
    legend = json.loads(LEGEND.read_text(encoding="utf-8"))
    selected_seasons = [f"{year}-{str((year + 1) % 100).zfill(2)}" for year in range(1995, 2016)]
    user_attrs = {position: calibrate_attrs(position, legend) for position in POSITIONS}
    output_seasons: dict = {}

    for season in selected_seasons:
        bundle = data["seasons"][season]
        teams = bundle["teams"]
        rosters = {team: [dict(player, team=team) for player in bundle["rosters"][team]] for team in teams}
        baseline_lineups = {team: best_lineup(rosters[team]) for team in teams}
        baseline_powers = {team: team_power(baseline_lineups[team]) for team in teams}
        baseline_win = {team: sum(game_probability(baseline_powers[team], baseline_powers[opp]) for opp in teams if opp != team) / (len(teams) - 1) for team in teams}
        overall_order = sorted(teams, key=lambda team: -baseline_win[team])
        overall_rank = {team: index + 1 for index, team in enumerate(overall_order)}
        max_gp = max(float(player.get("gp", 82) or 82) for roster in rosters.values() for player in roster)

        rival_rows = []
        for team, roster in rosters.items():
            for player in roster:
                games = float(player.get("gp", max_gp) or max_gp) / max_gp * 82
                stats = {key: float(player.get(key, 0) or 0) for key in ["pts", "reb", "ast", "stl", "blk"]}
                stats["tov"] = float(player.get("tov", 2) or 2)
                stats["min"] = float(player.get("min", 28) or 28)
                rival_rows.append({
                    "player": player, "team": team, "group": "G" if player.get("pos") in ("PG", "SG") else ("C" if player.get("pos") == "C" else "F"),
                    "mvp": mvp_score(stats, baseline_win[team], float(player.get("ovr", 70) or 70), games),
                    "allnba": all_nba_score(stats, baseline_win[team], float(player.get("ovr", 70) or 70)),
                    "dpoy": dpoy_score(player, overall_rank[team]), "final": final_score(stats),
                    "conference": "E" if team in EAST else "W",
                })

        season_results: dict = {}
        for position in POSITIONS:
            position_results = []
            for team in teams:
                attrs = user_attrs[position]
                user = {"name": "YOU", "cname": "你（97）", "pos": position, "ovr": 97, "_isUser": True, **attrs}
                lineup = best_lineup([*rosters[team], user])
                power = team_power(lineup)
                win_pct = sum(game_probability(power, baseline_powers[opp]) for opp in teams if opp != team) / (len(teams) - 1)
                conf_teams = [code for code in teams if (code in EAST) == (team in EAST)]
                projected = {code: (win_pct if code == team else baseline_win[code]) for code in conf_teams}
                conf_order = sorted(conf_teams, key=lambda code: -projected[code])
                seed = conf_order.index(team) + 1
                cutoff = projected[conf_order[min(7, len(conf_order) - 1)]] * 82
                playoff_prob = logistic((win_pct * 82 - cutoff) / 2.6)

                playoff_seed = min(seed, 8)
                mirror = min(len(conf_order), 9 - playoff_seed)
                first_opp = conf_order[mirror - 1]
                first_p = series_probability(game_probability(power, baseline_powers[first_opp], (mirror - playoff_seed) * .4)) if first_opp != team else .82
                top_four = [code for code in conf_order[:4] if code != team]
                second_p = sum(series_probability(game_probability(power, baseline_powers[opp], (conf_order.index(opp) + 1 - playoff_seed) * .4)) for opp in top_four) / max(1, len(top_four))
                top_two = [code for code in conf_order[:2] if code != team] or top_four
                conf_final_p = sum(series_probability(game_probability(power, baseline_powers[opp], (conf_order.index(opp) + 1 - playoff_seed) * .4)) for opp in top_two) / max(1, len(top_two))
                other_conf = [code for code in teams if (code in EAST) != (team in EAST)]
                finals_opponents = sorted(other_conf, key=lambda code: -baseline_win[code])[:4]
                finals_p = sum(series_probability(game_probability(power, baseline_powers[opp])) for opp in finals_opponents) / max(1, len(finals_opponents))
                title_prob = clamp(0, playoff_prob * first_p * second_p * conf_final_p * finals_p, .92)

                stats = user_stats(attrs, position, lineup)
                user_mvp = mvp_score(stats, win_pct)
                best_mvp = max(rival_rows, key=lambda row: row["mvp"])
                mvp_prob = logistic((user_mvp - best_mvp["mvp"]) / 3.2)
                group = "G" if position in ("PG", "SG") else ("C" if position == "C" else "F")
                group_rows = sorted([row for row in rival_rows if row["group"] == group], key=lambda row: -row["allnba"])
                slot = 6 if group != "C" else 3
                allnba_cutoff = group_rows[min(slot - 1, len(group_rows) - 1)]["allnba"]
                user_allnba = all_nba_score(stats, win_pct)
                allnba_prob = logistic((user_allnba - allnba_cutoff) / 2.8)
                conference = "E" if team in EAST else "W"
                allstar_rows = sorted([row for row in rival_rows if row["conference"] == conference], key=lambda row: -row["allnba"])
                allstar_cutoff = allstar_rows[min(11, len(allstar_rows) - 1)]["allnba"]
                allstar_prob = logistic((user_allnba - allstar_cutoff) / 2.5)
                user_defender = {"ovr": 97, "min": stats["min"], **attrs}
                user_dpoy = dpoy_score(user_defender, min(overall_rank[team], 10), True)
                best_dpoy = max(rival_rows, key=lambda row: row["dpoy"])
                dpoy_prob = logistic((user_dpoy - best_dpoy["dpoy"]) / 5.0)
                team_rivals = [row for row in rival_rows if row["team"] == team]
                best_final = max(team_rivals, key=lambda row: row["final"])
                fmvp_share = logistic((final_score(stats) - best_final["final"]) / 3.0)
                fmvp_prob = title_prob * fmvp_share

                annual = title_prob * 18 + fmvp_prob * 14 + mvp_prob * 16 + dpoy_prob * 10 + allnba_prob * 5 + allstar_prob * 3
                career_mid = min(1260, 72 + annual * 18)
                same_pos = sorted([player for player in rosters[team] if position in player_positions(player.get("pos", ""))], key=lambda p: -(int(p.get("ovr", 0) or 0)))
                competitor = same_pos[0] if same_pos else None
                lineup_rows = [compact_player(lineup["starters"][slot_name], f"首发{slot_name}", position) for slot_name in POS_ORDER if slot_name in lineup["starters"]]
                lineup_rows += [compact_player(player, "核心轮换", position) for player in lineup["bench"][:2]]
                position_results.append({
                    "team": team, "teamName": historical_team_name(team, season, guide["teamNames"]),
                    "rank": 0, "tags": [], "isUserStarter": lineup["isUserStarter"], "seed": seed,
                    "winPct": round(win_pct * 100), "winGain": round((win_pct - baseline_win[team]) * 100),
                    "playoffPct": round(playoff_prob * 100), "titlePct": round(title_prob * 100),
                    "mvpPct": round(mvp_prob * 100), "fmvpPct": round(fmvp_share * 100), "dpoyPct": round(dpoy_prob * 100),
                    "allNbaPct": round(allnba_prob * 100), "allStarPct": round(allstar_prob * 100),
                    "mvpScore": round(user_mvp, 1), "mvpGap": round(user_mvp - best_mvp["mvp"], 1),
                    "mvpRival": best_mvp["player"].get("cname") or best_mvp["player"].get("name"),
                    "mvpDifficulty": difficulty(mvp_prob), "fmvpDifficulty": difficulty(fmvp_share), "dpoyDifficulty": difficulty(dpoy_prob),
                    "projectedLegacy": {"low": round(career_mid * .9 / 5) * 5, "mid": round(career_mid / 5) * 5, "high": min(1260, round(career_mid * 1.1 / 5) * 5)},
                    "power": {key: round(value, 1) for key, value in power.items()}, "lineup": lineup_rows,
                    "positionRival": ({"name": competitor.get("cname") or competitor.get("name"), "ovr": competitor.get("ovr")} if competitor else None),
                })

            position_results.sort(key=lambda row: (-row["projectedLegacy"]["mid"], -row["titlePct"], -row["mvpPct"]))
            for index, row in enumerate(position_results):
                row["rank"] = index + 1
            for key, label in [("titlePct", "夺冠最稳"), ("mvpPct", "MVP最友好"), ("fmvpPct", "FMVP竞争低"), ("dpoyPct", "防守奖项友好")]:
                for row in sorted(position_results, key=lambda item: -item[key])[:3]:
                    row["tags"].append(label)
            position_results[0]["tags"].insert(0, "生涯总分首选")
            season_results[position] = position_results

        output_seasons[season] = {
            "season": season, "teams": teams,
            "teamNames": {team: historical_team_name(team, season, guide["teamNames"]) for team in teams},
            "positions": season_results,
        }
        print(f"已完成 {season}")

    payload = {
        "meta": {
            "source": "2026-08-28 游戏赛季阵容与模拟公式", "extractedAt": "2026-08-28",
            "seasonCount": 21, "modelOvr": 97, "theoreticalMax": 1260,
            "notes": [
                "球队五项实力、单场胜率和奖项竞争分按游戏公式计算。",
                "季后赛概率、夺冠率与生涯历史分区间属于模型估算，不是游戏预设结果。",
                "模型无法预知后续交易、选秀、成长、伤病与随机剧情。",
            ],
        },
        "seasons": selected_seasons, "userAttrs": user_attrs, "data": output_seasons,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "seasons": len(selected_seasons), "cards": len(selected_seasons) * 5 * 30}, ensure_ascii=False))


if __name__ == "__main__":
    main()
