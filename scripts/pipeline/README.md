# Data pipeline

```
python3 snap.py <commit-sha> <YYYY-MM-DD>   # download + filter one Checkjebon snapshot into data/snap_<date>.json
python3 match.py [product-id]               # inspect regex matches per chain
python3 build_picks.py                      # write inputs/picks.json (chosen chain product per canonical product)
python3 build_data.py                       # build app-data/*.json  (copy to ../../data/)
```
Inputs: `inputs/ah_live.json` (ah.nl, 15 Aug 2026), `inputs/manual_obs.json` (action.com + Kruidvat/Etos folders, 15 Aug 2026), `inputs/picks.json`.
`inputs/picks.json` and the snapshots (`data/snap_*.json`, ~10 MB each raw) are not committed: run `snap.py` for each date in `data/meta.json → snapshots` (commit SHAs: `git log -- data/supermarkets.json` in github.com/supermarkt/checkjebon), then `build_picks.py`, then `build_data.py`. Output strings are English (`EN_MECH`, `NAME_EN`, `NOTE_EN` in `build_data.py`); retailer item names are kept as the stores print them.
