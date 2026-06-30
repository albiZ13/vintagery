-- quality_snapshots: abilita RLS + policy lettura pubblica
-- Scrittura: solo service_role (bypassa RLS per default — nessuna policy necessaria)
-- Lettura: pubblica (serve per dashboard admin e script GitHub Actions)

ALTER TABLE quality_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_snapshots_read_all"
  ON quality_snapshots
  FOR SELECT
  USING (true);
