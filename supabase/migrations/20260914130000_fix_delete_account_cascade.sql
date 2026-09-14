-- Deleting a user account fails with a 409 (foreign key violation) because
-- recipes and categories reference users without a cascade rule, so their
-- rows block the delete on public.users.

ALTER TABLE "public"."recipes"
    DROP CONSTRAINT "recipes_user_id_fkey",
    ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Categories are per-user owned (created_by was renamed to user_id in
-- 20260909150000_simplify_categories.sql), so delete them with the user.
ALTER TABLE "public"."categories"
    DROP CONSTRAINT "categories_created_by_fkey",
    ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- grocery_lists was dropped directly on the remote database without a migration
DROP TABLE IF EXISTS "public"."grocery_lists";
