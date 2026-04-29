ALTER TABLE "public"."recipes"
  ADD COLUMN IF NOT EXISTS "nutrition" JSONB;

COMMENT ON COLUMN "public"."recipes"."nutrition" IS 'Per-serving nutrition info: { calories, protein, fat, carbs, fiber, sugar, sodium }';
