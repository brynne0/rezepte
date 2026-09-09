-- Per-recipe "private" flag (hides a recipe from friends entirely) and a
-- per-user "friends_can_view_images" preference (friends can only see recipe
-- photos once the owner opts in).

ALTER TABLE "public"."recipes"
  ADD COLUMN "private" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."users"
  ADD COLUMN "friends_can_view_images" boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users and friends can view recipes" ON "public"."recipes";

CREATE POLICY "Users and friends can view recipes"
  ON "public"."recipes" FOR SELECT
  USING (
    "user_id" = auth.uid()
    OR (
      NOT "private"
      AND EXISTS (
        SELECT 1 FROM "public"."friendships"
        WHERE "status" = 'accepted'
          AND (
            ("requester_id" = auth.uid() AND "addressee_id" = "recipes"."user_id")
            OR
            ("addressee_id" = auth.uid() AND "requester_id" = "recipes"."user_id")
          )
      )
    )
  );

-- Extend the existing friend-profile lookup (verifies an accepted friendship
-- in SQL before returning anything) to also expose the image-visibility flag.
-- Postgres won't let CREATE OR REPLACE change a RETURNS TABLE signature, so
-- the old version has to be dropped first (which also wipes its grants —
-- reapplied below).
DROP FUNCTION IF EXISTS public.get_friend_profiles(uuid[]);

CREATE FUNCTION public.get_friend_profiles(friend_ids uuid[])
  RETURNS TABLE (id uuid, username text, first_name text, friends_can_view_images boolean)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username, u.first_name, u.friends_can_view_images
    FROM public.users u
    WHERE u.id = ANY(friend_ids)
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = auth.uid() AND f.addressee_id = u.id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = u.id))
      );
  $$;

REVOKE ALL ON FUNCTION public.get_friend_profiles(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[]) TO authenticated;

-- Boolean-returning sibling for use inside the storage.objects RLS policy
-- below, which needs a predicate rather than a row set.
CREATE FUNCTION public.friend_can_view_recipe_images(owner_id uuid)
  RETURNS boolean
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT COALESCE(u.friends_can_view_images, false)
    FROM public.users u
    WHERE u.id = owner_id
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = auth.uid() AND f.addressee_id = owner_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = owner_id))
      );
  $$;

REVOKE ALL ON FUNCTION public.friend_can_view_recipe_images(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.friend_can_view_recipe_images(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own recipe images" ON storage.objects;

CREATE POLICY "Users and friends can view recipe images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-images'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.friend_can_view_recipe_images((storage.foldername(name))[1]::uuid)
    )
  );
