CREATE TABLE IF NOT EXISTS "public"."friendships" (
  "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "addressee_id" uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "status"       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted')),
  "created_at"   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_unique_pair" UNIQUE ("requester_id", "addressee_id"),
  CONSTRAINT "friendships_no_self" CHECK ("requester_id" <> "addressee_id")
);

ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they are part of
CREATE POLICY "Users can view their own friendships"
  ON "public"."friendships" FOR SELECT
  USING ("requester_id" = auth.uid() OR "addressee_id" = auth.uid());

-- Users can only send requests as themselves
CREATE POLICY "Users can send friend requests"
  ON "public"."friendships" FOR INSERT
  TO "authenticated"
  WITH CHECK ("requester_id" = auth.uid());

-- Only the addressee can accept (change status)
CREATE POLICY "Addressee can accept friend requests"
  ON "public"."friendships" FOR UPDATE
  TO "authenticated"
  USING ("addressee_id" = auth.uid());

-- Either party can cancel or remove a friendship
CREATE POLICY "Users can remove friendships"
  ON "public"."friendships" FOR DELETE
  USING ("requester_id" = auth.uid() OR "addressee_id" = auth.uid());


CREATE OR REPLACE VIEW "public"."user_profiles" AS
  SELECT "id", "username", "first_name"
  FROM "public"."users";

REVOKE ALL ON "public"."user_profiles" FROM anon;
GRANT SELECT ON "public"."user_profiles" TO authenticated;

DROP POLICY IF EXISTS "Users can view their own data when logged in" ON "public"."recipes";

CREATE POLICY "Users and friends can view recipes"
  ON "public"."recipes" FOR SELECT
  USING (
    -- own recipes
    "user_id" = auth.uid()
    -- publicly shared recipes (preserves existing share-link behaviour)
    OR "is_public" = true
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
          OR "recipes"."is_public" = true
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
