# Campo Stato Appuntamento

**Data:** 2026-08-10
**Stato:** Approvato, pronto per piano di esecuzione

## Problema

I lead che arrivano a un appuntamento (call/incontro) non hanno oggi modo di registrarne l'esito. Il campo esistente `appuntamento` (timestamptz) traccia solo *quando* è fissato, non *cosa è successo*: se il lead si è presentato, se l'appuntamento è ancora da fissare, o se il deal si è chiuso senza mai passare da un appuntamento (raro ma capita). Senza questo dato non è possibile misurare il tasso di no-show né distinguere questi casi nelle metriche.

## Obiettivo

Nuovo campo `stato_appuntamento` su `leads`, indipendente dal campo data/ora `appuntamento` esistente — nessuna logica automatica lo deriva dalla presenza o dalla data di quel campo, è sempre una scelta manuale dell'utente.

## Vocabolario

| Valore | Significato |
|---|---|
| `Non schedulato` | Nessun appuntamento fissato (default) |
| `Schedulato` | Appuntamento fissato, non ancora avvenuto |
| `Effettuato` | L'appuntamento si è svolto |
| `Non presentato` | Il lead non si è presentato (no-show) |

## Decisioni di design

1. **Campo totalmente manuale e indipendente dalla data `appuntamento`.** Nessuna sincronizzazione automatica in nessuna direzione — scelta esplicita dell'utente durante il brainstorming, per evitare la complessità di dedurre "si è presentato o no" da un timestamp passato senza conferma umana.
2. **Colonna NOT NULL con `DEFAULT 'Non schedulato'`.** A differenza del lavoro precedente su `stadio_pipeline`/`stato`, qui non esiste un vocabolario legacy da riconciliare: è un campo nuovo, quindi tutte le righe esistenti (e future senza valore esplicito) prendono il default via una singola `ALTER TABLE ... ADD COLUMN ... DEFAULT ...`, senza script di migrazione dati.
3. **CHECK constraint sui 4 valori fin da subito** (stesso pattern di `stato`/`stadio_pipeline`), dato che non c'è finestra di dati legacy da ripulire prima.

## Dove appare

- **`LeadForm`**: nuovo `<Select>` "Stato Appuntamento" nella sezione Tempi, vicino al campo data "Appuntamento" esistente. Stesso pattern degli altri Select del form.
- **`LeadTable`** e **dettaglio lead**: badge colorato, stesso pattern di `STATO_BADGE_CLASSES`/`STAGE_BADGE_CLASSES` (nuova mappa `STATO_APPUNTAMENTO_BADGE_CLASSES` in `lib/stage-colors.ts`).
- **`LeadFilters`**: nuovo filtro a tendina, stesso pattern del filtro stadio/origine esistente (URL params).
- **Dashboard**:
  - Card KPI "Tasso no-show" = `Non presentato / (Non presentato + Effettuato)` — esclude `Schedulato` (esito non ancora noto) e `Non schedulato` (non applicabile) dal denominatore, così la percentuale risponde esattamente a "di chi arriva a un appuntamento, quanti non si presentano".
  - Grafico a barre con la distribuzione sui 4 stati, stesso stile di `PipelineChart`.

## Fuori scope

- Nessuna automazione nel task feed (es. "ricontatta i no-show") — può essere una richiesta futura separata.
- Nessuna sincronizzazione con l'integrazione Google Calendar esistente.
- Nessun aggiornamento del workflow n8n legato agli appuntamenti (se esiste) — fuori da questo repo.
