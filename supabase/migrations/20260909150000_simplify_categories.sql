-- Categories become per-user rows instead of a global "system" row shared
-- by everyone plus a separate user_category_preferences table for
-- visibility/ordering. Defaults are now renameable/deletable like any
-- other category, and hidden categories no longer exist.
--
-- One-way: drops user_category_preferences and the shared system rows.
-- Back up the DB before applying to production.

-- Per-user ordering now lives directly on categories.
ALTER TABLE "public"."categories"
  ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0;

-- This is now the sole ownership column, not just creation metadata.
ALTER TABLE "public"."categories"
  RENAME COLUMN "created_by" TO "user_id";

-- Names are unique per owner now, not globally. Do this before the
-- backfill below, since multiple users are about to get their own copy of
-- the same default category names.
ALTER TABLE "public"."categories"
  DROP CONSTRAINT IF EXISTS "categories_name_key";
ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_user_id_name_key" UNIQUE ("user_id", "name");

-- Map each user to a copy of every system category they should keep: one
-- they haven't hidden, or one already tagging a recipe of theirs (hiding
-- never untagged it, so it still needs a new home).
CREATE TEMP TABLE "category_migration_map" (
  "user_id" "uuid" NOT NULL,
  "old_category_id" "uuid" NOT NULL,
  "new_category_id" "uuid" NOT NULL
);

INSERT INTO "category_migration_map" ("user_id", "old_category_id", "new_category_id")
SELECT "u"."id", "c"."id", "gen_random_uuid"()
FROM "auth"."users" "u"
CROSS JOIN "public"."categories" "c"
WHERE "c"."is_system" = true
  AND (
    NOT EXISTS (
      SELECT 1 FROM "public"."user_category_preferences" "p"
      WHERE "p"."user_id" = "u"."id"
        AND "p"."category_id" = "c"."id"
        AND "p"."is_visible" = false
    )
    OR EXISTS (
      SELECT 1 FROM "public"."recipe_categories" "rc"
      JOIN "public"."recipes" "r" ON "r"."id" = "rc"."recipe_id"
      WHERE "r"."user_id" = "u"."id" AND "rc"."categoriy_id" = "c"."id"
    )
  );

-- Some legacy categories belong to no one. New RLS below is owner-only, so
-- give each user who tagged a recipe with one of these a personal copy
-- too, or those tags would silently disappear.
INSERT INTO "category_migration_map" ("user_id", "old_category_id", "new_category_id")
SELECT "pairs"."user_id", "pairs"."category_id", "gen_random_uuid"()
FROM (
  SELECT DISTINCT "r"."user_id", "c"."id" AS "category_id"
  FROM "public"."categories" "c"
  JOIN "public"."recipe_categories" "rc" ON "rc"."categoriy_id" = "c"."id"
  JOIN "public"."recipes" "r" ON "r"."id" = "rc"."recipe_id"
  WHERE "c"."user_id" IS NULL AND "c"."is_system" = false
) AS "pairs";

-- Create each copy, carrying over the user's saved order.
INSERT INTO "public"."categories" ("id", "name", "user_id", "translated_category", "display_order")
SELECT
  "m"."new_category_id",
  "c"."name",
  "m"."user_id",
  "c"."translated_category",
  COALESCE(
    "p"."display_order",
    (ROW_NUMBER() OVER (PARTITION BY "m"."user_id" ORDER BY "c"."name") - 1)
  )
FROM "category_migration_map" "m"
JOIN "public"."categories" "c" ON "c"."id" = "m"."old_category_id"
LEFT JOIN "public"."user_category_preferences" "p"
  ON "p"."user_id" = "m"."user_id" AND "p"."category_id" = "m"."old_category_id";

-- Repoint recipe tags from the old shared row to the new copy.
UPDATE "public"."recipe_categories" AS "rc"
SET "categoriy_id" = "m"."new_category_id"
FROM "category_migration_map" "m", "public"."recipes" "r"
WHERE "r"."id" = "rc"."recipe_id"
  AND "r"."user_id" = "m"."user_id"
  AND "rc"."categoriy_id" = "m"."old_category_id";

-- Carry over ordering for existing custom (non-system) categories.
UPDATE "public"."categories" "c"
SET "display_order" = "p"."display_order"
FROM "public"."user_category_preferences" "p"
WHERE "p"."category_id" = "c"."id"
  AND "p"."user_id" = "c"."user_id"
  AND "c"."is_system" = false;

-- The original shared/orphaned rows are unreferenced now; remove them.
DELETE FROM "public"."categories" WHERE "is_system" = true OR "user_id" IS NULL;

DROP TABLE "category_migration_map";
DROP TABLE IF EXISTS "public"."user_category_preferences";

-- Deleting a category should clean up its recipe tags.
ALTER TABLE "public"."recipe_categories"
  DROP CONSTRAINT IF EXISTS "recipe_categories_categoriy_id_fkey";
ALTER TABLE "public"."recipe_categories"
  ADD CONSTRAINT "recipe_categories_categoriy_id_fkey"
  FOREIGN KEY ("categoriy_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;

-- Drop the old global-visibility policies first, since they reference
-- is_system.
DROP POLICY IF EXISTS "Anyone can view system categories" ON "public"."categories";
DROP POLICY IF EXISTS "Users can view all categories" ON "public"."categories";
DROP POLICY IF EXISTS "Users can create own categories" ON "public"."categories";
DROP POLICY IF EXISTS "Users can update own categories" ON "public"."categories";

-- Every category is user-owned now, so the system flag is gone.
ALTER TABLE "public"."categories" DROP COLUMN IF EXISTS "is_system";

-- Replace with owner-only CRUD.
CREATE POLICY "Users can view own categories"
  ON "public"."categories" FOR SELECT TO "authenticated"
  USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can create own categories"
  ON "public"."categories" FOR INSERT TO "authenticated"
  WITH CHECK ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update own categories"
  ON "public"."categories" FOR UPDATE TO "authenticated"
  USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can delete own categories"
  ON "public"."categories" FOR DELETE TO "authenticated"
  USING ("auth"."uid"() = "user_id");

-- Seed default categories at signup, instead of lazily on first read.
CREATE OR REPLACE FUNCTION "public"."create_default_categories_for_user"("p_user_id" "uuid")
  RETURNS "void"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  SET "search_path" TO ''
  AS $$
BEGIN
  INSERT INTO "public"."categories" ("name", "user_id", "translated_category", "display_order")
  VALUES
    ('breakfast', "p_user_id", '{"en": "Breakfast", "de": "Frühstück"}'::jsonb,     0),
    ('mains',     "p_user_id", '{"en": "Mains",     "de": "Hauptspeisen"}'::jsonb,  1),
    ('salads',    "p_user_id", '{"en": "Salads",    "de": "Salate"}'::jsonb,        2),
    ('soups',     "p_user_id", '{"en": "Soups",     "de": "Suppen"}'::jsonb,        3),
    ('baking',    "p_user_id", '{"en": "Baking",    "de": "Backen"}'::jsonb,        4),
    ('desserts',  "p_user_id", '{"en": "Desserts",  "de": "Nachtisch"}'::jsonb,     5),
    ('drinks',    "p_user_id", '{"en": "Drinks",    "de": "Getränke"}'::jsonb,      6),
    ('sauces',    "p_user_id", '{"en": "Sauces",    "de": "Soßen"}'::jsonb,         7),
    ('snacks',    "p_user_id", '{"en": "Snacks",    "de": "Snacks"}'::jsonb,        8),
    ('staples',   "p_user_id", '{"en": "Staples",   "de": "Grundrezepte"}'::jsonb,  9)
  ON CONFLICT ("user_id", "name") DO NOTHING;
END;
$$;

ALTER FUNCTION "public"."create_default_categories_for_user"("uuid") OWNER TO "postgres";

-- The signup trigger actually runs private.handle_new_user, not
-- public.handle_new_user. Re-declared here unchanged, plus the new
-- category-seeding call.
CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO ''
  AS $$
DECLARE
  generated_username TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL AND NEW.raw_user_meta_data->>'username' != '' THEN
    generated_username := NEW.raw_user_meta_data->>'username';
  ELSE
    generated_username :=
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
      || '_' || substring(md5(random()::text), 1, 6);
  END IF;

  INSERT INTO public.users (id, email, first_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    generated_username
  );

  PERFORM public.create_default_categories_for_user(NEW.id);

  RETURN NEW;
END;
$$;
