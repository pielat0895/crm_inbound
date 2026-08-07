-- supabase/migrations/004_pipeline_stages_update.sql
-- stadio_pipeline non contiene più stati terminali: l'esito vive in `stato`
-- (vedi 005_lead_status_constraints.sql, applicata dopo la migrazione dati).
UPDATE settings
SET value = '["Lead In","Discovery","Proposal Sent","Proposal Signed"]', updated_at = now()
WHERE key = 'pipeline_stages';
