import json, os
from match import P, cands, CHAINS, sz
OUT = 'inputs' if os.path.isdir('inputs') else 'data'
picks={}
for p in P:
    picks[p['id']]={}
    for c in CHAINS:
        cs=cands(p,c)
        if cs:
            it=cs[0]
            picks[p['id']][c]={'n':it['n'],'l':it['l'],'p':it['p'],'s':sz(it)}
json.dump(picks, open(f'{OUT}/picks.json','w'), ensure_ascii=False, indent=1)
n=sum(len(v) for v in picks.values()); print('picks', n)
print('AH picks:', sum(1 for v in picks.values() if 'ah' in v))
