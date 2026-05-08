# Meta Business Suite link resolver

Scop: generarea automata a linkului mobil corect pentru o conversatie Meta Business Suite.

Problema:
- Graph API returneaza PSID si thread/conversation IDs.
- Meta Business Suite mobile incarca corect doar unele URL-uri cu `selected_item_id` intern.
- ID-ul intern bun apare in URL dupa ce conversatia este deschisa in browserul Meta Business Suite.

Solutia practica:
Un workflow n8n/worker pe VPS deschide Meta Business Suite intr-un browser persistent, lasa Meta sa rezolve conversatia, citeste URL-ul final si il salveaza in Supabase.

## Cerinte

- VPS cu n8n.
- Browser/Chrome persistent disponibil pentru automation.
- Sesiune Meta Business Suite logata in acel browser.
- Acces Supabase pentru update in tabela `leads`.

## Date de intrare

Pentru fiecare lead:
- `id`
- `name`
- `meta_contact_id` (PSID)
- `meta_url` generat automat de CRM

## Flow automat

1. n8n ia lead-urile care au mesaj nou sau `meta_url` neverificat.
2. Browserul deschide `meta_url`.
3. Asteapta 2-5 secunde.
4. Face refresh o data.
5. Asteapta iar 2-5 secunde.
6. Citeste `window.location.href`.
7. Daca URL-ul contine:
   - `business.facebook.com`
   - `selected_item_id`
   - `thread_type=FB_MESSAGE`
   atunci il considera link verificat.
8. Update in Supabase:
   - `leads.meta_url = finalUrl`
   - `leads.updated_at = now()`

## Pseudocod browser

```js
await page.goto(lead.meta_url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const finalUrl = page.url();

if (
  finalUrl.includes("business.facebook.com") &&
  finalUrl.includes("selected_item_id") &&
  finalUrl.includes("thread_type=FB_MESSAGE")
) {
  await supabase
    .from("leads")
    .update({ meta_url: finalUrl, updated_at: new Date().toISOString() })
    .eq("id", lead.id);
}
```

## Fallback daca refresh nu rezolva linkul

1. Deschide inbox-ul paginii:
   `https://business.facebook.com/latest/inbox/all?asset_id=PAGE_ID`
2. Cauta clientul dupa nume in lista conversatiilor.
3. Click pe conversatie.
4. Asteapta URL update.
5. Salveaza `window.location.href`.

Acest fallback este mai fragil, dar poate rezolva cazurile in care linkul generat de API nu se transforma singur.

## Observatii

- Nu punem acest browser pe Vercel.
- Nu expunem parola Meta in CRM.
- Daca Meta cere re-login, workflow-ul trebuie sa notifice adminul.
- Linkurile verificate nu trebuie suprascrise de webhook cu linkuri mai slabe.
