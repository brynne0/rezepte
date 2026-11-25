-- Three-level photo_visibility replaces friends_can_view_images

ALTER TABLE "public"."users"
  ADD COLUMN "photo_visibility" text NOT NULL DEFAULT 'link'
    CHECK ("photo_visibility" IN ('private', 'friends', 'link'));

UPDATE "public"."users" SET "photo_visibility" = 'private'
  WHERE NOT "friends_can_view_images";

-- Friend check now takes the recipe folder too, so private recipes' photos stay hidden
DROP POLICY IF EXISTS "Users and friends can view recipe images" ON storage.objects;
DROP FUNCTION IF EXISTS public.friend_can_view_recipe_images(uuid);

CREATE FUNCTION public.friend_can_view_recipe_images(p_owner_id text, p_recipe_id text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM recipes r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = CASE WHEN p_recipe_id ~ '^\d{1,5}$' THEN p_recipe_id::int END
        AND r.user_id::text = p_owner_id
        AND r.visibility <> 'private'
        AND u.photo_visibility <> 'private'
        AND EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = auth.uid() AND f.addressee_id = r.user_id)
              OR (f.addressee_id = auth.uid() AND f.requester_id = r.user_id))
        )
    );
  $$;

REVOKE ALL ON FUNCTION public.friend_can_view_recipe_images(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.friend_can_view_recipe_images(text, text) TO authenticated;

CREATE POLICY "Users and friends can view recipe images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.friend_can_view_recipe_images(
        (storage.foldername(name))[1], (storage.foldername(name))[2])
    )
  );

CREATE OR REPLACE FUNCTION public.recipe_image_link_viewable(p_owner_id text, p_recipe_id text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM recipes r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = CASE WHEN p_recipe_id ~ '^\d{1,5}$' THEN p_recipe_id::int END
        AND r.user_id::text = p_owner_id
        AND r.visibility = 'link'
        AND u.photo_visibility = 'link'
    );
  $$;

-- Return type changes, so drop and recreate
DROP FUNCTION IF EXISTS public.get_friend_profiles(uuid[]);

CREATE FUNCTION public.get_friend_profiles(friend_ids uuid[])
  RETURNS TABLE (id uuid, username text, first_name text, photo_visibility text)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username, u.first_name, u.photo_visibility
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

CREATE OR REPLACE FUNCTION public.get_shared_recipe(p_token text)
  RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT jsonb_build_object(
      'id', r.id,
      'user_id', r.user_id,
      'title', r.title,
      'slug', r.slug,
      'servings', r.servings,
      'instructions', r.instructions,
      'source', r.source,
      'notes', r.notes,
      'nutrition', r.nutrition,
      'original_language', r.original_language,
      'translated_recipe', r.translated_recipe,
      'created_at', r.created_at,
      'visibility', r.visibility,
      'images', CASE WHEN u.photo_visibility = 'link' THEN r.images
                     ELSE '[]'::jsonb END,
      'recipe_ingredients', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ri.id,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'notes', ri.notes,
          'subheading', ri.subheading,
          'order_index', ri.order_index,
          'is_plural', ri.is_plural,
          'name_overrides', ri.name_overrides,
          'linked_recipe_id', CASE WHEN lr.visibility = 'link' THEN lr.id END,
          'ingredients', jsonb_build_object(
            'id', i.id,
            'singular_name', i.singular_name,
            'plural_name', i.plural_name,
            'translated_names', i.translated_names
          ),
          'linked_recipe', CASE WHEN lr.visibility = 'link' THEN jsonb_build_object(
            'title', lr.title, 'slug', lr.slug, 'share_token', lr.share_token)
          END
        ))
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        LEFT JOIN recipes lr ON lr.id = ri.linked_recipe_id
        WHERE ri.recipe_id = r.id
      ), '[]'::jsonb),
      'recipe_categories', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'categoriy_id', rc.categoriy_id,
          'categories', jsonb_build_object(
            'name', c.name, 'translated_category', c.translated_category)
        ))
        FROM recipe_categories rc
        JOIN categories c ON c.id = rc.categoriy_id
        WHERE rc.recipe_id = r.id
      ), '[]'::jsonb),
      'owner', jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'first_name', u.first_name,
        'photo_visibility', u.photo_visibility
      )
    )
    FROM recipes r
    JOIN users u ON u.id = r.user_id
    WHERE r.share_token = p_token
      AND r.visibility = 'link';
  $$;

ALTER TABLE "public"."users" DROP COLUMN "friends_can_view_images";
