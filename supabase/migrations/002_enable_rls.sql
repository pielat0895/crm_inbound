-- supabase/migrations/002_enable_rls.sql
-- Abilita RLS su tutte le tabelle. Nessuna policy = deny-all per anon/authenticated.
-- Il backend usa la service role key, che bypassa RLS: nessun impatto sulle API.
-- Il client browser (anon key) perde accesso diretto: voluto — tutto passa da /api/*.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Rimuove leads da Realtime: senza policy SELECT anon non riceve più eventi,
-- e il Kanban è passato a polling via /api/leads.
ALTER PUBLICATION supabase_realtime DROP TABLE leads;
