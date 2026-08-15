"""Generate the Stage-0 field-test sheets from data/products.json (run: python3 scripts/make_stage0_sheets.py)."""
import csv, json, os
prods = json.load(open('data/products.json'))
CAT = {'verzorging': 'personal care', 'huishouden': 'household', 'eten-drinken': 'food & drinks'}
os.makedirs('docs', exist_ok=True)
with open('docs/stage0-sku-list.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['product_id','brand','product','category','compare_unit','ean (fill in)','chains_with_data'])
    for p in prods: w.writerow([p['id'], p['brand'], p['name'], CAT.get(p['category'], p['category']), p['cu_label'], '', ';'.join(p['chains'])])
chains = ['kruidvat','etos','action','normal','ah','jumbo','lidl','aldi']
with open('docs/stage0-collection-sheet.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['week','date','chain','branch/city','product_id','brand','product','pack_size_seen','shelf_price_eur','member_price_eur','promo_mechanic','promo_price_eur','card_or_app_required (y/n)','valid_until','photo_filename','not_found (x)','note'])
    for p in prods:
        for c in chains: w.writerow(['1','',c,'',p['id'],p['brand'],p['name']] + ['']*10)
print('wrote docs/stage0-sku-list.csv and docs/stage0-collection-sheet.csv')
