-- Server-side ingredient matching, so the client no longer has to download
-- every row in ingredients and filter in JS just to find one match.
--
-- match_ingredient_by_english: match candidate lemmas (already lowercased
-- and pluralize-canonicalised in JS) against the canonical English columns.
-- match_ingredient_by_translation: match a raw search term against the
-- cached translation for one language.
create or replace function match_ingredient_by_english(p_candidates text[])
returns smallint
language sql
stable
security invoker
as $$
  select id from ingredients
  where lower(singular_name) = any(p_candidates)
     or lower(plural_name) = any(p_candidates)
  limit 1;
$$;

create or replace function match_ingredient_by_translation(
  p_language text,
  p_search_name text
) returns smallint
language sql
stable
security invoker
as $$
  select id from ingredients
  where lower(translated_names -> p_language ->> 'singular_name') = p_search_name
     or lower(translated_names -> p_language ->> 'plural_name') = p_search_name
  limit 1;
$$;

grant execute on function match_ingredient_by_english(text[]) to anon, authenticated;
grant execute on function match_ingredient_by_translation(text, text) to anon, authenticated;

-- Speed up the English-column lookups above as the table grows
create index if not exists idx_ingredients_lower_singular_name
  on ingredients (lower(singular_name));
create index if not exists idx_ingredients_lower_plural_name
  on ingredients (lower(plural_name));
