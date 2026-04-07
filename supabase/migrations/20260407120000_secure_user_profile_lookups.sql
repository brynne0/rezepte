-- Replaces the user_profiles view with SECURITY DEFINER functions.
-- Search and routing return (id, username) only.
-- first_name is gated behind get_friend_profiles, which verifies
-- an accepted friendship in SQL before returning it.

DROP VIEW IF EXISTS "public"."user_profiles";


-- Username search: 3-char minimum enforced in SQL, not just the frontend.
CREATE OR REPLACE FUNCTION public.search_users_by_username(query text)
  RETURNS TABLE (id uuid, username text)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username
    FROM public.users u
    WHERE length(trim(query)) >= 3
      AND u.username ILIKE '%' || trim(query) || '%'
      AND u.id <> auth.uid()
    LIMIT 10;
  $$;

REVOKE ALL ON FUNCTION public.search_users_by_username(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_users_by_username(text) TO authenticated;


-- Exact username lookup for /friends/:username routing.
CREATE OR REPLACE FUNCTION public.get_user_by_username(uname text)
  RETURNS TABLE (id uuid, username text)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username
    FROM public.users u
    WHERE u.username = uname
    LIMIT 1;
  $$;

REVOKE ALL ON FUNCTION public.get_user_by_username(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_by_username(text) TO authenticated;


-- Profile lookup by known IDs (pending request senders).
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(user_ids uuid[])
  RETURNS TABLE (id uuid, username text)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username
    FROM public.users u
    WHERE u.id = ANY(user_ids);
  $$;

REVOKE ALL ON FUNCTION public.get_profiles_by_ids(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid[]) TO authenticated;


-- Returns first_name only for confirmed friends — checked in SQL.
CREATE OR REPLACE FUNCTION public.get_friend_profiles(friend_ids uuid[])
  RETURNS TABLE (id uuid, username text, first_name text)
  LANGUAGE sql SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT u.id, u.username, u.first_name
    FROM public.users u
    WHERE u.id = ANY(friend_ids)
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = u.id)
            OR
            (f.addressee_id = auth.uid() AND f.requester_id = u.id)
          )
      );
  $$;

REVOKE ALL ON FUNCTION public.get_friend_profiles(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[]) TO authenticated;
