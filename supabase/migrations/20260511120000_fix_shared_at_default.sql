-- shared_at should only be set when a public share link is created.
-- Remove the DEFAULT now() that was marking every new recipe on insert.
ALTER TABLE "public"."recipes" ALTER COLUMN "shared_at" SET DEFAULT NULL;

-- Clear shared_at on existing recipes that were never actually shared publicly.
UPDATE "public"."recipes"
SET "shared_at" = NULL
WHERE "is_public" = false OR "share_token" IS NULL;
