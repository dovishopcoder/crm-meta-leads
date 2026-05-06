# Integrare Meta

## Ce Vrem De La Meta

Aplicatia trebuie sa primeasca automat persoane care scriu pe Facebook sau Instagram si sa le afiseze in CRM.

Nu avem nevoie sa copiem tot istoricul conversatiei. Avem nevoie de:

- id contact Meta;
- nume;
- poza;
- platforma;
- link catre Meta Business Suite;
- data ultimului mesaj;
- semnal ca exista mesaj nou.

## Flux Pentru Mesaj Nou

1. Clientul scrie pe Facebook sau Instagram.
2. Meta trimite webhook catre aplicatia noastra.
3. Aplicatia verifica daca lead-ul exista dupa `meta_contact_id`.
4. Daca nu exista:
   - creeaza lead nou;
   - seteaza `unread = true`;
   - seteaza `first_message_at`;
   - seteaza `last_message_at`;
   - managerul poate fi `null` sau asignat automat.
5. Daca exista:
   - actualizeaza `last_message_at`;
   - seteaza `unread = true`;
   - nu sterge `follow_up_at`;
   - scrie eveniment in `lead_activity`.

## Regula Cheie

Daca un client are follow-up in calendar si scrie din nou, el ramane in calendar si apare si in inboxul de necitite.

## Endpoint-uri Necesare

### GET /api/meta/webhook

Pentru verificarea webhook-ului de catre Meta.

### POST /api/meta/webhook

Pentru primirea evenimentelor noi.

### POST /api/leads/:id/process

Pentru salvarea procesarii de catre manager:

- `unread = false`;
- creste `processed_count`;
- actualizeaza `last_processed_at`;
- salveaza etapa, produse, tags si comentarii.

### POST /api/leads/:id/archive

Pentru arhivare:

- seteaza `archived_at`;
- seteaza `status = closed`;
- seteaza `unread = false`;

### POST /api/leads/:id/follow-up

Pentru mutarea in calendar:

- seteaza `follow_up_at`;
- seteaza `status = scheduled`.

## Permisiuni Meta

Vor fi necesare conturi si configurari in Meta Developer:

- Meta Developer App;
- Facebook Page conectata;
- Instagram Professional Account conectat la pagina;
- Webhooks pentru mesaje;
- permisiuni pentru Messenger / Instagram Messaging;
- proces de review Meta pentru productie.

