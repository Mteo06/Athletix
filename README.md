# Athletix — Gestionale per Impianti Sportivi

Piattaforma multi-tenant per la gestione di piscine, centri padel, campi calcio,
tennis e corsi sportivi: CRM atleti, planner spazi, controllo accessi via QR,
gestione staff con RBAC a 5 livelli, store/vendite con ricevute PDF.

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + RLS) · Resend** (email transazionali reali).

> **Nota**: l'app richiede un progetto Supabase reale collegato fin dal primo
> avvio (vedi sezione 2). Non esiste una "modalità demo": ogni pagina
> dell'area protetta legge e scrive dati veri sul tuo database.

---

## 1. Struttura del progetto

```
athletix/
├─ supabase/
│  └─ schema.sql          # Schema completo + RLS policies + seed demo
├─ src/
│  ├─ app/                # Route Next.js (App Router)
│  │  ├─ page.tsx                    # Landing pubblica
│  │  ├─ login/                      # Login staff
│  │  ├─ setup-organization/         # Wizard onboarding nuovo impianto
│  │  ├─ (dashboard)/                # Area protetta (sidebar + RBAC)
│  │  │  ├─ dashboard/                 # KPI, certificati in scadenza
│  │  │  ├─ crm/                       # Anagrafica atleti + scheda 360°
│  │  │  ├─ planner/                   # Griglia settimanale spazi/corsi
│  │  │  ├─ store/                     # Vendita abbonamenti/carnet + ricevuta PDF
│  │  │  ├─ checkin/                   # Scanner QR per segreteria
│  │  │  ├─ staff-management/          # Creazione account + inviti email reali
│  │  │  └─ approvals/                 # Coda approvazioni onboarding staff
│  │  ├─ staff/                      # Dashboard mobile istruttori/bagnini
│  │  ├─ totem/                      # Kiosk pubblico self-service (fullscreen)
│  │  └─ api/
│  │     ├─ verify-entry/            # Motore di validazione ingressi
│  │     ├─ invite-staff/            # Invito staff: Supabase Admin + Resend
│  │     └─ receipt/                 # Generazione ricevuta PDF
│  ├─ lib/
│  │  ├─ supabase/{client,server}.ts # Client Supabase browser/server/admin
│  │  ├─ rbac.ts                     # Matrice permessi per ruolo
│  │  ├─ access-engine.ts            # Logica GREEN/RED/YELLOW ingressi
│  │  ├─ qr.ts                       # QR dinamico TOTP (RFC 6238) + QR statico
│  │  └─ session.ts                  # Helper sessione utente lato server
│  ├─ components/ui/                 # Design system (button, card, dialog…)
│  └─ middleware.ts                  # Refresh sessione + guardie di rotta
├─ .env.example
└─ package.json
```

## 2. Setup rapido

### 2.1 Installa le dipendenze

```bash
npm install
```

### 2.2 Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Apri **SQL Editor** → incolla l'intero contenuto di `supabase/schema.sql` → **Run**
   (crea tabelle, RLS policy, funzioni helper e alcuni dati demo)
3. Vai su **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key`
   - `service_role key` (segreta, mai esposta al client)

### 2.3 Configura le variabili d'ambiente

```bash
cp .env.example .env.local
```

Compila `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL="Athletix <onboarding@tuodominio.com>"

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Resend**: crea una API key su [resend.com/api-keys](https://resend.com/api-keys).
> Per inviare da un dominio proprio verifica il dominio in Resend; in test puoi
> usare `onboarding@resend.dev` come mittente.

### 2.4 Avvia in locale

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) → **Crea il tuo impianto**
per generare la prima organizzazione e l'account Amministratore (SUPER_ADMIN).

---

## 3. Ruoli e permessi (RBAC)

| Ruolo | Può fare |
|---|---|
| **Admin Generale** (SUPER_ADMIN) | Tutto, incluso setup impianto e configurazione globale |
| **Direttore** | Tutto tranne setup iniziale: staff, listini, planner, CRM, store, check-in |
| **Coordinatore** | Planner, corsi, iscrizioni, CRM in lettura |
| **Segreteria** | CRM, vendite, check-in, approvazioni onboarding |
| **Istruttore / Bagnino** | Solo i propri corsi, turno personale, marcatura presenze |

La matrice completa è in `src/lib/rbac.ts`; le stesse regole sono rispecchiate
nelle **Row Level Security policy** di `supabase/schema.sql`, così la sicurezza
non dipende solo dal frontend.

## 4. Motore di controllo accessi (QR)

- Ogni atleta ha un `qr_secret` univoco (colonna `athletes.qr_secret`)
- Il QR mostrato in app genera un **token TOTP a 8 cifre, valido 60 secondi**
  (`src/lib/qr.ts`, RFC 6238 puro via Web Crypto API — nessuna dipendenza
  esterna necessaria)
- Alla scansione (`/api/verify-entry`), il server:
  1. verifica il token e la sua finestra temporale
  2. controlla il certificato medico (mancante/scaduto → **RED**)
  3. controlla il titolo di accesso (abbonamento/carnet/biglietto/gift card)
  4. applica le regole specifiche (giorni/settimana, crediti residui, validità)
  5. restituisce **GREEN / YELLOW / RED** e registra l'ingresso in `entry_logs`
- La stessa logica pura è riusabile e testabile in `src/lib/access-engine.ts`
  (funzione `verifyProfileEntry`)

## 5. Pagamenti POS

Il flusso di vendita (`/store`) supporta **Cassa** e **POS**. Il POS è
**simulato** (spinner di elaborazione + esito positivo) perché non è stato
collegato alcun provider di pagamento reale. Per integrare un PSP reale
(Stripe Terminal, Nexi, SumUp, ecc.) sostituisci la funzione `completeSale`
in `src/app/(dashboard)/store/sales-flow.tsx` con la chiamata al tuo provider.

## 6. Inviti staff via email reale

`/api/invite-staff` usa:
- **Supabase Admin API** (`service_role`) per creare l'invito di autenticazione
- **Resend** per inviare l'email di benvenuto reale

Senza `RESEND_API_KEY` la route risponde con un errore esplicativo invece di
fallire silenziosamente.

## 7. Deploy in produzione

Consigliato [Vercel](https://vercel.com):

```bash
npm run build   # verifica sempre la build prima del deploy
```

Imposta le stesse variabili di `.env.local` nelle **Environment Variables**
del progetto Vercel (Production + Preview).

## 8. Limiti noti / prossimi passi

- Il **planner** mostra fasce orarie semplificate (mattina/pranzo/sera) a scopo
  dimostrativo: per una griglia oraria completa a 15 minuti basta estendere
  `HOURS` in `planner-grid.tsx` e la logica di conflitto sugli `space_ids`.
- Le **ricevute PDF** non sono fiscalmente valide di per sé: per l'Italia
  serve l'integrazione con un registratore telematico o un provider
  fiscale (es. Fatture in Cloud, Aruba).
- I **tipi TypeScript** in `src/types/database.ts` sono scritti a mano
  rispecchiando `schema.sql`; una volta collegato il progetto reale puoi
  rigenerarli con:
  ```bash
  npx supabase gen types typescript --project-id <id> > src/types/database.ts
  ```

## 9. Risoluzione problemi comuni

### "Crea il tuo impianto" mi rimanda sempre al login
Bug risolto: `/setup-organization` va aperta prima ancora di avere una sessione
(è lì che se ne crea una), quindi deve stare tra le rotte pubbliche del
middleware. Se hai scaricato una versione precedente, aggiorna
`src/middleware.ts` aggiungendo `"/setup-organization"` a `PUBLIC_PATHS`.

### Il wizard si blocca con un errore RLS durante la creazione dell'organizzazione
La tabella `organizations` ha la RLS attiva ma nella prima versione dello
schema mancava la policy di **INSERT** (senza policy esplicita, RLS blocca
tutto di default). Se hai già eseguito `schema.sql` su un progetto esistente,
esegui in SQL Editor solo questa patch:

```sql
create policy org_insert on organizations for insert
  with check (auth.uid() is not null);
```

### "Impossibile completare il setup" ma l'utente compare in Authentication e `organizations` si popola, `profiles` resta vuota
Bug risolto in questa versione: il wizard faceva `insert(...).select().single()`
sulla tabella `organizations`, e quella `.select()` per rileggere la riga
appena creata richiedeva un permesso di lettura (`org_select`) che dipende dal
profilo — profilo che a quel punto non esiste ancora (viene creato subito
dopo). L'insert dell'organizzazione andava a buon fine, ma la rilettura
falliva per RLS, l'errore veniva lanciato lì e il codice non arrivava mai a
creare la riga in `profiles`. Ora l'id dell'organizzazione viene generato lato
client e l'insert non richiede più una rilettura immediata.

**Se hai già provato prima di questo fix**, probabilmente ti ritrovi con
residui da ripulire prima di riprovare la registrazione:
- **Authentication → Users**: elimina l'utente creato a metà (stessa email che
  vuoi riusare), oppure registrati con un'email diversa.
- **Table Editor → organizations**: elimina eventuali righe orfane create nei
  tentativi falliti (nessun profilo punta a quell'`org_id`), oppure lasciale
  pure: non danno fastidio, sono solo record inutilizzati.

### Errore "Invalid login credentials" al primo accesso
Normale: non esiste ancora nessun utente. Usa **"Crea il tuo spazio"** dalla
pagina di login (o vai direttamente su `/setup-organization`) per registrare
il primo account Amministratore.

### Dopo la registrazione non succede nulla / errore poco chiaro
Se nel tuo progetto Supabase è attiva l'impostazione **"Confirm email"**
(Authentication → Providers → Email), `signUp()` crea l'utente ma **non apre
una sessione** finché non confermi l'indirizzo cliccando il link ricevuto via
email. Il wizard te lo segnala esplicitamente. Per test rapidi in locale puoi
disattivare temporaneamente "Confirm email" in quella schermata: così la
sessione si apre subito e il wizard completa la creazione dell'organizzazione
in un solo passaggio.

### Errore "HTTP ERROR 431 — Request Header Fields Too Large" dopo il login
Capita quando, durante i test, si fanno più tentativi di registrazione/login
nello stesso browser: si accumulano cookie di sessione Supabase (a volte
"spezzati" in più cookie `sb-<project>-auth-token.0`, `.1`, ecc.) che finiscono
per superare il limite di header del server.

- **Soluzione rapida**: apri il sito in una finestra in incognito, oppure
  cancella i cookie di `localhost:3000` dal browser (DevTools → Application →
  Cookies → elimina tutto) e rifai il login.
- **Rete di sicurezza già inclusa**: gli script `dev`/`start` in
  `package.json` impostano `NODE_OPTIONS=--max-http-header-size=32768` per
  alzare il limite di default del server Node, così l'app tollera meglio
  sessioni con cookie più pesanti del solito.

## 10. Performance

Se il login o i cambi pagina sono lenti, controlla questi due punti (già
risolti in questa versione, ma utili se personalizzi il codice):

- **`middleware.ts`** e **`lib/session.ts`** usano `supabase.auth.getSession()`
  invece di `getUser()`. `getUser()` rivalida il token contro il server Auth
  di Supabase ad ogni chiamata (un round-trip di rete in più per ogni
  richiesta); `getSession()` legge il JWT già presente nel cookie, senza
  chiamate di rete. La sicurezza reale resta comunque garantita dalle policy
  RLS a livello di database, non dal middleware.
- **`lib/session.ts`** recupera profilo e organizzazione con **una sola query
  con join** (`profiles.select("*, organization:organizations(*)")`) invece
  di due chiamate sequenziali.
- In sviluppo, `next dev` compila le rotte al volo la prima volta che le
  visiti: è normale un piccolo ritardo alla primissima apertura di ogni
  pagina. Per un'esperienza di navigazione identica alla produzione, usa:
  ```bash
  npm run build && npm run start
  ```

## 11. Prodotti, documenti, vendite anonime e planner configurabile

Novità aggiunte dopo il primo rilascio:

- **Store → Prodotti in vendita**: chi ha il permesso `pricing:edit`
  (Admin Generale, Direttore) può creare/disattivare abbonamenti, carnet,
  biglietti singoli e gift card direttamente dall'interfaccia, senza toccare
  Supabase. Componente: `src/app/(dashboard)/store/pricing-plan-manager.tsx`.
- **Vendita anonima**: scegliendo un prodotto di tipo "Ingresso singolo" nello
  Store, compare l'opzione **"Vendita anonima (biglietto singolo, senza
  cliente)"**: la vendita viene registrata in `orders` con `athlete_id = null`,
  senza creare un titolo di accesso tracciabile (è un ingresso occasionale,
  non un profilo con QR).
- **Titoli di accesso automatici**: acquistando un abbonamento/carnet/gift
  card/biglietto per un atleta specifico, lo Store crea automaticamente la
  riga corrispondente in `access_titles`, così l'atleta può entrare da
  Check-in/Totem subito dopo l'acquisto (in precedenza andava creata a mano).
- **Documenti (certificati medici)**: chi ha il permesso `documents:upload`
  (Admin Generale, Direttore, Coordinatore, Segreteria — non l'Istruttore) può
  caricare il PDF/immagine del certificato medico direttamente dalla scheda
  atleta (tab "Certificati Medici"). I file finiscono nel bucket Storage
  privato `documents`, organizzati per organizzazione e atleta, e si aprono
  con un link firmato temporaneo (mai pubblici).
- **Planner configurabile**: chi ha il permesso `facility:configure` (Admin
  Generale, Direttore) può creare impianti (facility) e spazi (corsie, campi)
  direttamente dal Planner con il pulsante **"Gestisci impianti"**, senza
  passare da Supabase.

### Patch SQL per un progetto Supabase già esistente

Se hai già eseguito `schema.sql` prima di questa versione, esegui in SQL
Editor questa patch incrementale (idempotente, puoi rieseguirla senza danni):

```sql
-- 1) Vendite anonime: l'atleta diventa opzionale sugli ordini
alter table orders alter column athlete_id drop not null;

-- 2) Bucket Storage privato per i documenti (certificati medici, allegati)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_select on storage.objects;
create policy documents_select on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
  );

drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_staff_operativo()
  );

drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_staff_operativo()
  );
```

Non serve nessuna patch per le funzioni `auth_org_id()` ecc. se hai già
applicato la patch `security definer` della versione precedente.



