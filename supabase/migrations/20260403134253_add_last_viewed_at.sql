ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;

-- Backfill with updated_at so existing recipes have a sensible initial order
UPDATE recipes SET last_viewed_at = updated_at WHERE updated_at IS NOT NULL;
UPDATE recipes SET last_viewed_at = created_at WHERE last_viewed_at IS NULL;
