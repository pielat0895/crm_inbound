# Quick-edit & delete dei lead dalla lista — Design

**Data:** 2026-07-20
**Stato:** approvato, pronto per il piano

## Problema

Nella lista lead (`/leads`, [LeadTable.tsx](../../../components/leads/LeadTable.tsx)) per modificare
anche solo un campo bisogna entrare nel dettaglio del lead, cambiare, tornare indietro. Flusso
lento per micro-modifiche frequenti (cambio stadio, valore, owner, date). Serve modificare o
eliminare un lead direttamente dalla lista.

## Decisioni (da brainstorming)

| Dimensione | Scelta |
|-----------|--------|
| Meccanismo edit | Drawer laterale (slide-over da destra) |
| Campi editabili | Tutti i gruppi: Pipeline/vendita, Contatti, Date/follow-up, Qualificazione (= form completo meno Note) |
| Posizione tastini | Colonna "Azioni" fissa a destra, sempre visibili |
| Conferma delete | Popup di conferma esplicita |
| Colonne visibili | Invariate (le 7 attuali) + nuova colonna Azioni |

## Architettura

Riuso massimo dei componenti esistenti, nessun form duplicato.

### 1. `LeadTable.tsx` — colonna Azioni

- Nuova `<th>Azioni</th>` in fondo e `<td>` per riga con due icon-button:
  - ✎ matita → apre il drawer di edit
  - 🗑 cestino, `variant="destructive"` (rosso) → apre la conferma delete
- Entrambi i button chiamano `e.stopPropagation()` nel loro `onClick`, così **non**
  fanno scattare la navigazione al dettaglio del `<tr>` (`onClick={() => router.push(...)}`).
  Il click sul resto della riga continua a navigare al dettaglio.
- `LeadTable` diventa stateful: `editingLead: LeadWithComputed | null` e
  `deletingLead: LeadWithComputed | null`.
- `colSpan` dell'EmptyState passa da 7 a 8.

### 2. `LeadEditDrawer.tsx` (nuovo componente)

- Pannello slide-over da destra che avvolge il `LeadForm` esistente con `hideNote`.
- Contiene tutti e 4 i gruppi campi. I campi engagement n8n (touchpoints, ultimo
  contatto, risposto ultima mail) restano read-only come già nel form (`isEdit`).
- Props: `lead`, `open`, `onClose`.
- Al salvataggio → chiude il drawer + `router.refresh()`. All'annulla → chiude il drawer.

### 3. Modifica minima a `LeadForm.tsx`

- Due prop opzionali: `onSaved?: () => void` e `onCancel?: () => void`.
- Se `onSaved` è passato, dopo il PATCH riuscito lo chiama **invece** di
  `router.refresh()`. Altrimenti comportamento attuale invariato.
- Se `onCancel` è passato, il bottone "Annulla" lo chiama **invece** di `router.back()`.
- Nessuna regressione sulle pagine `/leads/new` e dettaglio (non passano le prop → default).

### 4. Delete

- Click cestino → `deletingLead` set → popup di conferma
  ("Eliminare {nome cognome}? [Elimina] [Annulla]").
- Conferma → `DELETE /api/leads/{id}` (endpoint già esistente).
- Successo → `toast.success('Lead eliminato')` + rimozione ottimistica della riga dallo
  stato locale + `router.refresh()`.
- Errore → `toast.error(...)`, la riga resta.

### 5. UI primitive Drawer/Sheet e Confirm

- In fase di piano: verificare `components/ui/` per un componente Sheet/Drawer o Dialog
  esistente (dipendenza `@base-ui/react` ha Dialog). Se manca un drawer, aggiungere lo
  shadcn `sheet`; per la conferma delete usare un Dialog/AlertDialog o replicare il pattern
  inline già usato in [DeleteLeadButton.tsx](../../../app/leads/[id]/DeleteLeadButton.tsx).

### 6. Bonus sicurezza (stesso file)

- [leads/page.tsx](../../../app/leads/page.tsx) riga ~32 interpola ancora `sp.q` raw dentro
  `.or(...)` → stesso filter-injection PostgREST già chiuso nelle API route ma qui lato
  Server Component ancora aperto. Applicare `sanitizeSearchTerm` (da `lib/search.ts`) a `sp.q`
  prima dell'interpolazione.

## Flusso dati

```
Edit:   ✎ click → stopPropagation → setEditingLead(lead) → drawer open
        → LeadForm PATCH /api/leads/{id} → onSaved → onClose + router.refresh()

Delete: 🗑 click → stopPropagation → setDeletingLead(lead) → popup conferma
        → DELETE /api/leads/{id} → toast + filtro riga locale + router.refresh()

Row (non-azioni) click → router.push(`/leads/{id}`)  (invariato)
```

La lista è renderizzata da un Server Component `force-dynamic`; dopo ogni mutazione
`router.refresh()` ri-fetcha i dati aggiornati.

## Gestione errori

- PATCH: già gestito dentro `LeadForm` (setError + toast, drawer resta aperto).
- DELETE: `toast.error`, riga non rimossa.
- Guard: i click sui button non devono mai propagare al `<tr>`.

## Testing

- `LeadForm`: con `onSaved`/`onCancel` passati, chiama le callback invece di
  `router.refresh()`/`router.back()`.
- `LeadEditDrawer`: apertura/chiusura, render del form pre-compilato.
- Delete: flusso conferma → chiamata DELETE → rimozione riga.
- Nota: i test jsdom girano solo a worker singolo in questo ambiente (vedi config vitest).

## Fuori scope (YAGNI)

- Editing inline delle celle
- Azioni bulk / selezione multipla
- Personalizzazione colonne
- Edit della nota nel drawer (ha già auto-save nel dettaglio)
