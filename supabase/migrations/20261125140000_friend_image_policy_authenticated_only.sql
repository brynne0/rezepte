-- The friends image policy applied to all roles, but its helper isn't
-- executable by anon, so every signed-out read (link-shared images) failed
-- with "permission denied". Limit it to signed-in users.

DROP POLICY IF EXISTS "Users and friends can view recipe images" ON storage.objects;

CREATE POLICY "Users and friends can view recipe images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.friend_can_view_recipe_images((storage.foldername(name))[1]::uuid)
    )
  );
