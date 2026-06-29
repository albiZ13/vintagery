-- ============================================================
-- SECURITY + PERFORMANCE: 2026-06-12
-- ============================================================

-- ============================================================
-- 1. FIX auth_rls_initplan (46 policies)
--    Replace auth.uid() with (select auth.uid()) so Postgres
--    evaluates it once per query, not once per row.
-- ============================================================

-- profiles
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- shops
DROP POLICY IF EXISTS shops_insert ON shops;
DROP POLICY IF EXISTS shops_update ON shops;
DROP POLICY IF EXISTS shops_delete ON shops;
CREATE POLICY shops_insert ON shops FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY shops_update ON shops FOR UPDATE
  USING ((select auth.uid()) = owner_id);
CREATE POLICY shops_delete ON shops FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- reviews
DROP POLICY IF EXISTS reviews_insert ON reviews;
DROP POLICY IF EXISTS reviews_delete ON reviews;
CREATE POLICY reviews_insert ON reviews FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY reviews_delete ON reviews FOR DELETE
  USING ((select auth.uid()) = user_id);

-- advertisements
DROP POLICY IF EXISTS ads_insert ON advertisements;
CREATE POLICY ads_insert ON advertisements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = advertisements.shop_id
      AND shops.owner_id = (select auth.uid())
  ));

-- shop_posts
DROP POLICY IF EXISTS shop_posts_insert ON shop_posts;
DROP POLICY IF EXISTS shop_posts_delete ON shop_posts;
CREATE POLICY shop_posts_insert ON shop_posts FOR INSERT
  WITH CHECK ((select auth.uid()) IN (
    SELECT shops.owner_id FROM shops WHERE shops.id = shop_posts.shop_id
  ));
CREATE POLICY shop_posts_delete ON shop_posts FOR DELETE
  USING ((select auth.uid()) IN (
    SELECT shops.owner_id FROM shops WHERE shops.id = shop_posts.shop_id
  ));

-- post_likes
DROP POLICY IF EXISTS post_likes_insert ON post_likes;
DROP POLICY IF EXISTS post_likes_delete ON post_likes;
CREATE POLICY post_likes_insert ON post_likes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY post_likes_delete ON post_likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- user_follows
DROP POLICY IF EXISTS user_follows_insert ON user_follows;
DROP POLICY IF EXISTS user_follows_delete ON user_follows;
CREATE POLICY user_follows_insert ON user_follows FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_id);
CREATE POLICY user_follows_delete ON user_follows FOR DELETE
  USING ((select auth.uid()) = follower_id);

-- purchases
DROP POLICY IF EXISTS purchases_insert ON purchases;
DROP POLICY IF EXISTS purchases_delete ON purchases;
CREATE POLICY purchases_insert ON purchases FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY purchases_delete ON purchases FOR DELETE
  USING ((select auth.uid()) = user_id);

-- user_favorites
DROP POLICY IF EXISTS user_favorites_insert ON user_favorites;
DROP POLICY IF EXISTS user_favorites_delete ON user_favorites;
DROP POLICY IF EXISTS user_favorites_select ON user_favorites;
CREATE POLICY user_favorites_select ON user_favorites FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY user_favorites_insert ON user_favorites FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY user_favorites_delete ON user_favorites FOR DELETE
  USING ((select auth.uid()) = user_id);

-- shop_follows
DROP POLICY IF EXISTS shop_follows_insert ON shop_follows;
DROP POLICY IF EXISTS shop_follows_delete ON shop_follows;
CREATE POLICY shop_follows_insert ON shop_follows FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY shop_follows_delete ON shop_follows FOR DELETE
  USING ((select auth.uid()) = user_id);

-- review_likes
DROP POLICY IF EXISTS review_likes_insert ON review_likes;
DROP POLICY IF EXISTS review_likes_delete ON review_likes;
CREATE POLICY review_likes_insert ON review_likes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY review_likes_delete ON review_likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- purchase_likes
DROP POLICY IF EXISTS purchase_likes_insert ON purchase_likes;
DROP POLICY IF EXISTS purchase_likes_delete ON purchase_likes;
CREATE POLICY purchase_likes_insert ON purchase_likes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY purchase_likes_delete ON purchase_likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- market_events (admin-only write)
DROP POLICY IF EXISTS market_events_insert ON market_events;
DROP POLICY IF EXISTS market_events_update ON market_events;
DROP POLICY IF EXISTS market_events_delete ON market_events;
CREATE POLICY market_events_insert ON market_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));
CREATE POLICY market_events_update ON market_events FOR UPDATE
  USING (auth.role() = 'service_role');
CREATE POLICY market_events_delete ON market_events FOR DELETE
  USING (auth.role() = 'service_role');

-- newsletter_log
DROP POLICY IF EXISTS "newsletter_log_select" ON newsletter_log;
CREATE POLICY newsletter_log_select ON newsletter_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

-- notification_log
DROP POLICY IF EXISTS "Users read own logs" ON notification_log;
CREATE POLICY notification_log_own ON notification_log FOR SELECT
  USING ((select auth.uid()) = user_id);

-- notifications
DROP POLICY IF EXISTS notif_own ON notifications;
CREATE POLICY notif_own ON notifications FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- markets (admin-only write)
DROP POLICY IF EXISTS markets_insert ON markets;
DROP POLICY IF EXISTS markets_update ON markets;
DROP POLICY IF EXISTS markets_delete ON markets;
CREATE POLICY markets_insert ON markets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));
CREATE POLICY markets_update ON markets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));
CREATE POLICY markets_delete ON markets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

-- push_subscriptions
DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;
CREATE POLICY push_subscriptions_own ON push_subscriptions FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- messages
DROP POLICY IF EXISTS msg_insert ON messages;
DROP POLICY IF EXISTS msg_read ON messages;
DROP POLICY IF EXISTS msg_update ON messages;
CREATE POLICY msg_insert ON messages FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));
CREATE POLICY msg_read ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = (select auth.uid())
       OR shop_id IN (SELECT id FROM shops WHERE owner_id = (select auth.uid()))
  ));
CREATE POLICY msg_update ON messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

-- market_proposals
DROP POLICY IF EXISTS shops_insert_own_proposals ON market_proposals;
DROP POLICY IF EXISTS shops_read_own_proposals ON market_proposals;
CREATE POLICY market_proposals_insert ON market_proposals FOR INSERT
  WITH CHECK (
    shop_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = market_proposals.shop_id
        AND shops.owner_id = (select auth.uid())
    )
  );
CREATE POLICY market_proposals_select ON market_proposals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = market_proposals.shop_id
      AND shops.owner_id = (select auth.uid())
  ));

-- user_posts
DROP POLICY IF EXISTS "Insert proprio post" ON user_posts;
DROP POLICY IF EXISTS "Delete proprio post" ON user_posts;
CREATE POLICY user_posts_insert ON user_posts FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY user_posts_delete ON user_posts FOR DELETE
  USING ((select auth.uid()) = user_id);

-- shop_market_participations
DROP POLICY IF EXISTS owner_insert_smp ON shop_market_participations;
DROP POLICY IF EXISTS owner_delete_smp ON shop_market_participations;
CREATE POLICY smp_insert ON shop_market_participations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_market_participations.shop_id
      AND shops.owner_id = (select auth.uid())
  ));
CREATE POLICY smp_delete ON shop_market_participations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_market_participations.shop_id
      AND shops.owner_id = (select auth.uid())
  ));

-- ============================================================
-- 2. FIX multiple_permissive_policies on conversations
--    Merge conv_user + conv_shop into one policy
-- ============================================================
DROP POLICY IF EXISTS conv_user ON conversations;
DROP POLICY IF EXISTS conv_shop ON conversations;
CREATE POLICY conv_member ON conversations FOR ALL
  USING (
    user_id = (select auth.uid())
    OR shop_id IN (SELECT id FROM shops WHERE owner_id = (select auth.uid()))
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR shop_id IN (SELECT id FROM shops WHERE owner_id = (select auth.uid()))
  );

-- ============================================================
-- 3. FIX rls_policy_always_true on region_subscriptions
--    Add minimal email validation
-- ============================================================
DROP POLICY IF EXISTS public_can_subscribe ON region_subscriptions;
CREATE POLICY region_subscriptions_insert ON region_subscriptions FOR INSERT
  WITH CHECK (email IS NOT NULL AND email LIKE '%@%');

-- ============================================================
-- 4. FIX function_search_path_mutable
-- ============================================================
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.prevent_admin_self_promotion() SET search_path = 'public';
ALTER FUNCTION public.sync_review_likes() SET search_path = 'public';
ALTER FUNCTION public.recalculate_trust_score(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.trigger_trust_recalc() SET search_path = 'public';
ALTER FUNCTION public.recalculate_visibility(p_shop_id uuid) SET search_path = 'public';
ALTER FUNCTION public.trigger_visibility_recalc() SET search_path = 'public';

-- ============================================================
-- 5. REVOKE EXECUTE on SECURITY DEFINER trigger functions
--    from unprivileged roles (they are called by triggers, not directly)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_self_promotion() FROM anon, authenticated;

-- ============================================================
-- 6. ADD missing FK indexes (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_advertisements_shop_id
  ON advertisements (shop_id);

CREATE INDEX IF NOT EXISTS idx_market_proposals_shop_id
  ON market_proposals (shop_id);

CREATE INDEX IF NOT EXISTS idx_market_proposals_user_id
  ON market_proposals (user_id);

CREATE INDEX IF NOT EXISTS idx_markets_organizer_id
  ON markets (organizer_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_log_user_id
  ON newsletter_log (user_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id
  ON post_likes (post_id);

CREATE INDEX IF NOT EXISTS idx_purchase_likes_purchase_id
  ON purchase_likes (purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchases_market_id
  ON purchases (market_id);

CREATE INDEX IF NOT EXISTS idx_purchases_shop_id
  ON purchases (shop_id);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id
  ON purchases (user_id);

CREATE INDEX IF NOT EXISTS idx_review_likes_review_id
  ON review_likes (review_id);

CREATE INDEX IF NOT EXISTS idx_shop_follows_shop_id
  ON shop_follows (shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_posts_shop_id
  ON shop_posts (shop_id);

CREATE INDEX IF NOT EXISTS idx_shops_owner_id
  ON shops (owner_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following_id
  ON user_follows (following_id);

-- ============================================================
-- 7. DROP duplicate unique constraint on profiles.username
--    profiles_username_idx already enforces the same uniqueness
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- ============================================================
-- 8. ADDITIONAL: remaining function search_path fixes
-- ============================================================
ALTER FUNCTION public.sync_user_follows() SET search_path = 'public';
ALTER FUNCTION public.refresh_ratings() SET search_path = 'public';
ALTER FUNCTION public.sync_post_likes() SET search_path = 'public';
ALTER FUNCTION public.sync_shop_posts_count() SET search_path = 'public';
ALTER FUNCTION public.sync_shop_followers() SET search_path = 'public';

-- ============================================================
-- 9. FIX remaining auth_rls_initplan (auth.role() per row)
-- ============================================================
DROP POLICY IF EXISTS market_events_update ON market_events;
DROP POLICY IF EXISTS market_events_delete ON market_events;
CREATE POLICY market_events_update ON market_events FOR UPDATE
  USING ((select auth.role()) = 'service_role');
CREATE POLICY market_events_delete ON market_events FOR DELETE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
