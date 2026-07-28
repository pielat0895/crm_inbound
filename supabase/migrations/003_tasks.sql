-- supabase/migrations/003_tasks.sql
-- Task hub: task manuali + campo previsione chiusura sui lead.

CREATE TABLE tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  titolo     text NOT NULL,
  note       text,
  due_date   date,
  lead_id    uuid REFERENCES leads(id) ON DELETE CASCADE,
  priorita   text NOT NULL DEFAULT 'media' CHECK (priorita IN ('alta','media','bassa')),
  done       boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  owner      text
);

CREATE INDEX tasks_due_open_idx ON tasks (done, due_date);
CREATE INDEX tasks_lead_idx ON tasks (lead_id);

-- Previsione di chiusura, distinta da data_chiusura (chiusura effettiva).
ALTER TABLE leads ADD COLUMN data_chiusura_prevista date;

-- Coerente con 002_enable_rls.sql: nessuna policy = deny-all per anon/authenticated.
-- Il backend usa la service role key e bypassa RLS.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
