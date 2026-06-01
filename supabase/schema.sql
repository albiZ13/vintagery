-- ============================================================
-- VINTAGERIE — Schema Supabase
-- Copia e incolla nell'editor SQL di Supabase
-- ============================================================

-- Profili utente (estende auth.users di Supabase)
CREATE TABLE public.profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT        UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT        NOT NULL DEFAULT 'user', -- 'user' | 'shop_owner' | 'admin'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crea profilo automaticamente alla registrazione
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MERCATINI
-- ============================================================
CREATE TABLE public.markets (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  description    TEXT,
  address        TEXT,
  city           TEXT        NOT NULL,
  region         TEXT        NOT NULL,
  lat            DECIMAL(9,6),
  lng            DECIMAL(9,6),
  website        TEXT,
  instagram      TEXT,
  phone          TEXT,
  email          TEXT,
  frequency      TEXT,       -- 'settimanale' | 'mensile' | 'occasionale' | 'annuale'
  next_date      DATE,
  schedule_notes TEXT,       -- es. "Ogni prima domenica del mese"
  categories     TEXT[],     -- ['abbigliamento','vinili','libri','mobili','gioielli']
  image_url      TEXT,
  avg_rating     DECIMAL(3,2) DEFAULT 0,
  review_count   INTEGER      DEFAULT 0,
  is_verified    BOOLEAN      DEFAULT FALSE,
  is_featured    BOOLEAN      DEFAULT FALSE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- NEGOZI
-- ============================================================
CREATE TABLE public.shops (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  name           TEXT        NOT NULL,
  description    TEXT,
  address        TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  region         TEXT        NOT NULL,
  lat            DECIMAL(9,6),
  lng            DECIMAL(9,6),
  website        TEXT,
  instagram      TEXT,
  phone          TEXT,
  email          TEXT,
  categories     TEXT[],
  image_url      TEXT,
  opening_hours  JSONB,      -- {"mon":"10:00-19:00", "tue":"10:00-19:00", ...}
  avg_rating     DECIMAL(3,2) DEFAULT 0,
  review_count   INTEGER      DEFAULT 0,
  is_verified    BOOLEAN      DEFAULT FALSE,
  is_featured    BOOLEAN      DEFAULT FALSE,
  plan           TEXT         DEFAULT 'free', -- 'free' | 'premium'
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- RECENSIONI (mercatini e negozi)
-- ============================================================
CREATE TABLE public.reviews (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_type  TEXT        NOT NULL CHECK (target_type IN ('market','shop')),
  target_id    UUID        NOT NULL,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- Aggiorna avg_rating e review_count dopo ogni inserimento/cancellazione
CREATE OR REPLACE FUNCTION public.refresh_ratings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  avg_r  DECIMAL(3,2);
  cnt    INTEGER;
BEGIN
  SELECT AVG(rating)::DECIMAL(3,2), COUNT(*)
  INTO avg_r, cnt
  FROM public.reviews
  WHERE target_type = COALESCE(NEW.target_type, OLD.target_type)
    AND target_id   = COALESCE(NEW.target_id,   OLD.target_id);

  IF COALESCE(NEW.target_type, OLD.target_type) = 'market' THEN
    UPDATE public.markets SET avg_rating = avg_r, review_count = cnt
    WHERE id = COALESCE(NEW.target_id, OLD.target_id);
  ELSE
    UPDATE public.shops SET avg_rating = avg_r, review_count = cnt
    WHERE id = COALESCE(NEW.target_id, OLD.target_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_review_change
  AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_ratings();

-- ============================================================
-- ACQUISTI CONDIVISI
-- ============================================================
CREATE TABLE public.purchases (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shop_id     UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  market_id   UUID        REFERENCES public.markets(id) ON DELETE SET NULL,
  image_url   TEXT,
  description TEXT,
  price       DECIMAL(8,2),
  category    TEXT,
  likes_count INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.purchase_likes (
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, purchase_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_likes ENABLE ROW LEVEL SECURITY;

-- Profiles: chiunque può leggere, solo il proprietario può modificare
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Markets: tutti leggono, solo admin inserisce/modifica
CREATE POLICY "markets_select" ON public.markets FOR SELECT USING (true);
CREATE POLICY "markets_insert" ON public.markets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Shops: tutti leggono, solo owner modifica il proprio
CREATE POLICY "shops_select" ON public.shops FOR SELECT USING (true);
CREATE POLICY "shops_insert" ON public.shops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "shops_update" ON public.shops FOR UPDATE USING (auth.uid() = owner_id);

-- Reviews: tutti leggono, utenti autenticati inseriscono le proprie
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Purchases: tutti leggono, utenti autenticati inseriscono le proprie
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchases_delete" ON public.purchases FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "likes_select" ON public.purchase_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.purchase_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.purchase_likes FOR DELETE USING (auth.uid() = user_id);
