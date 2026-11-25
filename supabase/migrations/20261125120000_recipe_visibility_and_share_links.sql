-- Three-level recipe visibility (private / friends / link) replacing the
-- `private` boolean, plus unlisted share links readable via a token RPC.

ALTER TABLE "public"."recipes"
  ADD COLUMN "visibility" text NOT NULL DEFAULT 'friends'
    CHECK ("visibility" IN ('private', 'friends', 'link')),
  ADD COLUMN "share_token" text UNIQUE;

UPDATE "public"."recipes" SET "visibility" = 'private' WHERE "private";

-- The SELECT policy references "private", so swap it before dropping the column
DROP POLICY IF EXISTS "Users and friends can view recipes" ON "public"."recipes";

ALTER TABLE "public"."recipes" DROP COLUMN "private";

CREATE POLICY "Users and friends can view recipes"
  ON "public"."recipes" FOR SELECT
  USING (
    "user_id" = auth.uid()
    OR (
      "visibility" <> 'private'
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

-- Owner-only visibility change; mints a share token on first switch to 'link'
-- and keeps it afterwards so re-enabling restores the same URL.
CREATE FUNCTION public.set_recipe_visibility(p_recipe_id smallint, p_visibility text)
  RETURNS text
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_token text;
  BEGIN
    IF p_visibility NOT IN ('private', 'friends', 'link') THEN
      RAISE EXCEPTION 'Invalid visibility: %', p_visibility;
    END IF;

    UPDATE recipes
      SET visibility = p_visibility,
          share_token = CASE
            WHEN p_visibility = 'link' AND share_token IS NULL
              THEN substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)
            ELSE share_token
          END
      WHERE id = p_recipe_id AND user_id = auth.uid()
      RETURNING share_token INTO v_token;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Recipe not found';
    END IF;

    RETURN v_token;
  END;
  $$;

REVOKE ALL ON FUNCTION public.set_recipe_visibility(smallint, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_recipe_visibility(smallint, text) TO authenticated;

-- Returns a link-shared recipe in the same shape as fetchRecipe's select, plus
-- the owner's public profile bits. Null when the token is unknown or the
-- recipe is no longer link-shared.
CREATE FUNCTION public.get_shared_recipe(p_token text)
  RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT (to_jsonb(r) - 'last_viewed_at') || jsonb_build_object(
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
          -- Other recipes only link through when they're link-shared too
          'linked_recipe', CASE
            WHEN lr.id IS NULL THEN NULL
            WHEN lr.visibility = 'link' THEN jsonb_build_object(
              'title', lr.title, 'slug', lr.slug, 'share_token', lr.share_token)
            ELSE jsonb_build_object('title', lr.title)
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
        'friends_can_view_images', u.friends_can_view_images
      )
    )
    FROM recipes r
    JOIN users u ON u.id = r.user_id
    WHERE r.share_token = p_token
      AND r.visibility = 'link';
  $$;

REVOKE ALL ON FUNCTION public.get_shared_recipe(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_recipe(text) TO anon, authenticated;

-- Storage predicate: images of link-shared recipes are viewable when the owner
-- lets friends see photos (link viewers follow the same setting).
CREATE FUNCTION public.recipe_image_link_viewable(p_recipe_id text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM recipes r
      JOIN users u ON u.id = r.user_id
      WHERE r.id::text = p_recipe_id
        AND r.visibility = 'link'
        AND u.friends_can_view_images
    );
  $$;

REVOKE ALL ON FUNCTION public.recipe_image_link_viewable(text) FROM public;
GRANT EXECUTE ON FUNCTION public.recipe_image_link_viewable(text) TO anon, authenticated;

CREATE POLICY "Anyone can view images of link-shared recipes"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.recipe_image_link_viewable((storage.foldername(name))[2])
  );
