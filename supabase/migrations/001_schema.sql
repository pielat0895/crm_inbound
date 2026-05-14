-- supabase/migrations/001_schema.sql

CREATE TABLE leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  nome                  text,
  cognome               text,
  azienda               text,
  email                 text UNIQUE,
  tel                   text,
  ruolo                 text,
  tipo                  text,
  richiesta             text,
  origine               text,
  industry              text,
  dipendenti            integer,
  hanno_sito            boolean,
  company_web           text,
  esperienza_us         boolean,
  stadio_pipeline       text NOT NULL DEFAULT 'Nuovo',
  stato_lead            text,
  stato                 text,
  motivo_lost           text,
  valore                numeric(12,2),
  owner                 text,
  data_apertura         date DEFAULT CURRENT_DATE,
  appuntamento          timestamptz,
  ricontattare          date,
  data_ultimo_contatto  date,
  numero_messaggi       integer NOT NULL DEFAULT 0,
  risposto_ultima_mail  boolean NOT NULL DEFAULT false,
  touchpoints           integer NOT NULL DEFAULT 0,
  note                  text
);

CREATE TABLE interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo       text NOT NULL CHECK (tipo IN ('nota','email','chiamata','meeting')),
  contenuto  text NOT NULL
);

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('followup_threshold_days', '7'),
  ('pipeline_stages', '["Nuovo","Contattato","In trattativa","Proposta inviata","Vinto","Perso"]');

-- Enable Realtime on leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Indexes
CREATE INDEX idx_leads_stadio ON leads(stadio_pipeline);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_ricontattare ON leads(ricontattare);
CREATE INDEX idx_interactions_lead ON interactions(lead_id, created_at DESC);
