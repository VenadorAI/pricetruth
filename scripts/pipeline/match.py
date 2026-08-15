import json,re,sys
from seed_defs import P
cur=json.load(open('data/snap_2026-08-15.json'))['items']
CHAINS=['ah','jumbo','dirk','plus','lidl','spar','hoogvliet','dekamarkt']
def sz(it): return (it.get('s') or '')
def cands(p, chain):
    rx=re.compile(p['rx'], re.I); srx=re.compile(p['size'], re.I) if p['size'] else None
    ex=re.compile(p['exclude'], re.I) if p['exclude'] else None
    pref=re.compile(p['prefer'], re.I) if p['prefer'] else None
    out=[]
    for it in cur:
        if it['c']!=chain or not rx.search(it['n']): continue
        text=it['n']+' '+sz(it)
        if ex and ex.search(text): continue
        smatch = bool(srx and (srx.search(sz(it)) or srx.search(it['n'])))
        pmatch = bool(pref and pref.search(text))
        out.append((0 if smatch else 1, 0 if pmatch else 1, len(it['n']), it))
    out.sort(key=lambda t:(t[0],t[1],t[2]))
    return [t[3] for t in out]
def picks():
    res={}
    for p in P:
        res[p['id']]={}
        for c in CHAINS:
            cs=cands(p,c)
            if cs: res[p['id']][c]=cs[0]
    return res
if __name__=='__main__':
    only=sys.argv[1] if len(sys.argv)>1 else None
    for p in P:
        if only and only not in p['id']: continue
        print(f"\n### {p['id']}  ({p['brand']} — {p['name']})")
        for c in CHAINS:
            cs=cands(p,c)
            if not cs: print(f"  {c:9s} -"); continue
            it=cs[0]
            print(f"  {c:9s} {len(cs):2d} | {it['n'][:58]:58s} [{sz(it):14s}] €{it['p']}")
