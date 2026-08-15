"""Build the MVP dataset: products.json, observations.json, history.json, chains.json, meta.json
Sources:
 - Checkjebon open data (MIT) snapshots in data/snap_*.json  (supermarkets; AH/Dirk/Plus/Hoogvliet/Deka detected stale since >= 2026-03-16)
 - inputs/ah_live.json   : ah.nl product pages read on 2026-08-15 (regular price + Bonus mechanics)
 - inputs/manual_obs.json: action.com category pages (2026-08-15) + Kruidvat/Etos folder offers via Folderz (2026-08-15)
Run from scripts/pipeline/: python3 build_data.py  -> app-data/*.json (copy into ../../data/)
"""
import json, re, glob, os, math
from seed_defs import P

TODAY = '2026-08-15'
OUT = 'app-data'
os.makedirs(OUT, exist_ok=True)

INP = 'inputs' if os.path.isdir('inputs') else 'data'   # committed inputs live in inputs/, snapshots in data/
picks = json.load(open(f'{INP}/picks.json'))
ah_live = json.load(open(f'{INP}/ah_live.json'))
manual = json.load(open(f'{INP}/manual_obs.json'))
snaps = sorted(glob.glob('data/snap_2026-*.json'))

CHAINS = {
  'ah':        dict(name='Albert Heijn', short='AH', type='supermarkt', color='#00A0E2'),
  'jumbo':     dict(name='Jumbo', short='Jumbo', type='supermarkt', color='#F5B500'),
  'lidl':      dict(name='Lidl', short='Lidl', type='supermarkt', color='#0050AA'),
  'dirk':      dict(name='Dirk', short='Dirk', type='supermarkt', color='#E30613'),
  'plus':      dict(name='PLUS', short='PLUS', type='supermarkt', color='#7AB929'),
  'spar':      dict(name='SPAR', short='SPAR', type='supermarkt', color='#00843D'),
  'hoogvliet': dict(name='Hoogvliet', short='Hoogvliet', type='supermarkt', color='#E2001A'),
  'dekamarkt': dict(name='DekaMarkt', short='Deka', type='supermarkt', color='#E4032E'),
  'aldi':      dict(name='ALDI', short='ALDI', type='supermarkt', color='#00457C'),
  'kruidvat':  dict(name='Kruidvat', short='Kruidvat', type='drogist', color='#E4002B'),
  'etos':      dict(name='Etos', short='Etos', type='drogist', color='#009EE0'),
  'trekpleister': dict(name='Trekpleister', short='Trekpl.', type='drogist', color='#00A651'),
  'action':    dict(name='Action', short='Action', type='discounter', color='#0072BC'),
  'normal':    dict(name='Normal', short='Normal', type='discounter', color='#000000'),
}
# freshness / source per supermarket chain in the open dataset
SUPER_SRC = {
  'ah':        dict(source='ah.nl (checked live)', stale=False, conf=0.85, note='Prices read from ah.nl on 15 Aug 2026; Bonus requires the Bonuskaart'),
  'jumbo':     dict(source='Checkjebon open data (jumbo.com)', stale=False, conf=0.7, note='Daily open dataset; changes regularly (fresh)'),
  'lidl':      dict(source='Checkjebon via boodschaapje.nl (receipt data)', stale=False, conf=0.5, note='Receipt-based; abbreviated names, pack size often unknown'),
  'spar':      dict(source='Checkjebon open data (spar.nl)', stale=False, conf=0.6, note='SPAR prices differ per format/franchisee'),
  'dirk':      dict(source='Checkjebon open data (dirk.nl) — STALE', stale=True, conf=0.35, note='Source unchanged since ≥ 16 Mar 2026'),
  'plus':      dict(source='Checkjebon open data (plus.nl) — STALE', stale=True, conf=0.35, note='Source unchanged since ≥ 16 Mar 2026; PLUS franchisees may deviate'),
  'hoogvliet': dict(source='Checkjebon open data — STALE', stale=True, conf=0.35, note='Source unchanged since ≥ 16 Mar 2026'),
  'dekamarkt': dict(source='Checkjebon open data — STALE', stale=True, conf=0.35, note='Source unchanged since ≥ 16 Mar 2026'),
}
LAST_CHANGE = {'ah':'2026-08-15','jumbo':'2026-08-15','lidl':'2026-08-15','spar':'2026-08-15','dirk':'≤ 2026-03-16','plus':'≤ 2026-03-16','hoogvliet':'≤ 2026-03-16','dekamarkt':'≤ 2026-03-16'}

# product-level conversions (ml per wasbeurt) when size is in ml/l but compare unit is wasbeurten
ML_PER_WB = {'robijn-klein-krachtig-color':35.0,'robijn-wasverzachter':20.1,'ariel-vloeibaar-color':45.0,'omo-vloeibaar-kleur':50.0}
DEFAULT_QTY = {'cup-a-soup-tomaat':3, 'wc-eend-fresh-discs':6, 'red-bull-250':1, 'monster-energy-500':1}
SANITY_MAX_UNIT = {'fanta-orange':6,'coca-cola-original':6,'coca-cola-zero':6,'fernandes-cherry-bouquet':6,'dr-pepper-vanilla-float':6,'red-bull-250':3,'monster-energy-500':4}
EN_MECH = {'2e gratis':'2nd free','1+1 gratis':'1+1 free','2+1 gratis':'2+1 free','2+2 gratis':'2+2 free','2 voor 2.79':'2 for 2.79','2 voor 5.49':'2 for 5.49','2 voor 4.99':'2 for 4.99','50% korting':'50% off','Bonus 35% korting':'Bonus 35% off','Bonus':'Bonus','2e halve prijs':'2nd at half price','4 voor €10,00':'4 for €10.00'}
NAME_EN = {'nivea-fresh-natural-deo':'Fresh Natural deodorant spray','nivea-men-dry-impact-deo':'Men Dry Impact anti-perspirant spray','dove-original-deo':'Original / Advanced Care Original deodorant spray','axe-africa-bodyspray':'Africa deodorant body spray','rexona-men-cobalt-deo':'Men Cobalt Dry anti-perspirant spray','sanex-sensitive-deo':'Dermo/Derma Sensitive deodorant spray','dove-men-clean-comfort-douche':'Clean Comfort shower gel','palmolive-naturals-amandel-douche':'Naturals almond shower gel / cream','palmolive-amandel-handzeep':'Naturals almond hand soap (pump)','andrelon-classic-iedere-dag':'Classic Every Day shampoo','head-shoulders-classic':'Classic anti-dandruff shampoo','elvive-color-vive-shampoo':'Color-Vive shampoo','fructis-shampoo':'Fructis shampoo (Damage Repair etc.)','colgate-caries-protection':'Caries/Cavity Protection toothpaste','oralb-3d-white-arctic-fresh':'3D White Arctic Fresh toothpaste','sensodyne-fresh-mint':'Fresh Mint toothpaste','listerine-cool-mint':'Cool Mint mouthwash','gillette-blue3-wegwerp':'Blue3 disposable razors','always-ultra-normal':'Ultra sanitary pads Normal (with wings)','always-dailies-normal':'Dailies panty liners Normal','ariel-4in1-pods':'4-in-1 pods (color / ultra)','ariel-3in1-pods-color':'3-in-1 pods Color','ariel-vloeibaar-color':'Liquid detergent Color','omo-vloeibaar-kleur':'Liquid detergent Color','robijn-klein-krachtig-color':'Klein & Krachtig / Color liquid detergent','robijn-wasverzachter':'Fabric softener (Rosé Chique / Zwitsal / Morgenfris)','vanish-oxi-gel':'Oxi Action stain remover gel (colours)','dreft-afwasmiddel-original':'Dish soap Original / Max Power Original','dreft-platinum-vaatwastabs':'Platinum dishwasher tablets (all-in-one)','finish-quantum-vaatwastabs':'Quantum / All in 1 dishwasher tablets','antikal-kalkreiniger':'Limescale cleaner (spray / gel)','wc-eend-fresh-discs':'Fresh Discs holder / starter kit','page-toiletpapier':'Toilet paper (Original / Kussenzacht / Betrouwbaar Schoon)','edet-soft-toiletpapier':'Soft toilet paper','page-vochtig-toiletpapier':'Moist toilet paper (aloe vera / flushable)','coca-cola-original':'Original Taste (compared per liter)','coca-cola-zero':'Zero Sugar (compared per liter)','fanta-orange':'Orange (compared per liter)','red-bull-250':'Energy Drink 250 ml (per can)','monster-energy-500':'Energy 500 ml (per can)','doritos-nacho-cheese':'Nacho Cheese','pringles-original':'Original','lays-naturel':'Salted (Naturel) crisps','haribo-goudberen':'Goldbears','douwe-egberts-aroma-rood-500':'Aroma Rood ground coffee 500 g','nutella-hazelnootpasta':'Hazelnut spread','calve-pindakaas-350':'Peanut butter (regular) 350 g','heinz-tomato-ketchup':'Tomato Ketchup (per liter)','fernandes-cherry-bouquet':'Cherry Bouquet (per liter)','dr-pepper-vanilla-float':'Vanilla Float 330 ml','kelloggs-cornflakes':'Corn Flakes','cup-a-soup-tomaat':'Cup-a-Soup tomato 3-pack','bifi-original':'Original sausages (multipack)'}
NOTE_EN = {
 'Andere variant (Clean/Fresh); alle Nivea 150 ml-sprays bij Action €1,99':'Different variant (Clean/Fresh); all Nivea 150 ml sprays are €1.99 at Action',
 'Andere variant (Clean/Power)':'Different variant (Clean/Power)',
 'Andere variant (Active Control / Skin Protect); 150 ml i.p.v. 200 ml':'Different variant (Active Control / Skin Protect); 150 ml instead of 200 ml',
 'Andere variant (Milks Sweet Honey), 750 ml':'Different variant (Milks Sweet Honey), 750 ml',
 'Milks-lijn, 500 ml pomp':'Milks line, 500 ml pump',
 'Andere variant, kleine 200 ml-fles':'Different variant, small 200 ml bottle',
 'Elseve = Elvive (exportverpakking); andere variant':'Elseve = Elvive (export packaging); different variant',
 'Anti-Cavity = Caries Protection (exportverpakking)':'Anti-Cavity = Caries Protection (export packaging)',
 'Andere 3D White-variant':'Different 3D White variant',
 'Andere variant (Daily Protection)':'Different variant (Daily Protection)',
 'Andere variant, 480 ml':'Different variant, 480 ml',
 'Op een andere pagina €5,99 gezien — prijs controleren':'Seen at €5.99 on another page — verify price',
 'To Go-verpakking':'To Go pack',
 'Fresh Air Color-variant':'Fresh Air Color variant',
 '2 x 35 wasbeurten':'2 x 35 washes',
 'Rose Gold-variant':'Rose Gold variant',
 "Wasbooster 1 l (geen 'gel gekleurde was')":"Wash booster 1 l (not the 'gel for colours')",
 'Platinum Quick Wash-lijn':'Platinum Quick Wash line',
 'Ultimate = opvolger Quantum Ultimate':'Ultimate = successor of Quantum Ultimate',
 'Essential-lijn (goedkopere variant)':'Essential line (cheaper variant)',
 'Tropical-variant':'Tropical variant',
 '2-laags basislijn (Kussenzacht is 3-laags)':'2-ply basic line (Kussenzacht is 3-ply)',
 'Mega-blik 553 ml':'Mega can 553 ml',
 'Assortimentsactie uit de folder (2 st. van €9,98 voor €4,99); prijs per artikel kan afwijken':'Range-wide flyer offer (2 for €4.99 instead of €9.98); price per item may differ',
 'Assortimentsactie uit de folder; prijs per artikel kan afwijken':'Range-wide flyer offer; price per item may differ',
 'Folderactie: 4 stuks voor €10 (= €2,50 per stuk)':'Flyer offer: 4 for €10 (= €2.50 each)',
 'Reguliere Kruidvat-prijs niet bekend — scout nodig':'Regular Kruidvat price unknown — scout needed',
 'Assortimentsactie uit de folder (2 st. van €13,98 voor €6,99)':'Range-wide flyer offer (2 for €6.99 instead of €13.98)',
 'Verpakkingsgrootte onbekend in folder — prijs per wasbeurt niet te berekenen':'Pack size not stated in flyer — price per wash cannot be computed',
 "Folder: 'heel veel mondverzorging 2+2 gratis' — geldt mogelijk voor dit product; controleren":"Flyer: 'lots of oral care 2+2 free' — may apply to this product; verify",
 "Folder: 'heel veel mondverzorging 2+2 gratis' — controleren":"Flyer: 'lots of oral care 2+2 free' — verify",
 'Folder: NIVEA 1+1 gratis (2 st. van €19,98 voor €9,99) — waarschijnlijk duurdere Nivea-artikelen; controleren':'Flyer: NIVEA 1+1 free (2 for €9.99 instead of €19.98) — probably the pricier Nivea items; verify',
 'Folderactie; Clubkaart mogelijk vereist — controleren':'Flyer offer; Club card may be required — verify',
}
CU_LABEL = {'l':'per liter','kg':'per kg','st':'per unit','wb':'per wash','rol':'per roll'}

def norm(t):
    t = t.lower().replace('per ','').replace('milliliter','ml').replace('mililiters','ml').replace('liters','l').replace('liter','l').replace('gram','g').replace('grm','g').replace('stuks','st').replace('stuk','st').replace('rollen','rol').replace('wasbeurten','wb').replace('wasb.','wb').replace('wasbeurt','wb').replace('-pack',' pack').strip()
    return t.replace(',', '.')

def parse_size(s, cu, pid, name=None):
    """Return qty in compare unit (float) or None. Falls back to the product name when size is empty."""
    for raw in [s, name]:
        if not raw: continue
        q = _parse_size_text(norm(raw), cu, pid)
        if q: return q
    return DEFAULT_QTY.get(pid)

def _parse_size_text(t, cu, pid):
    # count-like units first
    if cu in ('st','wb','rol'):
        m = re.search(r'(\d+)\s*discs', t)
        if m and cu=='st': return float(m.group(1))
        m = re.search(r'(\d+)\s*wb', t)
        if m and cu=='wb': return float(m.group(1))
        m = re.search(r'(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(ml|l|g|kg|wb|st)', t)   # "8 x 250 ml", "2 x 35 wb"
        if m:
            n=int(m.group(1)); q=float(m.group(2)); u=m.group(3)
            if cu=='st' and u in ('ml','l','g','kg'): return float(n)
            if cu=='wb' and u=='wb': return float(n*q)
            if cu=='st' and u=='st': return float(n*q)
        m = re.search(r'(?:capsules|caps|tabs|tabletten|regular|pods|maandverbanden)[ ,]*(\d+)\b', t)  # "Capsules 26", "Regular 16"
        if m:
            n=float(m.group(1))
            if cu in ('st','wb'): return n
        m = re.search(r'(\d+)[-\s]*(?:st|rol|pack)\b|(?:^|\s)x\s*(\d+)\b|(\d+)\s*x\b|(\d+)s\b', t)  # "6 st", "6-rol", "x6", "20x", "10s"
        if m:
            n = float(next(g for g in m.groups() if g))
            if cu=='rol': return n
            if cu=='st': return n
            if cu=='wb' and ('pods' in pid or 'pods' in t or 'caps' in t): return n
        m = re.search(r'(\d+)\s*\+\s*(\d+)\s*st', t)  # "4 + 2 st"
        if m and cu=='st': return float(int(m.group(1))+int(m.group(2)))
    m = re.search(r'(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(ml|l|cl|g|kg)', t)   # multipack volume
    if m and cu in ('l','kg'):
        return conv(int(m.group(1))*float(m.group(2)), m.group(3), cu, pid)
    m = re.search(r'(\d+(?:\.\d+)?)\s*(ml|cl|kg|g|l)\b', t)
    if m:
        q = conv(float(m.group(1)), m.group(2), cu, pid)
        if q: return q
    return None

def conv(q, u, cu, pid):
    if cu=='l':
        return {'ml':q/1000,'cl':q/100,'l':q,'g':q/1000,'kg':q}.get(u)   # g≈ml for sauces
    if cu=='kg':
        return {'g':q/1000,'kg':q}.get(u)
    if cu=='wb':
        ml = q if u=='ml' else (q*1000 if u=='l' else None)
        if ml and pid in ML_PER_WB: return ml/ML_PER_WB[pid]
        return None
    return None

def parse_mech(txt, price):
    """Return dict(type, label, factor, total, note) ; effective unit price = price*factor or total/n"""
    if not txt: return None
    t = txt.lower().replace('€','').replace(',', '.').strip()
    if re.search(r'1\s*\+\s*1|2e gratis|tweede gratis|2nd free', t): return dict(type='1+1', label='1+1 free', buy=2, pay=1, factor=0.5)
    if re.search(r'2\s*\+\s*2', t): return dict(type='2+2', label='2+2 free', buy=4, pay=2, factor=0.5)
    if re.search(r'2\s*\+\s*1', t): return dict(type='2+1', label='2+1 free', buy=3, pay=2, factor=2/3)
    if re.search(r'2e halve prijs|tweede halve|2nd at half|half price', t): return dict(type='2e_halve', label='2nd at half price', buy=2, pay=1.5, factor=0.75)
    m = re.search(r'(\d+)\s*(?:voor|for)\s*(\d+(?:\.\d+)?)', t)
    if m:
        n, tot = int(m.group(1)), float(m.group(2))
        return dict(type='x_voor_y', label=f'{n} for €{tot:.2f}', buy=n, pay=n, total=tot, factor=(tot/n)/price if price else None)
    m = re.search(r'(\d+)\s*%\s*(?:korting|off)', t)
    if m:
        pct=int(m.group(1)); return dict(type='pct', label=f'{pct}% off', buy=1, pay=1, factor=1-pct/100)
    if 'bonus' in t: return dict(type='bonus', label=txt, buy=1, pay=1, factor=1.0)
    return dict(type='other', label=txt, buy=1, pay=1, factor=1.0)

def money(x): return None if x is None else round(x+1e-9, 4)

observations = []
history = {}
oid = 0
def add_obs(**kw):
    global oid
    oid += 1
    o = dict(id=f'o{oid}')
    o.update(kw)
    observations.append(o)
    return o

def finalize(o, pid, cu):
    """compute qty, effective price and unit prices"""
    qty = parse_size(o.get('size'), cu, pid, o.get('name'))
    o['qty'] = qty
    if not o.get('size') and qty:
        lab = {'l':'l','kg':'kg','st':'pcs','wb':'washes','rol':'rolls'}[cu]
        q = f"{qty:g}"
        o['size'] = f"{q} {lab} (derived from name)"
    price = o.get('price')
    mech = parse_mech(o.get('mechanic'), price) if o.get('mechanic') else None
    o['mech'] = mech
    eff = None
    if price is not None:
        if mech and mech.get('factor') is not None and not o.get('upcoming_only'):
            eff = price*mech['factor']
        else:
            eff = price
    o['effective_price'] = money(eff)
    o['unit_price'] = money(eff/qty) if (eff is not None and qty) else None
    o['unit_price_regular'] = money(price/qty) if (price is not None and qty) else None
    o['cu'] = cu
    mx = SANITY_MAX_UNIT.get(pid)
    if mx and o['unit_price'] and o['unit_price'] > mx:
        o['unit_price'] = None; o['unit_price_regular'] = None
        o['variant_note'] = ((o.get('variant_note') or '') + ' Implausible price/size combination (probably a multipack) — excluded.').strip()
    return o

# ---------- supermarket observations from picks (+ AH live overrides) ----------
snapdata = {}
for f in snaps:
    d = json.load(open(f)); snapdata[d['date']] = {(i['c'], i['l']): i['p'] for i in d['items']}
dates = sorted(snapdata)

for p in P:
    pid, cu = p['id'], p['cu']
    for chain, pk in picks.get(pid, {}).items():
        src = SUPER_SRC[chain]
        base = dict(pid=pid, chain=chain, store=None, name=pk['n'], size=pk['s'] or None, price=pk['p'], regular_price=None,
                    price_type='regulier', mechanic=None, conditions=[], upcoming=None,
                    source=src['source'], source_url=None, observed_at=TODAY if not src['stale'] else '2026-03-16',
                    valid_from=None, valid_to=None, confidence=src['conf'], stale=src['stale'], verified=False, variant_note=None,
                    chain_product_id=pk['l'])
        if chain=='ah':
            live = ah_live.get(pid)
            if live:
                base.update(name=live['name'], size=live['size'], price=live['price'], observed_at=TODAY, stale=False, confidence=0.85,
                            source='ah.nl (checked live 15 Aug 2026)', source_url='https://www.ah.nl/producten/product/'+pk['l'])
                promo, valid = live.get('promo'), live.get('promo_valid')
                if live.get('regular_price'):
                    base['regular_price'] = live['regular_price']; base['price_type']='actie'
                    base['conditions'] = ['Bonus: Bonuskaart (loyalty card) required']; base['valid_to']='2026-08-16'; base['mechanic']=EN_MECH.get(promo, promo)
                elif promo and valid and 'maandag' in valid:
                    base['upcoming'] = dict(mechanic=EN_MECH.get(promo, promo), from_date='2026-08-17', price=live.get('upcoming_price'), note='Bonus from Monday 17 Aug (Bonuskaart required)')
                    base['upcoming_only'] = True
                elif promo:
                    base['mechanic'] = EN_MECH.get(promo, promo); base['price_type']='actie'; base['conditions']=['Bonus: Bonuskaart (loyalty card) required']; base['valid_to']='2026-08-16'
            else:
                base.update(stale=True, confidence=0.3, source='Checkjebon open data (ah.nl) — STALE / no longer online', observed_at='2026-03-16')
        if chain=='lidl' and not base['size']:
            base['variant_note'] = 'Pack size unknown (receipt data) — unit price not computed'
        if chain=='ah' and pid=='ariel-3in1-pods-color':
            base['variant_note'] = 'AH now lists the 4-in-1 color pods under this item'
        o = add_obs(**base)
        finalize(o, pid, cu)
        # history for this pick
        key = (chain, pk['l'])
        hist = [[d, snapdata[d].get(key)] for d in dates if snapdata[d].get(key) is not None]
        if src['stale']: hist = []   # frozen source: no real series
        if chain=='ah': hist = [[TODAY, ah_live[pid]['price']]] if ah_live.get(pid) else []
        history.setdefault(pid, {})[chain] = hist

# ---------- manual observations (Action / folders) ----------
for m in manual:
    pid = m['pid']; prod = next(p for p in P if p['id']==pid)
    chain = m['chain']
    if chain=='action':
        base = dict(pid=pid, chain='action', store=None, name=m['name'], size=m.get('size'), price=m.get('price'), regular_price=None,
                    price_type='regulier', mechanic=None, conditions=[], upcoming=None,
                    source='action.com (online, 15 Aug 2026)', source_url='https://www.action.com/nl-nl/', observed_at=TODAY,
                    valid_from=None, valid_to=None, confidence=m.get('confidence',0.75), stale=False, verified=False,
                    variant_note=NOTE_EN.get(m.get('variant_note'), m.get('variant_note')))
    else:
        base = dict(pid=pid, chain=chain, store=None, name=m['name'], size=m.get('size'), price=m.get('price'), regular_price=None,
                    price_type=m.get('price_type','actie'), mechanic=EN_MECH.get(m.get('mechanic'), m.get('mechanic')), conditions=[NOTE_EN.get(c, c) for c in m.get('conditions',[])], upcoming=None,
                    source=f'{CHAINS[chain]["name"]} weekly flyer via Folderz (15 Aug 2026)', source_url=f'https://www.folderz.nl/winkels/{chain}/aanbiedingen/', observed_at=TODAY,
                    valid_from=None, valid_to=m.get('valid_to'), confidence=m.get('confidence',0.55), stale=False, verified=False,
                    variant_note=NOTE_EN.get(m.get('variant_note'), m.get('variant_note')))
    o = add_obs(**base)
    finalize(o, pid, prod['cu'])
    # special: "4 voor €10" with no base price -> effective 2.50
    if o['mech'] and o['mech'].get('type')=='x_voor_y' and o.get('price') is None:
        o['effective_price'] = money(o['mech']['total']/o['mech']['buy'])
        if o.get('qty'): o['unit_price'] = money(o['effective_price']/o['qty'])

# ---------- products ----------
products = []
for p in P:
    obs = [o for o in observations if o['pid']==p['id']]
    products.append(dict(id=p['id'], brand=p['brand'], name=NAME_EN.get(p['id'], p['name']), category=p['category'], cu=p['cu'], cu_label=CU_LABEL[p['cu']],
                         note=p.get('note'), n_obs=len(obs), chains=sorted({o['chain'] for o in obs})))

chains_out = []
for cid, c in CHAINS.items():
    src = SUPER_SRC.get(cid)
    n = sum(1 for o in observations if o['chain']==cid)
    chains_out.append(dict(id=cid, **c, n_obs=n,
        source=(src['source'] if src else ('action.com' if cid=='action' else ('weekly flyer via Folderz' if cid in ('kruidvat','etos') else 'no source yet — scout needed'))),
        stale=(src['stale'] if src else False), last_change=LAST_CHANGE.get(cid, TODAY if n else None), note=(src['note'] if src else None)))

meta = dict(built_at=TODAY, n_products=len(products), n_observations=len(observations), snapshots=[d for d in dates],
            sources=[
              'Checkjebon open data (MIT) — github.com/supermarkt/checkjebon (daily supermarkets.json; 20 snapshots 18 May–15 Aug 2026)',
              'ah.nl product pages, read on 15 Aug 2026 (47 items)',
              'action.com category pages, read on 15 Aug 2026',
              'Kruidvat/Etos weekly-flyer offers via folderz.nl, read on 15 Aug 2026',
            ])

json.dump(products, open(f'{OUT}/products.json','w'), ensure_ascii=False, indent=1)
json.dump(observations, open(f'{OUT}/observations.json','w'), ensure_ascii=False, indent=1)
json.dump(history, open(f'{OUT}/history.json','w'), ensure_ascii=False)
json.dump(chains_out, open(f'{OUT}/chains.json','w'), ensure_ascii=False, indent=1)
json.dump(meta, open(f'{OUT}/meta.json','w'), ensure_ascii=False, indent=1)
print('products', len(products), 'observations', len(observations), 'no unit price:', sum(1 for o in observations if o['unit_price'] is None))
for o in observations[:3]: print(o)
