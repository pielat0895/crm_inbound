-- supabase/migrations/005_lead_status_constraints.sql
-- Applicare SOLO dopo aver eseguito scripts/migrate-lead-status.mjs --apply
-- e verificato che ogni riga sia nel nuovo vocabolario (già fatto — vedi
-- Task 9 del piano; 'Da sistemare' è un placeholder legittimo per le 206
-- righe senza stadio storico ricostruibile, non un errore).

ALTER TABLE leads ALTER COLUMN stadio_pipeline SET DEFAULT 'Lead In';

ALTER TABLE leads
  ADD CONSTRAINT leads_stadio_pipeline_check
  CHECK (stadio_pipeline IN ('Lead In', 'Discovery', 'Proposal Sent', 'Proposal Signed', 'Da sistemare'));

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_lead_check
  CHECK (stato_lead IS NULL OR stato_lead IN ('Attivo', 'In Attesa', 'Chiuso', 'Cliente'));

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_check
  CHECK (stato IS NULL OR stato IN ('In corso', 'In chiusura', 'Rimandato', 'Vinto', 'Perso', 'Cliente', 'Non qualificato', 'Studente'));
