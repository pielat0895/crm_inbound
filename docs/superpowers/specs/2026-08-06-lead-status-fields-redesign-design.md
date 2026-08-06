# Ridisegno campi stato lead (Stadio / Stato lead / Stato)

**Data:** 2026-08-06
**Stato:** Approvato, pronto per piano di esecuzione

## Problema

Tre colonne testuali su `leads` (`stadio_pipeline`, `stato_lead`, `stato`) dovrebbero raccontare dove si trova e cosa succede a un lead, ma oggi non permettono di costruire metriche stabili:

- `stadio_pipeline` è l'unico campo cablato in Kanban/dashboard/filtri, ma **due vocabolari diversi coesistono in codice**: quello in `settings.pipeline_stages` (Nuovo/Contattato/In trattativa/Proposta inviata/Vinto/Perso, usato realmente da dropdown/Kanban/filtri) e quello hardcoded in `DEFAULT_PIPELINE_STAGES`/`CLOSED_STAGES`/`STAGE_COLORS` (Lead In/Discovery/Proposal Sent/Chiuso (Vinto)/Chiuso (Perso)/Cliente/Studente, usato da `isActiveLead()` e dalle KPI won/lost). Le due liste non combaciano: i confronti per stringa falliscono silenziosamente.
- `stato_lead` (Attivo/In Attesa/Chiuso) è scritto dal form e da import/webhook ma **non è mai letto** da nessuna logica: dato morto.
- `stato` è testo libero senza vocabolario, mai letto da nessuna parte tranne il form: dato morto.
- `motivo_lost` esiste ma non è mai condizionato allo stato "Perso" né mostrato in nessun report.

Risultato: nessun campo separa in modo affidabile "dove è arrivato nel funnel" da "cosa gli è successo alla fine" (vinto/perso/rimandato/non qualificato/diventato cliente/...). Impossibile costruire un report tipo "dove muoiono i lead".

## Obiettivo

Ridefinire il significato dei tre campi esistenti (nessuna nuova colonna, nessuna nuova tabella) così che ciascuno abbia un ruolo distinto e sia effettivamente usato dalle metriche:

| Campo | Ruolo | Nuovi valori |
|---|---|---|
| `stadio_pipeline` | Posizione nel funnel *prima della chiusura* | Lead In → Discovery → Proposal Sent → Proposal Signed |
| `stato_lead` | Indicatore di salute/attività manuale | Attivo, In Attesa, Chiuso, Cliente |
| `stato` | Esito/stato dettagliato — guida le metriche won/lost/dormiente | In corso, In chiusura, Rimandato, Vinto, Perso, Cliente, Non qualificato, Studente |

## Decisioni di design

1. **`stadio_pipeline` non contiene più stati terminali.** Vinto/Perso/Cliente/Studente si spostano interamente su `stato`. Quando `stato` diventa terminale, `stadio_pipeline` **resta congelato** all'ultimo valore raggiunto — così si può sempre rispondere "fin dove è arrivato prima di fermarsi", che è esattamente la metrica richiesta.

2. **Classificazione attivo/chiuso per la logica di business** (task feed, esclusioni Kanban, KPI) si basa su `stato`, non più su `stadio_pipeline`:
   - **Attivo**: In corso, In chiusura, Rimandato
   - **Chiuso/terminale**: Vinto, Perso, Cliente, Non qualificato, Studente

3. **`stato_lead` resta manuale e indipendente da `stato`** (scelta esplicita dell'utente, pur sapendo che può disallinearsi da `stato` — es. `stato_lead=Attivo` mentre `stato=Perso`). Nessuna logica di business ne dipende oggi, quindi il rischio è contenuto a un'incoerenza visiva nel form, non a un bug nelle metriche.

4. **`motivo_lost`** diventa visibile in `LeadForm` solo quando `stato === 'Perso'`.

5. **Tutti e tre i campi passano da testo libero/CHECK assente a un vocabolario chiuso** (Select nel form + CHECK constraint nel DB), applicato solo dopo la migrazione dati (vedi sotto) per evitare scritture che falliscono a metà.

## Migrazione dati esistenti

Le righe attuali hanno `stadio_pipeline` in un mix dei due vocabolari vecchi. Serve uno script one-off, non una migrazione SQL cieca:

1. **Backup/export completo** della tabella `leads` prima di qualsiasi modifica.
2. **Script dry-run**: per ogni riga, stampa `stadio_pipeline` attuale → `stato` proposto + `stadio_pipeline` proposto, senza scrivere nulla. Euristica:
   - `Vinto` / `Chiuso (Vinto)` → `stato=Vinto`
   - `Perso` / `Chiuso (Perso)` → `stato=Perso`
   - `Cliente` → `stato=Cliente`
   - `Studente` → `stato=Studente`
   - resto → `stato=In corso`, `stadio_pipeline` mappato al valore più vicino tra i 4 nuovi stadi
   - Righe ambigue (vocabolario misto o valori inattesi) segnalate a parte per revisione manuale, non applicate automaticamente.
3. **Revisione umana dell'output dry-run** prima di applicare.
4. **Apply**: UPDATE effettivo solo dopo approvazione.
5. **CHECK constraint** aggiunto ai tre campi solo a migrazione completata e verificata.
6. **Deploy del codice applicativo solo dopo i dati migrati** — evita una finestra in cui UI e dati sono disallineati.

## Impatto sul codice

- `types/index.ts` — nuovi array opzioni (`stadio_pipeline`, `STATO_LEAD_OPTIONS`, nuovo `STATO_OPTIONS`); rimuovere `DEFAULT_PIPELINE_STAGES`/`CLOSED_STAGES`/`ACTIVE_STAGE_EXCLUSIONS` basati su stadio, ricrearli basati su `stato`.
- `lib/tasks.ts` — `isActiveLead()` passa a leggere `stato`; `advancedStages()` si semplifica (i 4 stadi fissi non hanno più terminal states da escludere).
- `app/dashboard/page.tsx` — `wonLeads`, `openLeads`, ogni uso di `CLOSED_STAGES` → basati su `stato`.
- `components/leads/LeadForm.tsx` — `stato` da `Field` testo libero a `Select` con le 8 opzioni; `motivo_lost` condizionato a `stato==='Perso'`; `stato_lead` aggiunge opzione `Cliente`.
- 4 mappe `STAGE_COLORS` duplicate (`LeadTable.tsx`, `SearchModal.tsx`, `PipelineChart.tsx`, `leads/[id]/page.tsx`) — aggiornate ai nuovi valori; occasione per accorparle in un unico modulo condiviso dato che vanno comunque toccate tutte e quattro.
- `components/kanban/KanbanBoard.tsx` — colonne diventano i 4 stadi fissi invece che derivate da `settings.pipeline_stages`.
- `lib/webhook-mapping.ts` — aggiunto `stato` ai campi scrivibili da n8n (il workflow n8n "Stage Auto-Updater" va aggiornato separatamente, fuori da questo repo).
- Nuova migration SQL in `supabase/migrations/` per i CHECK constraint (applicata a valle dello script dati).

## Fuori scope

- Modifica del workflow n8n "Stage Auto-Updater" (vive fuori dal repo).
- Pulizia di righe storiche ambigue non risolvibili dall'euristica automatica (richiedono decisione manuale caso per caso, fuori dallo script).
- Sincronizzazione automatica `stato_lead` ↔ `stato` (esplicitamente rifiutata, vedi Decisione 3).
