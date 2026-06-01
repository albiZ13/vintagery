-- ============================================================
-- VINTAGERIE — Migrazione v2
-- Aggiunge: post negozi, follow, trust score, P.IVA, calendario, ads
-- Copia e incolla nell'SQL Editor di Supabase DOPO lo schema v1
-- ============================================================

-- ── Profilo utente esteso ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS trust_score  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_tier   TEXT    NOT NULL DEFAULT 'nuovo';
  -- tier: 'nuovo' | 'attivo' | 'fidato' | 'expert'

-- ── Negozio: P.IVA + stats ──────────────────────────────────
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS vat_number      TEXT,
  ADD COLUMN IF NOT EXISTS vat_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vat_status      TEXT    NOT NULL DEFAULT 'unverified',
  -- 'unverified' | 'pending' | 'verified' | 'rejected'
  ADD COLUMN IF NOT EXISTS vat_name        TEXT,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility_score DECIMAL(8,2) NOT NULL DEFAULT 0;

-- ── Mercati: poster + calendar ───────────────────────────────
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS poster_url     TEXT,
  ADD COLUMN IF NOT EXISTS event_dates    DATE[],
  -- Array di date specifiche (per mercatini con calendario annuale)
  ADD COLUMN IF NOT EXISTS organizer_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organizer_name TEXT;

-- ── Post negozi (feed Instagram) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_posts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id     UUID        REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  tags        TEXT[],
  price       DECIMAL(8,2),
  sold        BOOLEAN     NOT NULL DEFAULT FALSE,
  likes_count INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shop_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select" ON public.shop_posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.shop_posts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid())
  );
CREATE POLICY "posts_delete" ON public.shop_posts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid())
  );

-- ── Like ai post ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.shop_posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: aggiorna likes_count sul post
CREATE OR REPLACE FUNCTION public.sync_post_likes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.shop_posts
  SET likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id))
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_post_like ON public.post_likes;
CREATE TRIGGER after_post_like
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes();

-- Trigger: aggiorna posts_count sul negozio
CREATE OR REPLACE FUNCTION public.sync_shop_posts_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.shops
  SET posts_count = (SELECT COUNT(*) FROM public.shop_posts WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id))
  WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_shop_post ON public.shop_posts;
CREATE TRIGGER after_shop_post
  AFTER INSERT OR DELETE ON public.shop_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_shop_posts_count();

-- ── Follow negozi ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_follows (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_id)
);

ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select" ON public.shop_follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON public.shop_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follows_delete" ON public.shop_follows FOR DELETE USING (auth.uid() = user_id);

-- Trigger: aggiorna followers_count
CREATE OR REPLACE FUNCTION public.sync_shop_followers()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.shops
  SET followers_count = (SELECT COUNT(*) FROM public.shop_follows WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id))
  WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_follow ON public.shop_follows;
CREATE TRIGGER after_follow
  AFTER INSERT OR DELETE ON public.shop_follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_shop_followers();

-- ── Like alle recensioni (per trust score) ────────────────────
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.review_likes (
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id)  ON DELETE CASCADE,
  PRIMARY KEY (user_id, review_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_likes_select" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "review_likes_insert" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_likes_delete" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_review_likes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.reviews
  SET likes_count = (SELECT COUNT(*) FROM public.review_likes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_review_like ON public.review_likes;
CREATE TRIGGER after_review_like
  AFTER INSERT OR DELETE ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_likes();

-- ── Trust Score: funzione di ricalcolo ───────────────────────
-- Chiamata ogni volta che si aggiunge/rimuove un like a una recensione
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_reviews_written  INTEGER;
  v_review_likes     INTEGER;
  v_account_days     INTEGER;
  v_score            INTEGER;
  v_tier             TEXT;
BEGIN
  SELECT COUNT(*)     INTO v_reviews_written FROM public.reviews     WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(likes_count),0) INTO v_review_likes FROM public.reviews WHERE user_id = p_user_id;
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_days FROM public.profiles WHERE id = p_user_id;

  -- Formula: ogni recensione = 5pt, ogni like ricevuto = 10pt, ogni 30gg di anzianità = 2pt
  v_score := (v_reviews_written * 5) + (v_review_likes * 10) + ((v_account_days / 30) * 2);

  v_tier := CASE
    WHEN v_score >= 500 THEN 'expert'
    WHEN v_score >= 200 THEN 'fidato'
    WHEN v_score >=  50 THEN 'attivo'
    ELSE                     'nuovo'
  END;

  UPDATE public.profiles SET trust_score = v_score, trust_tier = v_tier WHERE id = p_user_id;
END;
$$;

-- Trigger: ricalcola trust score quando cambia likes di una recensione
CREATE OR REPLACE FUNCTION public.trigger_trust_recalc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.reviews WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  IF v_author IS NOT NULL THEN PERFORM public.recalculate_trust_score(v_author); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_review_like_trust ON public.review_likes;
CREATE TRIGGER after_review_like_trust
  AFTER INSERT OR DELETE ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_trust_recalc();

-- ── Advertisements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advertisements (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id         UUID        REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  budget_monthly  DECIMAL(10,2) NOT NULL DEFAULT 0,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at       DATE,
  ends_at         DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_select" ON public.advertisements FOR SELECT USING (true);
CREATE POLICY "ads_insert" ON public.advertisements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()));

-- ── Visibility Score: funzione di calcolo merit-based ─────────
-- Score = (avg_rating × 40) + (review_count × 0.5) + (followers × 0.2)
--         + MIN(ad_boost, 30)   ← pubblicità vale max 30 punti su 100+
-- Più alto il punteggio → più in cima nelle liste
CREATE OR REPLACE FUNCTION public.recalculate_visibility(p_shop_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_rating     DECIMAL;
  v_reviews    INTEGER;
  v_followers  INTEGER;
  v_ad_budget  DECIMAL;
  v_ad_boost   DECIMAL;
  v_score      DECIMAL;
BEGIN
  SELECT avg_rating, review_count, followers_count
  INTO   v_rating, v_reviews, v_followers
  FROM   public.shops WHERE id = p_shop_id;

  SELECT COALESCE(SUM(budget_monthly), 0)
  INTO   v_ad_budget
  FROM   public.advertisements
  WHERE  shop_id = p_shop_id AND active = TRUE;

  -- Ad boost: 10pt ogni 50€/mese, capped a 30pt
  v_ad_boost := LEAST((v_ad_budget / 50.0) * 10, 30);

  v_score := (COALESCE(v_rating,0) * 40)
           + (COALESCE(v_reviews,0) * 0.5)
           + (COALESCE(v_followers,0) * 0.2)
           + v_ad_boost;

  UPDATE public.shops SET visibility_score = v_score WHERE id = p_shop_id;
END;
$$;

-- Trigger: ricalcola visibility dopo ogni recensione
CREATE OR REPLACE FUNCTION public.trigger_visibility_recalc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (COALESCE(NEW.target_type, OLD.target_type)) = 'shop' THEN
    PERFORM public.recalculate_visibility(COALESCE(NEW.target_id, OLD.target_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_review_visibility ON public.reviews;
CREATE TRIGGER after_review_visibility
  AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_visibility_recalc();
