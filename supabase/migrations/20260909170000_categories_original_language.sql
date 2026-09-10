-- Categories now store their name as typed, in whatever language they were
-- created in (proper casing preserved), tracked via a new original_language
-- column. translated_category holds only the OTHER language's translation
-- - never the original's own text, which previously let a silently-failed
-- translation write a false duplicate (e.g. "fermentation" ending up as
-- {"en": "Fermentation", "de": "Fermentation"}).
--
-- Legacy rows are NOT backfilled/repaired here - existing rows just get
-- original_language defaulted to 'en' as a placeholder; bad historical data
-- (like the fermentation example) needs manual review via the SQL editor.

ALTER TABLE "public"."categories"
  ADD COLUMN "original_language" text NOT NULL DEFAULT 'en';

-- name now preserves original casing, so matching/uniqueness must be
-- case-insensitive to still prevent "Fermentation" and "fermentation"
-- coexisting for the same user.
ALTER TABLE "public"."categories"
  DROP CONSTRAINT IF EXISTS "categories_user_id_name_key";
CREATE UNIQUE INDEX "categories_user_id_name_lower_idx"
  ON "public"."categories" ("user_id", lower("name"));

-- Seed defaults in whichever language the signup actually happened in,
-- instead of always assuming English.
CREATE OR REPLACE FUNCTION "public"."create_default_categories_for_user"(
  "p_user_id" "uuid",
  "p_language" "text" DEFAULT 'en'
)
  RETURNS "void"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  SET "search_path" TO ''
  AS $$
BEGIN
  INSERT INTO "public"."categories" ("name", "user_id", "original_language", "translated_category", "display_order")
  SELECT
    CASE WHEN "p_language" = 'de' THEN "de_name" ELSE "en_name" END,
    "p_user_id",
    CASE WHEN "p_language" = 'de' THEN 'de' ELSE 'en' END,
    CASE WHEN "p_language" = 'de' THEN jsonb_build_object('en', "en_name")
         ELSE jsonb_build_object('de', "de_name") END,
    "ord"
  FROM (VALUES
    ('Breakfast', 'Frühstück',    0),
    ('Mains',     'Hauptspeisen', 1),
    ('Salads',    'Salate',       2),
    ('Soups',     'Suppen',       3),
    ('Baking',    'Backen',       4),
    ('Desserts',  'Nachtisch',    5),
    ('Drinks',    'Getränke',     6),
    ('Sauces',    'Soßen',        7),
    ('Snacks',    'Snacks',       8),
    ('Staples',   'Grundrezepte', 9)
  ) AS "defaults"("en_name", "de_name", "ord")
  ON CONFLICT ("user_id", lower("name")) DO NOTHING;
END;
$$;

ALTER FUNCTION "public"."create_default_categories_for_user"("uuid", "text") OWNER TO "postgres";

-- Capture the signup language to seed defaults correctly and to set
-- preferred_language (which previously always defaulted to 'en').
CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO ''
  AS $$
DECLARE
  generated_username TEXT;
  signup_language TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL AND NEW.raw_user_meta_data->>'username' != '' THEN
    generated_username := NEW.raw_user_meta_data->>'username';
  ELSE
    generated_username :=
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
      || '_' || substring(md5(random()::text), 1, 6);
  END IF;

  signup_language := CASE
    WHEN NEW.raw_user_meta_data->>'language' = 'de' THEN 'de'
    ELSE 'en'
  END;

  INSERT INTO public.users (id, email, first_name, username, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    generated_username,
    signup_language
  );

  PERFORM public.create_default_categories_for_user(NEW.id, signup_language);

  RETURN NEW;
END;
$$;
