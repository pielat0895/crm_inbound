# Miglioramenti KPI Dashboard

**Data:** 2026-08-11
**Stato:** Approvato, pronto per piano di esecuzione

## Problema

La dashboard (`app/dashboard/page.tsx`) calcola i suoi KPI mischiando coorti temporali diverse senza dichiararlo: il "Tasso conversione" divide un numeratore filtrato per data di chiusura per un denominatore filtrato per data di apertura — due insiemi di lead diversi, non uno sottoinsieme dell'altro. Lo stesso bug è presente nel grafico "Conversione per origine". Altri numeri utili per decidere non esistono affatto: nessun forecast pesato per probabilità di stadio, nessuna vista su dove/perché i lead si perdono (solo il fatturato dei vinti), nessun tasso di conversione post-appuntamento, e i lead mai contattati (fermi da mesi) sono invisibili sia in "Scaduti follow-up" sia altrove.

## Obiettivo

Rendere ogni KPI dashboard riconducibile a una coorte temporale esplicita e coerente, e aggiungere le metriche mancanti che le quattro aree di decisione richiedono: salute pipeline, forecast fatturato, performance owner/origine, diagnosi appuntamenti.

## Coorti temporali — principio guida

D'ora in poi ogni metrica filtrata per data dichiara esplicitamente quale campo usa:

- **Coorte apertura**: lead con `data_apertura` nel periodo selezionato, indipendentemente da quando (o se) hanno chiuso. Risponde a "dei lead entrati in questo periodo, come sono andati (oggi)".
- **Coorte chiusura**: lead con `data_chiusura` nel periodo selezionato. Risponde a "delle decisioni prese in questo periodo, qual è stato l'esito".

Non esiste più un KPI che mischi le due date nello stesso rapporto numeratore/denominatore.

## Decisioni di design

### 1. Tasso conversione → due card distinte

Sostituiscono l'attuale card unica "Tasso conversione":

- **"Conversione lead"** (coorte apertura): `allLeads` (lead aperti nel periodo, filtro esistente su `data_apertura`) → percentuale con `stato` **oggi** uguale a `Vinto`. Non richiede che la chiusura sia avvenuta nel periodo.
- **"Win rate"** (coorte chiusura): tra i lead con `data_chiusura` nel periodo e `stato` in (`Vinto`, `Perso`) → percentuale `Vinto`. Denominatore limitato a Vinto+Perso: `Non qualificato`/`Cliente`/`Studente` sono esiti diversi da una decisione commerciale vinta/persa, esclusi dal calcolo.

`avgDaysToClose` e `totalRevenue` restano sulla coorte chiusura (comportamento invariato — già corretto).

### 2. Forecast pipeline pesato

- **Settings**: nuova chiave `pipeline_stage_probabilities`, mappa `{ [stadio]: percentuale }`, una voce per ogni stadio in `settings.pipeline_stages`. Persistita come riga JSON nella tabella `settings` esistente (stesso pattern di `pipeline_stages`), niente nuova tabella.
- **UI Settings**: nuova sezione "Probabilità di chiusura per stadio" — un input percentuale per ciascuno stadio pipeline corrente, salvataggio con lo stesso pattern del campo soglia follow-up esistente.
- **Default**: se uno stadio non ha una probabilità salvata (stadio nuovo aggiunto dopo la configurazione iniziale), la sua probabilità è `0` — i lead in quello stadio non contribuiscono al forecast finché non viene configurata esplicitamente. Nessuna estrapolazione automatica.
- **Nuova card "Forecast pesato"**: Σ su `openLeads` di `valore × (probabilità_stadio / 100)`. Affianca "Pipeline aperta" (somma grezza, invariata) — non la sostituisce, sono due letture complementari.

### 3. Performance origine (fix) e owner (nuovo)

- **"Conversione per origine"**: stesso schema della card "Conversione lead" — coorte apertura, vinti = `stato` oggi `Vinto` tra i lead di quell'origine aperti nel periodo. Sostituisce il calcolo attuale (che filtrava i vinti per data di chiusura contro un totale per data di apertura).
- **Nuovo grafico "Performance owner"**: stesso schema, per owner invece che per origine. Il grafico "Lead per owner" esistente (conteggio puro) resta com'è, affiancato da questo nuovo grafico basato su tasso di vittoria.

### 4. Distribuzione esiti

- Nuovo grafico a barre: tra i lead con `data_chiusura` nel periodo, conteggio per ciascun valore di `STATO_TERMINALI` (`Vinto`, `Perso`, `Cliente`, `Non qualificato`, `Studente`). Coorte chiusura — coerente con "Win rate".
- Copre un buco esistente: oggi la dashboard mostra solo il fatturato dei vinti, nessuna vista su dove/quanto si perde.

### 5. Tasso scheduling→chiusura

- Nuova card accanto a "Tasso no-show": tra i lead con `stato_appuntamento = 'Effettuato'` **e** `data_chiusura` nel periodo **e** `stato` in (`Vinto`, `Perso`) → percentuale `Vinto`. Stessa filosofia "solo chiusi" del win rate generale — chi ha fatto l'appuntamento ma è ancora in corso non entra nel calcolo, evita di diluire il tasso con esiti non ancora noti.

### 6. Lead a rischio (sostituisce "Scaduti follow-up")

- Riusa `giorniFermo()` (già in `lib/tasks.ts`, oggi usata solo dal task feed, non dalla dashboard): un lead mai contattato è "fermo" dalla sua `data_apertura` (o `created_at` come fallback), non invisibile come accade oggi con `giorni_ultimo_contatto`.
- Stessa soglia esistente `settings.followup_threshold_days` — nessun nuovo parametro di configurazione.
- La card sostituisce "Scaduti follow-up" (stesso slot in dashboard), con conteggio potenzialmente più alto perché include anche i lead mai contattati.

## Cosa NON cambia

- `openLeads`, "Pipeline aperta" (somma grezza), "Scaduti follow-up" come concetto di soglia, `noShowRate`, i grafici sito/dipendenti/industry/trend mensile: nessuna di queste logiche ha coorti ambigue oggi, restano come sono.
- Nessuna modifica allo schema `leads` o a migrazioni dati — tutte le nuove metriche sono derivate da campi già esistenti.

## Fuori scope

- Editor UI per aggiungere/rimuovere/riordinare gli stadi pipeline (oggi non esiste, resta gestito lato DB) — questa spec aggiunge solo l'editor delle probabilità per gli stadi esistenti.
- Automazioni derivate dai nuovi KPI (es. alert automatici sui lead a rischio) — fuori scope, eventuale richiesta futura separata.
- Modifiche al task feed (`lib/tasks.ts` sezioni "Da fare ora"/"In arrivo"/"Dormienti") — `giorniFermo` viene riusata, non modificata.
