-- Tracks which recipe a copy was made from ("Add to My Recipes"), so the
-- friend's recipe page can show "already saved". SET NULL on delete since
-- the copy is an independent snapshot that should survive the original.
--
-- copied_from_name snapshots the friend's first name at copy time (rather
-- than joining through copied_from_recipe_id), so the "Copied from <name>"
-- banner keeps working even if the friend later deletes/hides the original.

ALTER TABLE "public"."recipes"
  ADD COLUMN "copied_from_recipe_id" smallint
    REFERENCES "public"."recipes"("id") ON DELETE SET NULL,
  ADD COLUMN "copied_from_name" text;

CREATE INDEX "recipes_copied_from_recipe_id_idx"
  ON "public"."recipes" ("copied_from_recipe_id");
