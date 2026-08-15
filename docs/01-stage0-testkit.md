# Stage 0 — the four-week test (no code)

Goal: prove that (1) price differences on exact branded products are large and frequent enough, (2) people change where they buy because of it, (3) the "offline" chains (Lidl, Aldi, Normal, Kruidvat shelf) are worth photographing, and (4) there are buyers for the data. Everything in this document is ready to use.

## 1. What you need

Two people, two phones, one shared folder (Google Drive/iCloud) for photos, the file `stage0-collection-sheet.csv` (Google Sheets → File → Import) and `stage0-sku-list.csv` (the 53 products of this MVP; add EANs while you stand in the store — scanning the barcode with the camera app works). Generate both with `python3 scripts/make_stage0_sheets.py`.

## 2. Weekly route (about 3 hours per week, together)

One city. The same eight stores every week, preferably the same branches: Kruidvat, Etos, Action, Normal, AH, Jumbo, Lidl, Aldi. Per product: photo of the shelf label (price plus any promo card), note the shelf price, the member/app price if any, the promotion mechanic and "valid until", and whether the product is missing. Name photos `YYYY-MM-DD_chain_productid.jpg`. Rules: never estimate prices; when in doubt take two photos; for multibuys always note the per-item price and the mechanic.

## 3. WhatsApp broadcast (weekly, Sunday evening)

Create a broadcast list (or community) of 5–8 student houses (20–40 people). Template (send it in Dutch to Dutch students):

> **PriceTruth — week {n}** 🧾
> Really cheaper this week:
> • Nivea deo 150 ml — Action €1.99 (AH €5.79; AH 2nd free from Monday → €2.90 with Bonuskaart)
> • Ariel 4-in-1 pods — Action €0.32/wash vs AH €0.90 · Kruidvat 1+1 only with Club card
> • Colgate toothpaste 75 ml — Action €0.99 vs supermarkets €2.19–2.39
> Fake offer of the week: {example where the promo price is the regular price elsewhere}
> Full list + where to go: {link to the MVP}
> 👉 Reply 1 if you bought somewhere else this week because of this message, 2 if you wanted to but did not, 3 if you did not care.

Measure per week: replies 1/2/3, how many people still reply in week 4, spontaneous questions ("and shampoo X?"), and photos people send in themselves.

## 4. TikTok/Instagram format (3 posts per week)

Split screen of two shelf labels: same product, two stores, price per item large, one line: "Same Nivea. €1.99 at Action, €5.79 at AH." Second format: "Is the offer real?" — flyer photo next to a shelf photo of the regular price elsewhere. Measure views, saves and DMs asking "which store?". This is your cheapest distribution test and it recruits the scouts of later.

## 5. Five conversations with potential data buyers

Who: a trade-marketing, revenue-growth or category manager at Unilever/Beiersdorf/Henkel/Reckitt/P&G Benelux; someone at Consumentenbond (price surveys); an insights person at Roamler or Daltix; an AH/Jumbo franchisee. A student association or SSH housing buyer is not a data buyer but a distribution partner.

Message (LinkedIn/e-mail):

> Hi {name}, with a small team I am building "PriceTruth": weekly, photographed shelf prices and promotion mechanics of branded personal-care and household products at Kruidvat, Etos, Action, Normal, Lidl, Aldi, AH and Jumbo — including member price vs shelf price. Discounters and drugstores are missing or late in today's scanning data. Could I call you for 20 minutes to hear whether and how you would use such data? I will show a sample set, no sales pitch.

Call script (20 min): how do you track shelf and promo prices at Action/Normal/Kruidvat today (Circana? YouGov? field audits? not at all?); what does that cost you now (money, delay); which SKUs/chains/frequency would be valuable; what is the minimum accuracy/proof (photos? EAN?); would you like a monthly sample set; what would a team your size pay per year for weekly data on 500 SKUs × 8 chains (let them name an order of magnitude). Write it down verbatim.

## 6. Decision rules after week 4 (fixed in advance)

Continue to Stage 1 if: for ≥ 40% of the products the gap between cheapest and most expensive chain in a given week is ≥ 20%; Lidl/Aldi/Normal/Action together are the cheapest for ≥ 25% of products (then offline collection is both necessary and valuable); ≥ 30% of broadcast recipients answer "1" at least once and ≥ 40% still reply in week 4; the share of photos where the shelf price differs from the national online price (AH/Jumbo/Action) is known — if it is < 5%, drop the "hyperlocal" layer for good; and at least two of the five buyer conversations end in "send me a sample set".

Stop or pivot hard if: differences are small except at the known discounters (then the message is "go to Action" and nobody needs an app), nobody switches store, or no data buyer shows interest.

## 7. What you take into Stage 1

Four weeks of shelf photos = the first own history; a list of "fake offers" with proof (PR material); five call notes; a group of 20–40 users who already know the WhatsApp version; and the EANs of 53 products. Only then extend the MVP (photo upload, OCR, moderation, WhatsApp bot).
