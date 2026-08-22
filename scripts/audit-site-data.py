#!/usr/bin/env python3
"""Independently verify the site's complete Legend top-40 snapshot."""

from __future__ import annotations

import json
from pathlib import Path

import build_legend_top20_pdf as game


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "app/data/legend-data.json"
ALLTIME = Path("/tmp/live-legend-alltime.js")
ERAS = {
    "1984": Path("/tmp/live-legend-era-1984.js"),
    "1996": Path("/tmp/live-legend-era-1996.js"),
    "2003": Path("/tmp/live-legend-era-2003.js"),
}


def main() -> None:
    site = json.loads(DATA.read_text(encoding="utf-8"))
    alltime = game.parse_alltime_data(ALLTIME)
    checked_boards = 0
    checked_rows = 0
    for era, source in ERAS.items():
        pack = game.parse_static_pack(source)
        players = game.load_players(pack, alltime)
        assert site["eras"][era]["activeTeams"] == pack["activeTeams"]
        assert site["eras"][era]["playerCount"] == len(players)
        for position in game.POSITIONS:
            for attr in game.ATTRS:
                expected = [(player, game.adjusted_value(player, position, attr)) for player in players]
                expected.sort(key=lambda item: -item[1])
                expected = expected[:40]
                actual = site["rankings"][era][position][attr]
                assert len(actual) == 40, (era, position, attr, len(actual))
                expected_rank = 0
                for index, ((player, value), row) in enumerate(zip(expected, actual)):
                    if index == 0 or value != expected[index - 1][1]:
                        expected_rank = index + 1
                    observed = (row["cname"], row["team"], row["sourcePosition"], row["value"], row["raw"], row["rank"])
                    wanted = (player.name, player.team, player.pos, value, player.attrs[attr], expected_rank)
                    assert observed == wanted, (era, position, attr, index + 1, observed, wanted)
                checked_boards += 1
                checked_rows += len(actual)
    print(json.dumps({"boards": checked_boards, "rows": checked_rows, "status": "全部通过"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
