-- Friend visibility is opt-out everywhere else (a recipe is visible to
-- friends unless marked private), so images should follow the same
-- default instead of requiring a separate opt-in.

ALTER TABLE "public"."users"
  ALTER COLUMN "friends_can_view_images" SET DEFAULT true;

UPDATE "public"."users"
  SET "friends_can_view_images" = true
  WHERE "friends_can_view_images" = false;
