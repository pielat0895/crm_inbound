-- supabase/migrations/006_appointment_status.sql
-- Nuovo campo stato_appuntamento: esito dell'appuntamento, indipendente
-- dalla data/ora in `appuntamento` (sempre manuale, nessuna colonna legacy
-- da riconciliare — a differenza di stadio_pipeline/stato, qui non serve
-- uno script di migrazione dati: il DEFAULT copre tutte le righe esistenti).

ALTER TABLE leads ADD COLUMN stato_appuntamento text NOT NULL DEFAULT 'Non schedulato';

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_appuntamento_check
  CHECK (stato_appuntamento IN ('Non schedulato', 'Schedulato', 'Effettuato', 'Non presentato'));
