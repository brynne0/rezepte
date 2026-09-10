CREATE POLICY "Friends can view categories on shared recipes"
  ON "public"."categories" FOR SELECT
  TO "authenticated"
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."recipe_categories" "rc"
      JOIN "public"."recipes" "r" ON "r"."id" = "rc"."recipe_id"
      WHERE "rc"."categoriy_id" = "categories"."id"
        AND EXISTS (
          SELECT 1 FROM "public"."friendships"
          WHERE "status" = 'accepted'
            AND (
              ("requester_id" = auth.uid() AND "addressee_id" = "r"."user_id")
              OR
              ("addressee_id" = auth.uid() AND "requester_id" = "r"."user_id")
            )
        )
    )
  );
