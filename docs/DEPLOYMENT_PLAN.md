# Plan De Deploy

## Problema Curenta

Pe calculatorul curent, `node` nu ruleaza corect:

- `node --version` intoarce Access is denied;
- `npm` nu este disponibil;
- `git` nu este disponibil in PATH.

Pentru aplicatia reala avem nevoie de Node.js si Git.

## Pasul 1 - Instalare Locala

Instalam:

1. Node.js LTS.
2. Git for Windows.
3. Visual Studio Code, optional.

Dupa instalare verificam in PowerShell:

```powershell
node --version
npm --version
git --version
```

## Pasul 2 - Conversie In Next.js

Aplicatia statica actuala devine baza vizuala.

Vom crea:

- `app/page.tsx` pentru ecranul CRM;
- componente pentru inbox, calendar, modal client, statistici, arhiva;
- API routes pentru actiuni;
- conectare la Supabase.

## Pasul 3 - Supabase

Cream proiect Supabase si rulam schema din:

```text
docs/DATABASE_SCHEMA.sql
```

Apoi pentru MVP rulam politicile temporare din:

```text
docs/SUPABASE_MVP_POLICIES.sql
```

Nota: politicile MVP permit citire/scriere cu cheia publica. Inainte de productie trebuie inlocuite cu politici bazate pe login.

Dupa ce login-ul admin/manager functioneaza, inlocuim politicile MVP cu:

```text
docs/SUPABASE_PRODUCTION_POLICIES.sql
```

Acest script opreste accesul pentru userii nelogati si permite modificarea managerilor/etapelor/produselor doar pentru admin.

Apoi adaugam:

- manageri;
- produse;
- etape;
- reguli de acces.

## Pasul 4 - GitHub

Punem proiectul intr-un repository GitHub.

## Pasul 5 - Vercel

Conectam repository-ul GitHub la Vercel.

Setam environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_VERIFY_TOKEN=
META_APP_SECRET=
```

## Pasul 6 - Meta Webhook

In Meta Developer App setam webhook-ul catre:

```text
https://domeniu.ro/api/meta/webhook
```

## Pasul 7 - Domeniu

Putem folosi domeniu Vercel temporar sau conectam un domeniu propriu.
