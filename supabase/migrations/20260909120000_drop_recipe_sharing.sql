-- Recipe sharing is now a plain "copy to clipboard" action with no public
-- link, so drop the public-link infrastructure entirely.

DROP POLICY IF EXISTS "Users and friends can view recipes" ON "public"."recipes";

CREATE POLICY "Users and friends can view recipes"
  ON "public"."recipes" FOR SELECT
  USING (
    -- own recipes
    "user_id" = auth.uid()
    -- accepted friends
    OR EXISTS (
      SELECT 1 FROM "public"."friendships"
      WHERE "status" = 'accepted'
        AND (
          ("requester_id" = auth.uid() AND "addressee_id" = "recipes"."user_id")
          OR
          ("addressee_id" = auth.uid() AND "requester_id" = "recipes"."user_id")
        )
    )
  );

DROP POLICY IF EXISTS "Users can view recipe categories" ON "public"."recipe_categories";

CREATE POLICY "Users can view recipe categories"
  ON "public"."recipe_categories" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."recipes"
      WHERE "recipes"."id" = "recipe_categories"."recipe_id"
        AND (
          "recipes"."user_id" = auth.uid()
          OR EXISTS (
            SELECT 1 FROM "public"."friendships"
            WHERE "status" = 'accepted'
              AND (
                ("requester_id" = auth.uid() AND "addressee_id" = "recipes"."user_id")
                OR
                ("addressee_id" = auth.uid() AND "requester_id" = "recipes"."user_id")
              )
          )
        )
    )
  );

DROP INDEX IF EXISTS "public"."idx_recipes_share_token";

ALTER TABLE ONLY "public"."recipes"
    DROP CONSTRAINT IF EXISTS "recipes_share_token_key";

ALTER TABLE "public"."recipes"
    DROP COLUMN IF EXISTS "share_token",
    DROP COLUMN IF EXISTS "is_public",
    DROP COLUMN IF EXISTS "shared_at";
