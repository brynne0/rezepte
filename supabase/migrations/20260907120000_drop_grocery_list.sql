DROP POLICY IF EXISTS "Users can manage their own grocery items" ON "public"."grocery_items";

ALTER TABLE IF EXISTS "public"."grocery_items" DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS "public"."grocery_items";
