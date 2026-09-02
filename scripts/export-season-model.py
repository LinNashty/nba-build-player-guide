#!/usr/bin/env python3
"""Build the 32-season, five-position Legend recommendation model.

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
SEASON_SOURCE = Path("/private/tmp/season-rosters-20260902.js")
FULL_PLAYER_SOURCE = Path("/private/tmp/season-extra-20260902.js")
GUIDE = ROOT / "app/data/guide-data.json"
LEGEND = ROOT / "app/data/legend-data.json"
OUTPUT = ROOT / "public/data/season-model.json"
SEASON_OUTPUT = ROOT / "public/data/seasons"
POSITIONS = ["PG", "SG", "SF", "PF", "C"]
ATTRS = ["threePT", "MID", "FIN", "DNK", "HAN", "PAS", "PDEF", "IDEF", "BLK", "REB", "ATH", "STR", "CLU"]
POS_ORDER = ["PG", "SG", "SF", "PF", "C"]
COMPATIBLE = {"PG": ["SG"], "SG": ["PG"], "SF": ["PF"], "PF": ["SF", "C"], "C": ["PF"]}
EAST = {"ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS"}
WEST = {"DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA"}
HISTORIC_TEAM_CODES = {
    "NJN": "BKN", "SEA": "OKC", "VAN": "MEM", "WSB": "WAS",
    "CHH": "CHA", "SDC": "LAC", "KCK": "SAC", "PHO": "PHX",
}

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


def read_js_assignment(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    return json.loads(source[source.index("=") + 1:source.rfind(";")])


def normalize_team_code(team: str) -> str:
    return HISTORIC_TEAM_CODES.get(str(team or ""), str(team or ""))


def normalize_player(player: dict, team: str | None = None) -> dict:
    normalized = dict(player)
    normalized["team"] = normalize_team_code(team or normalized.get("team", ""))
    if not normalized.get("ovr"):
        normalized["ovr"] = int(normalized.get("displayOverall", 0) or 0)
    return normalized


def season_data() -> dict:
    """Merge current season rosters with the new 1984-95 historical extension."""
    modern = read_js_assignment(SEASON_SOURCE)
    full = read_js_assignment(FULL_PLAYER_SOURCE)
    seasons: dict = {}
    for season, bundle in modern["seasons"].items():
        teams = [normalize_team_code(team) for team in bundle["teams"]]
        rosters = {
            normalize_team_code(team): [normalize_player(player, team) for player in bundle["rosters"][team]]
            for team in bundle["teams"]
        }
        seasons[season] = {"season": season, "teams": teams, "rosters": rosters}
    for season, bundle in full["seasons"].items():
        if int(season[:4]) >= 1995:
            continue
        teams: list[str] = []
        rosters: dict[str, list[dict]] = {}
        for source_player in bundle.get("players", []):
            player = normalize_player(source_player)
            team = player["team"]
            if team not in rosters:
                teams.append(team)
                rosters[team] = []
            rosters[team].append(player)
        seasons[season] = {"season": season, "teams": teams, "rosters": rosters}
    return {"schema": "career-season-data-merged-v2", "seasons": seasons}


def player_positions(value: str) -> list[str]:
    return [part.strip() for part in str(value or "SF").split("/") if part.strip()]


def position_fit(value: str, target: str) -> int:
    positions = player_positions(value)
    if target in positions:
        return 2
    return 1 if any(pos in positions for pos in COMPATIBLE[target]) else 0


def position_group(value: str) -> str:
    primary = player_positions(value)[0]
    if primary in ("PG", "SG"):
        return "G"
    return "C" if primary == "C" else "F"


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


def user_stats(attrs: dict, position: str, lineup: dict, overall: float = 97, starter: bool | None = None) -> dict:
    starters = list(lineup["starters"].values())
    starter_avg = sum(float(p.get("ovr", 75) or 75) for p in starters) / max(1, len(starters))
    is_starter = lineup["isUserStarter"] if starter is None else starter
    usage_bias = 1.06 * (overall / starter_avg) if is_starter else .82
    minutes = clamp(26, 34 * math.sqrt(usage_bias), 40)
    minutes_factor = clamp(.75, minutes / 34, 1.15)
    off_avg = sum(attrs[key] for key in OFF_ATTRS[position]) / len(OFF_ATTRS[position])
    usage_scale = 1 + (overall - 75) * .018
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


def dpoy_score(player: dict, team_rank: int, user: bool = False, rookie: bool = False) -> float:
    raw = attr(player, "PDEF") * .5 + attr(player, "IDEF") * .5 + attr(player, "BLK") * .8 + float(player.get("ovr", 97) or 97) * .3
    team_factor = 1.2 if team_rank <= 10 else (1 if team_rank <= 20 else .8)
    minutes = float(player.get("min", 34) or 34)
    role_factor = 1 if minutes >= 28 else (.9 if minutes >= 20 else .75)
    age = 22 if user else int(player.get("age", 25) or 25)
    age_factor = 1 if age <= 34 else (.5 if age <= 36 else .25)
    rookie_factor = .25 if rookie or player.get("rookie") else 1
    return raw * team_factor * age_factor * role_factor * rookie_factor


def final_score(stats: dict) -> float:
    return stats["pts"] + stats["reb"] * .75 + stats["ast"] * 1.05 + (stats["stl"] + stats["blk"]) * 1.8 - stats["tov"]


def build_user_profile(position: str, legend: dict) -> dict:
    weights = legend["positions"][position]["weights"]
    values = {pick["attr"]: int(pick["selected"]["value"]) for pick in legend["optimal"][position]}
    lowest_key = min(ATTRS, key=lambda key: (values[key], ATTRS.index(key)))
    before = values[lowest_key]
    values[lowest_key] = min(before + 20, 99)
    overall = round(sum(values[key] * weights[key] for key in ATTRS))
    return {
        "attrs": values,
        "ovr": overall,
        "boostedAttr": lowest_key,
        "boostedFrom": before,
        "boostedTo": values[lowest_key],
    }


def historical_team_name(team: str, season: str, base: dict) -> str:
    year = int(season[:4])
    if team == "BKN" and year <= 2011: return "新泽西篮网"
    if team == "OKC" and year <= 2007: return "西雅图超音速"
    if team == "MEM" and year <= 2000: return "温哥华灰熊"
    if team == "WAS" and year <= 1996: return "华盛顿子弹"
    if team == "CHA" and year <= 2001: return "夏洛特黄蜂"
    if team == "CHA" and 2004 <= year <= 2013: return "夏洛特山猫"
    if team == "NOP" and year <= 2012: return "新奥尔良黄蜂"
    if team == "SAC" and year <= 1984: return "堪萨斯城国王"
    if team == "LAC" and year <= 1983: return "圣迭戈快船"
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
    selected_seasons = [f"{year}-{str((year + 1) % 100).zfill(2)}" for year in range(1984, 2016)]
    user_profiles = {position: build_user_profile(position, legend) for position in POSITIONS}
    output_seasons: dict = {}
    available_seasons = sorted(data["seasons"], key=lambda value: int(value[:4]))
    context_cache: dict = {}
    evaluation_cache: dict = {}
    recruitment_cache: dict = {}
    recruitment_nodes = [2, 6, 10, 14, 18]

    def player_key(player: dict) -> str:
        return str(player.get("id") or player.get("name") or player.get("cname") or "").lower().strip()

    def build_context(season: str) -> dict:
        if season in context_cache:
            return context_cache[season]
        bundle = data["seasons"][season]
        teams = list(bundle["teams"])
        rosters = {team: [dict(player, team=team) for player in bundle["rosters"][team]] for team in teams}
        baseline_lineups = {team: best_lineup(rosters[team]) for team in teams}
        baseline_powers = {team: team_power(baseline_lineups[team]) for team in teams}
        baseline_win = {
            team: sum(game_probability(baseline_powers[team], baseline_powers[opp]) for opp in teams if opp != team) / max(1, len(teams) - 1)
            for team in teams
        }
        overall_order = sorted(teams, key=lambda team: -baseline_win[team])
        overall_rank = {team: index + 1 for index, team in enumerate(overall_order)}
        max_gp = max(1, max(float(player.get("gp", 0) or 0) for roster in rosters.values() for player in roster))
        rival_rows = []
        rival_by_key = {}
        for code, roster in rosters.items():
            for player in roster:
                source_games = float(player.get("gp", 0) or 0)
                games = source_games / max_gp * 82 if source_games else 82
                stats = {key: float(player.get(key, 0) or 0) for key in ["pts", "reb", "ast", "stl", "blk"]}
                if source_games <= 0 or sum(stats.values()) <= 0:
                    player_position = player_positions(player.get("pos", "SF"))[0]
                    if player_position not in POSITIONS:
                        player_position = "SF"
                    is_starter = player in baseline_lineups[code]["starters"].values()
                    stats = user_stats(
                        {key: attr(player, key) for key in ATTRS}, player_position,
                        baseline_lineups[code], float(player.get("ovr", 70) or 70), is_starter,
                    )
                else:
                    stats["tov"] = float(player.get("tov", 2) or 2)
                    stats["min"] = float(player.get("min", 28) or 28)
                defender = dict(player, min=stats["min"])
                row = {
                    "player": player, "team": code,
                    "group": position_group(player.get("pos", "SF")),
                    "mvp": mvp_score(stats, baseline_win[code], float(player.get("ovr", 70) or 70), games),
                    "allnba": all_nba_score(stats, baseline_win[code], float(player.get("ovr", 70) or 70)),
                    "dpoy": dpoy_score(defender, overall_rank[code]), "final": final_score(stats),
                    "conference": "E" if code in EAST else "W",
                }
                rival_rows.append(row)
                rival_by_key[player_key(player)] = row
        context = {
            "season": season, "teams": teams, "rosters": rosters,
            "baselineLineups": baseline_lineups, "baselinePowers": baseline_powers, "baselineWin": baseline_win,
            "overallRank": overall_rank, "rivals": rival_rows, "rivalByKey": rival_by_key,
        }
        context_cache[season] = context
        return context

    def context_for_year(target_year: int, team: str) -> tuple[dict, bool]:
        exact = f"{target_year}-{str((target_year + 1) % 100).zfill(2)}"
        if exact in data["seasons"] and team in data["seasons"][exact]["teams"]:
            return build_context(exact), False
        choices = [season for season in available_seasons if team in data["seasons"][season]["teams"]]
        selected = min(choices, key=lambda season: (abs(int(season[:4]) - target_year), int(season[:4]) < target_year))
        return build_context(selected), True

    def evaluate_team(
        context: dict,
        team: str,
        position: str,
        candidate: dict | None = None,
        user_is_rookie: bool = False,
    ) -> dict:
        candidate_id = player_key(candidate) if candidate else ""
        cache_key = (context["season"], team, position, candidate_id, user_is_rookie)
        if cache_key in evaluation_cache:
            return evaluation_cache[cache_key]
        profile = user_profiles[position]
        attrs = profile["attrs"]
        user_ovr = profile["ovr"]
        user = {"name": "YOU", "cname": f"你（{user_ovr}）", "pos": position, "ovr": user_ovr, "_isUser": True, **attrs}
        roster = [dict(player) for player in context["rosters"][team]]
        outgoing = None
        if candidate:
            before = best_lineup([*roster, user])
            outgoing = next((player for player in before["bench"] if not player.get("_isUser")), None)
            if outgoing:
                outgoing_id = player_key(outgoing)
                for index, player in enumerate(roster):
                    if player_key(player) == outgoing_id:
                        roster.pop(index)
                        break
            roster.append(dict(candidate, team=team))
        lineup = best_lineup([*roster, user])
        power = team_power(lineup)
        teams = context["teams"]
        baseline_powers = context["baselinePowers"]
        baseline_win = context["baselineWin"]
        win_pct = sum(game_probability(power, baseline_powers[opp]) for opp in teams if opp != team) / max(1, len(teams) - 1)
        conf_teams = [code for code in teams if (code in EAST) == (team in EAST)]
        projected = {code: (win_pct if code == team else baseline_win[code]) for code in conf_teams}
        conf_order = sorted(conf_teams, key=lambda code: -projected[code])
        seed = conf_order.index(team) + 1
        cutoff = projected[conf_order[min(7, len(conf_order) - 1)]] * 82
        playoff_prob = logistic((win_pct * 82 - cutoff) / 2.6)
        playoff_seed = min(seed, 8)
        mirror = min(len(conf_order), max(1, 9 - playoff_seed))
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

        stats = user_stats(attrs, position, lineup, user_ovr)
        user_mvp = mvp_score(stats, win_pct, user_ovr)
        best_mvp = max(context["rivals"], key=lambda row: row["mvp"])
        mvp_prob = logistic((user_mvp - best_mvp["mvp"]) / 3.2)
        group = position_group(position)
        group_rows = sorted([row for row in context["rivals"] if row["group"] == group], key=lambda row: -row["allnba"])
        slot = 6 if group != "C" else 3
        allnba_cutoff = group_rows[min(slot - 1, len(group_rows) - 1)]["allnba"]
        user_allnba = all_nba_score(stats, win_pct, user_ovr)
        allnba_prob = logistic((user_allnba - allnba_cutoff) / 2.8)
        conference = "E" if team in EAST else "W"
        allstar_rows = sorted([row for row in context["rivals"] if row["conference"] == conference], key=lambda row: -row["allnba"])
        allstar_cutoff = allstar_rows[min(11, len(allstar_rows) - 1)]["allnba"]
        allstar_prob = logistic((user_allnba - allstar_cutoff) / 2.5)
        team_rank = sorted(teams, key=lambda code: -(win_pct if code == team else baseline_win[code])).index(team) + 1
        user_defender = {"ovr": user_ovr, "min": stats["min"], **attrs}
        user_dpoy = dpoy_score(user_defender, team_rank, user=True, rookie=user_is_rookie)
        best_dpoy = max(context["rivals"], key=lambda row: row["dpoy"])
        dpoy_prob = logistic((user_dpoy - best_dpoy["dpoy"]) / 5.0)
        teammate_rows = [row for row in context["rivals"] if row["team"] == team]
        if candidate and player_key(candidate) in context["rivalByKey"]:
            teammate_rows.append(context["rivalByKey"][player_key(candidate)])
        best_final = max(teammate_rows, key=lambda row: row["final"])
        fmvp_share = logistic((final_score(stats) - best_final["final"]) / 3.0)
        fmvp_prob = title_prob * fmvp_share
        annual = title_prob * 18 + fmvp_prob * 14 + mvp_prob * 16 + dpoy_prob * 10 + allnba_prob * 5 + allstar_prob * 3
        result = {
            "lineup": lineup, "power": power, "seed": seed, "winPctRaw": win_pct,
            "playoffProb": playoff_prob, "titleProb": title_prob,
            "mvpProb": mvp_prob, "fmvpProb": fmvp_prob, "fmvpShare": fmvp_share, "dpoyProb": dpoy_prob,
            "allNbaProb": allnba_prob, "allStarProb": allstar_prob,
            "mvpScore": user_mvp, "mvpRival": best_mvp["player"].get("cname") or best_mvp["player"].get("name"),
            "mvpGap": user_mvp - best_mvp["mvp"],
            "dpoyScore": user_dpoy, "dpoyRival": best_dpoy["player"].get("cname") or best_dpoy["player"].get("name"),
            "fmvpRival": best_final["player"].get("cname") or best_final["player"].get("name"),
            "annual": annual, "outgoing": outgoing,
        }
        evaluation_cache[cache_key] = result
        return result

    def top_six_targets(context: dict, team: str) -> list[dict]:
        candidates = []
        seen = set()
        for code in context["teams"]:
            if code == team:
                continue
            for player in context["rosters"][code]:
                key = player_key(player)
                if not key or key in seen:
                    continue
                seen.add(key)
                candidates.append(dict(player, team=code))
        return sorted(candidates, key=lambda player: (-int(player.get("ovr", 0) or 0), player_key(player)))[:6]

    def recruitment_plan(start_season: str, team: str, position: str) -> dict:
        start_year = int(start_season[:4])
        cache_key = (start_season, team, position)
        if cache_key in recruitment_cache:
            return recruitment_cache[cache_key]
        node_rows = []
        node_candidates = {}
        for node in recruitment_nodes:
            context, projected = context_for_year(start_year + node - 1, team)
            baseline = evaluate_team(context, team, position)
            rows = []
            for candidate in top_six_targets(context, team):
                after = evaluate_team(context, team, position, candidate)
                delta_mvp = round((after["mvpProb"] - baseline["mvpProb"]) * 100)
                delta_fmvp = round((after["fmvpProb"] - baseline["fmvpProb"]) * 100)
                delta_dpoy = round((after["dpoyProb"] - baseline["dpoyProb"]) * 100)
                delta_allnba = round((after["allNbaProb"] - baseline["allNbaProb"]) * 100)
                safe = delta_mvp >= -5 and delta_fmvp >= -5 and delta_dpoy >= -3 and delta_allnba >= -5
                remaining = max(0, 19 - node)
                uplift = (after["annual"] - baseline["annual"]) * remaining
                rows.append({
                    "key": player_key(candidate),
                    "name": candidate.get("cname") or candidate.get("name") or "未知球员",
                    "team": candidate.get("team"), "position": candidate.get("pos", "—"),
                    "ovr": int(candidate.get("ovr", 0) or 0), "safe": safe,
                    "mvpPct": round(after["mvpProb"] * 100), "fmvpPct": round(after["fmvpProb"] * 100),
                    "dpoyPct": round(after["dpoyProb"] * 100), "allNbaPct": round(after["allNbaProb"] * 100),
                    "deltaMvp": delta_mvp, "deltaFmvp": delta_fmvp,
                    "deltaDpoy": delta_dpoy, "deltaAllNba": delta_allnba,
                    "uplift": round(uplift, 2),
                })
            safe_rows = [row for row in rows if row["safe"] and row["uplift"] > 0]
            ranked = sorted(safe_rows or rows, key=lambda row: (-row["uplift"], -row["ovr"], row["name"]))
            best = ranked[0] if ranked else None
            action = "立即引援" if best and best["safe"] and best["uplift"] > 0 else "继续等待"
            node_rows.append({
                "season": node, "modelSeason": context["season"], "projected": projected,
                "action": action, "player": best["name"] if best else "以当季名单为准",
                "position": best["position"] if best else "—", "ovr": best["ovr"] if best else 0,
                "mvpPct": best["mvpPct"] if best else round(baseline["mvpProb"] * 100),
                "fmvpPct": best["fmvpPct"] if best else round(baseline["fmvpProb"] * 100),
                "dpoyPct": best["dpoyPct"] if best else round(baseline["dpoyProb"] * 100),
                "allNbaPct": best["allNbaPct"] if best else round(baseline["allNbaProb"] * 100),
                "uplift": best["uplift"] if best and action == "立即引援" else 0,
            })
            node_candidates[node] = rows
        viable = [row for row in node_rows if row["action"] == "立即引援"]
        best_node = max(viable, key=lambda row: (row["uplift"], -row["season"])) if viable else max(node_rows, key=lambda row: (row["uplift"], -row["season"]))
        for row in node_rows:
            row["isBest"] = row["season"] == best_node["season"]
        candidates = node_candidates[best_node["season"]]
        for row in candidates:
            row["isBest"] = best_node["action"] == "立即引援" and row["name"] == best_node["player"]
            row.pop("uplift", None)
        result = {
            "bestSeason": best_node["season"], "bestPlayer": best_node["player"],
            "bestAction": best_node["action"], "scoreGain": round(best_node["uplift"]),
            "timeline": node_rows, "candidates": candidates,
        }
        recruitment_cache[cache_key] = result
        return result

    for season in selected_seasons:
        context = build_context(season)
        teams = context["teams"]
        season_results: dict = {}
        for position in POSITIONS:
            position_results = []
            for team in teams:
                rookie_current = evaluate_team(context, team, position, user_is_rookie=True)
                career_current = evaluate_team(context, team, position, user_is_rookie=False)
                profile = user_profiles[position]
                career_mid = min(1260, 72 + career_current["annual"] * 18)
                plan = recruitment_plan(season, team, position)
                rank_score = min(1260, career_mid + max(0, plan["scoreGain"]))
                source_lineup = context["baselineLineups"][team]
                lineup_rows = [compact_player(source_lineup["starters"][slot_name], f"首发{slot_name}", position) for slot_name in POS_ORDER if slot_name in source_lineup["starters"]]
                team_name = historical_team_name(team, season, guide["teamNames"])
                position_results.append({
                    "season": season, "team": team, "teamName": team_name, "modernTeamName": guide["teamNames"].get(team, team_name),
                    "rank": 0, "tags": [], "awardRanks": {}, "isUserStarter": rookie_current["lineup"]["isUserStarter"],
                    "modelOvr": profile["ovr"], "boostedAttr": profile["boostedAttr"],
                    "mvpPct": round(rookie_current["mvpProb"] * 100), "fmvpPct": round(rookie_current["fmvpProb"] * 100),
                    "dpoyPct": round(rookie_current["dpoyProb"] * 100), "titlePct": round(rookie_current["titleProb"] * 100),
                    "allNbaPct": round(rookie_current["allNbaProb"] * 100),
                    "mvpDifficulty": difficulty(rookie_current["mvpProb"]), "fmvpDifficulty": difficulty(rookie_current["fmvpProb"]),
                    "dpoyDifficulty": difficulty(rookie_current["dpoyProb"]),
                    "modelMetrics": {
                        "mvp": round(rookie_current["mvpProb"] * 100, 6),
                        "dpoy": round(rookie_current["dpoyProb"] * 100, 6),
                        "fmvp": round(rookie_current["fmvpProb"] * 100, 6),
                        "title": round(rookie_current["titleProb"] * 100, 6),
                        "fmvpShare": round(rookie_current["fmvpShare"] * 100, 2),
                        "mvpScore": round(rookie_current["mvpScore"], 2),
                        "dpoyScore": round(rookie_current["dpoyScore"], 2),
                    },
                    "mvpRival": rookie_current["mvpRival"], "dpoyRival": rookie_current["dpoyRival"],
                    "fmvpRival": rookie_current["fmvpRival"],
                    "lineup": lineup_rows, "recruitment": plan, "rankScore": round(rank_score, 2),
                })
            position_results.sort(key=lambda row: (-row["rankScore"], -row["mvpPct"], -row["fmvpPct"], -row["dpoyPct"]))
            for index, row in enumerate(position_results):
                row["rank"] = index + 1
            position_results[0]["tags"].append("累计历史分首选")
            season_results[position] = position_results
        output_seasons[season] = {
            "season": season, "teams": teams,
            "teamNames": {team: historical_team_name(team, season, guide["teamNames"]) for team in teams},
            "positions": season_results,
        }
        print(f"已完成 {season}")

    award_labels = {"mvp": "MVP", "dpoy": "DPOY", "fmvp": "FMVP", "title": "总冠军"}
    award_leaderboards: dict = {}
    for position in POSITIONS:
        award_leaderboards[position] = {}
        for award_key, award_label in award_labels.items():
            pool = [row for season in selected_seasons for row in output_seasons[season]["positions"][position]]
            tie_metric = {"mvp": "mvpScore", "dpoy": "dpoyScore", "fmvp": "fmvpShare", "title": "title"}[award_key]
            pool.sort(key=lambda row: (
                -row["modelMetrics"][award_key], -row["modelMetrics"][tie_metric],
                -row["titlePct"], row["season"] if "season" in row else "",
            ))
            leaders = []
            for index, row in enumerate(pool[:10]):
                rank = index + 1
                row["awardRanks"][award_key] = rank
                probability = row["modelMetrics"][award_key]
                if award_key == "mvp":
                    reason = f"MVP竞争分 {row['modelMetrics']['mvpScore']:.1f}，球队战绩与个人产量结合最好"
                    risk = f"主要对手：{row['mvpRival']}；实力接近时仍有评选波动"
                elif award_key == "dpoy":
                    reason = f"防守竞争分 {row['modelMetrics']['dpoyScore']:.1f}，球队防守排名系数相对有利"
                    risk = "新秀季DPOY得分固定乘 0.25，首年获奖仍接近不可能"
                elif award_key == "fmvp":
                    reason = f"夺冠 {row['titlePct']}% × 队内FMVP份额 {row['modelMetrics']['fmvpShare']:.0f}%"
                    risk = f"队内主要竞争者：{row['fmvpRival']}；本概率已计入进总决赛与夺冠"
                else:
                    reason = "替换同位置首发后，四轮季后赛的整体通关率最高"
                    risk = "总冠军仍需连过四轮系列赛，单局随机性无法完全消除"
                leaders.append({
                    "rank": rank, "award": award_label, "season": row["season"],
                    "team": row["team"], "teamName": row["teamName"],
                    "modernTeamName": row["modernTeamName"],
                    "probability": round(probability), "probabilityRaw": probability,
                    "underOne": 0 < probability < 1, "reason": reason, "risk": risk,
                })
            award_leaderboards[position][award_key] = leaders

    SEASON_OUTPUT.mkdir(parents=True, exist_ok=True)
    season_files = {}
    for season, season_payload in output_seasons.items():
        file_name = f"{season}.json"
        (SEASON_OUTPUT / file_name).write_text(
            json.dumps(season_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        season_files[season] = f"/data/seasons/{file_name}"

    payload = {
        "meta": {
            "source": "2026-09-02 游戏赛季阵容、特训、奖项与引援公式", "extractedAt": "2026-09-02",
            "seasonCount": len(selected_seasons),
            "cardCount": sum(len(output_seasons[season]["teams"]) * len(POSITIONS) for season in selected_seasons),
            "modelOvrByPosition": {position: profile["ovr"] for position, profile in user_profiles.items()},
            "theoreticalMax": 1260, "recruitmentNodes": recruitment_nodes,
            "notes": [
                "自建球员使用本站无冲突最优组合，并按游戏规则把最低属性固定加20、最高99。",
                "可开局赛季为1984-85至2015-16；早期联盟只显示当季实际存在的23、25或27支球队。",
                "新秀季DPOY沿用游戏固定0.25系数；FMVP显示已计入夺冠概率的整季绝对概率。",
                "管理层引援候选按对应联盟赛季OVR前六生成，当前球队球员会被排除并按身份去重。",
                "引援发生前还会经历随机交易、选秀、成长与伤病，因此未来候选与概率属于模型估算。",
            ],
        },
        "seasons": selected_seasons, "userProfiles": user_profiles,
        "awardLeaderboards": award_leaderboards, "seasonFiles": season_files,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "seasons": len(selected_seasons), "cards": payload["meta"]["cardCount"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
