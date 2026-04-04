CREATE OR REPLACE FUNCTION private.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  generated_username TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL AND NEW.raw_user_meta_data->>'username' != '' THEN
    generated_username := NEW.raw_user_meta_data->>'username';
  ELSE
    generated_username :=
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
      || '_' || substring(md5(random()::text), 1, 6);
  END IF;

  INSERT INTO public.users (id, email, first_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    generated_username
  );
  RETURN NEW;
END;
$$;
