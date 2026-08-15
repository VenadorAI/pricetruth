import json, re, sys, os, subprocess
BRANDS = r"""nivea|dove|axe|rexona|sanex|palmolive|andr[ée]lon|head\s*&\s*shoulders|elvive|elseve|l'?or[ée]al|garnier|fructis|schwarzkopf|colgate|oral-?b|sensodyne|aquafresh|prodent|elmex|listerine|gillette|wilkinson|venus|always|tampax|o\.b\.|libresse|veet|zwitsal|neutral|vaseline|ariel|persil|robijn|omo|lenor|silan|vanish|dreft|sun\b|finish|cif|glorix|domestos|ajax|andy|dettol|swiffer|wc-?eend|page\b|edet|tempo|kleenex|antikal|mr\.?\s*proper|ambi\s*pur|febreze|witte reus|frisse reus|zwarte reus|dash\b|fleuril|duracell|varta|douwe egberts|nescaf[ée]|senseo|pickwick|lipton|coca.?cola|pepsi|fanta|sprite|red bull|monster|spa\b|chaudfontaine|pringles|lay'?s|doritos|croky|tony'?s|milka|kitkat|kit kat|mars\b|snickers|m&m|haribo|kellogg|quaker|calv[ée]|heinz|unox|knorr|maggi|conimex|nutella|bonne maman|optimel|chocomel|fristi|becel|blue band|grand'?italia|de ruijter|verkade|bolletje|peijnenburg|honig|bertolli|remia|hellmann|wasa|cup-?a-?soup|red band|venco|oreo|ben\s*&\s*jerry|magnum|cornetto|iglo|mora|dr\.?\s*oetker|alpro|cruesli|brinta|bifi|fernandes|dr\.?\s*pepper|lion\b|smarties|hertog jan|heineken|grolsch|amstel|palazzo|philadelphia|activia|danone|almhof|arla|campina|melkunie|becel|zeeuws|croma|leerdammer|old amsterdam|beemster|milner|hak\b|bonduelle|kikkoman|patak|uncle ben|lassie|honig|maggi|knorr|calve|nutricia|nutrilon|pampers|huggies|kruidvat|etos"""
rx = re.compile(BRANDS, re.I)
def filt(path, out, date):
    d = json.load(open(path))
    res = []
    for s in d:
        for p in s['d']:
            if rx.search(p['n']):
                res.append({'c': s['n'], 'n': p['n'], 'l': p['l'], 'p': p['p'], 's': p.get('s','')})
    json.dump({'date': date, 'items': res}, open(out, 'w'), ensure_ascii=False)
    return len(res)
if __name__ == '__main__':
    sha, date = sys.argv[1], sys.argv[2]
    tmp = f'data/tmp_{sha[:7]}.json'
    url = f'https://raw.githubusercontent.com/supermarkt/checkjebon/{sha}/data/supermarkets.json'
    subprocess.run(['curl','-sS','-m','180','-o',tmp,url], check=True)
    n = filt(tmp, f'data/snap_{date}.json', date)
    os.remove(tmp)
    print(date, sha[:7], n)
