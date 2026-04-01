-- Create private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate trigger functions in private schema
CREATE OR REPLACE FUNCTION private.delete_auth_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  AS $$
  BEGIN
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
  END;
  $$;

CREATE OR REPLACE FUNCTION private.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO ''
  AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.update_updated_at_column() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;

-- Update triggers to use private schema functions
CREATE OR REPLACE TRIGGER on_user_delete
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.delete_auth_user();

CREATE OR REPLACE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_cooking_times_updated_at
  BEFORE UPDATE ON public.user_cooking_times
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at_column();

-- Drop the trigger on auth.users and recreate pointing to private schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Drop old public functions (also removes their grants)
DROP FUNCTION IF EXISTS public.delete_auth_user();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.validate_ingredient_update(); -- unused, dead code
