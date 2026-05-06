# CRM Meta Leads - Arhitectura MVP

## Scop

CRM-ul gestioneaza lead-uri care vin din Facebook si Instagram. Aplicatia nu pastreaza istoricul complet al conversatiilor, ci doar datele necesare pentru lucru intern:

- client;
- platforma;
- link catre Meta Business Suite;
- status mesaj nou;
- manager responsabil;
- follow-up in calendar;
- etapa/palnie;
- produse propuse;
- comentarii;
- arhiva;
- statistici.

## Structura Aplicatiei

### Interfata Principala

1. Inbox necitite
   - Afiseaza clientii cu `unread = true`.
   - Clientul poate exista simultan si in calendar.
   - Dupa procesare si salvare, `unread` devine `false`.

2. Calendar follow-up
   - Afiseaza clientii dupa `follow_up_at`.
   - Clientii pot fi mutati intre zile prin drag and drop.
   - Daca un client scrie din nou, ramane in calendar si apare si in inbox.

3. Fereastra client
   - Manager responsabil.
   - Status.
   - Etapa principala.
   - Tags extra.
   - Produse propuse.
   - Comentarii.
   - Data urmatorului mesaj.
   - Date statistice.

4. Statistici
   - Total lead-uri.
   - Mesaje necitite.
   - Prelucrari totale.
   - Arhivate.
   - Statistica pe manageri.
   - Statistica pe etape.
   - Statistica pe produse.

5. Arhiva
   - Clientii inactivi nu apar in inbox sau calendar.
   - Pot fi reactivati.

## Stack Recomandat

- Next.js pentru frontend si API routes.
- Supabase pentru Postgres si autentificare.
- Vercel pentru hosting.
- Meta Graph API si Webhooks pentru Facebook/Instagram.

## Roluri

### Admin

- Vede toti clientii.
- Vede statistici complete.
- Creeaza manageri.
- Configureaza etape, produse si reguli.
- Poate folosi optional filtrul `Filtreaza pe mine`, dar accesul complet ramane disponibil.

### Manager

- Poate vedea toate lead-urile permise de rol.
- Are optiune in interfata: `Doar lead-urile mele`.
- Cand optiunea este activa, inboxul, calendarul si arhiva afiseaza doar lead-urile atribuite managerului curent.
- Proceseaza mesaje noi.
- Programeaza follow-up.
- Schimba etapa si produse propuse.

## Filtrare Pe Manager Curent

Filtrarea `Doar lead-urile mele` este o optiune de lucru, nu o limitare permanenta.

In demo, managerul curent este fixat temporar in cod. Dupa autentificare, managerul curent va veni din sesiunea utilizatorului.

Regula:

- daca `only_my_leads = false`, se afiseaza toate lead-urile permise de rol;
- daca `only_my_leads = true`, se afiseaza doar lead-urile cu `manager_id = current_manager_id`;
- adminul poate avea aceeasi optiune pentru lucru rapid, dar pastreaza acces la toate datele.

## Reguli CRM

1. Un mesaj nou seteaza `unread = true`.
2. Un client cu `unread = true` apare in coloana de necitite.
3. Daca are deja follow-up, ramane si in calendar.
4. Un client deschis din inbox nu poate fi inchis fara:
   - data de follow-up azi sau in viitor; sau
   - arhivare.
5. La salvare:
   - `unread = false`;
   - creste `processed_count`;
   - se actualizeaza `last_processed_at`;
   - se scrie un eveniment in istoric.
6. La schimbarea etapei:
   - se pastreaza istoric in `lead_stage_history`.
7. La arhivare:
   - `archived_at` este setat;
   - clientul dispare din inbox si calendar.
