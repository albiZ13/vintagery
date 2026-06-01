-- ============================================================
-- VINTAGERIE — Migrazione v3
-- Aggiunge: preferenze notifiche email
-- Eseguire nell'SQL Editor di Supabase DOPO migration_v2
-- ============================================================

-- ── Notification preferences su profiles ─────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_upcoming_events BOOLEAN NOT NULL DEFAULT TRUE,
  -- Notifica 3 giorni prima di un evento salvato
  ADD COLUMN IF NOT EXISTS notify_new_markets     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Notifica quando apre un nuovo mercatino nella tua regione
  ADD COLUMN IF NOT EXISTS notify_newsletter      BOOLEAN NOT NULL DEFAULT FALSE;
  -- Digest settimanale

-- ── Tabella log notifiche inviate (evita duplicati) ──────────
CREATE TABLE IF NOT EXISTS public.notification_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT        NOT NULL, -- 'upcoming_event' | 'new_market' | 'newsletter'
  ref_id      TEXT,                 -- market_id o shop_id di riferimento
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_log_user_type ON public.notification_log(user_id, type, sent_at);

-- RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- L'utente può vedere solo i propri log (solo lettura)
CREATE POLICY "notification_log_select" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Solo service_role può inserire (il cron job server-side)
CREATE POLICY "notification_log_insert" ON public.notification_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
