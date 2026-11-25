-- Local test data only (runs on `supabase db reset`, never on the live project).
-- Log in as olive / finn / sam, password: password123
--   olive: owns the vegan recipes (one per visibility level)
--   finn:  olive's friend
--   sam:   not a friend (for testing shared links while signed in)

DO $$
DECLARE
  v_users jsonb := '[
    {"id":"00000000-0000-0000-0000-0000000000a1","email":"olive@test.dev","username":"olive","first_name":"Olive"},
    {"id":"00000000-0000-0000-0000-0000000000b2","email":"finn@test.dev","username":"finn","first_name":"Finn"},
    {"id":"00000000-0000-0000-0000-0000000000c3","email":"sam@test.dev","username":"sam","first_name":"Sam"}
  ]';
  v_user jsonb;
  v_olive uuid := '00000000-0000-0000-0000-0000000000a1';
  v_lentil smallint;
  v_coconut smallint;
  v_onion smallint;
  v_oat_milk smallint;
  v_chickpea smallint;
  v_dal smallint;
  v_pancakes smallint;
  v_stew smallint;
BEGIN
  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    -- Token columns must be '' not NULL or GoTrue rejects the login
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', (v_user->>'id')::uuid,
      'authenticated', 'authenticated', v_user->>'email',
      extensions.crypt('password123', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', v_user->>'username',
                         'first_name', v_user->>'first_name', 'language', 'en'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), (v_user->>'id')::uuid, v_user->>'id', 'email',
      jsonb_build_object('sub', v_user->>'id', 'email', v_user->>'email',
                         'email_verified', true),
      now(), now(), now()
    );
  END LOOP;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_olive, '00000000-0000-0000-0000-0000000000b2', 'accepted');

  INSERT INTO public.ingredients (singular_name, plural_name)
    VALUES ('red lentil', 'red lentils') RETURNING id INTO v_lentil;
  INSERT INTO public.ingredients (singular_name, plural_name)
    VALUES ('coconut milk', 'coconut milk') RETURNING id INTO v_coconut;
  INSERT INTO public.ingredients (singular_name, plural_name)
    VALUES ('onion', 'onions') RETURNING id INTO v_onion;
  INSERT INTO public.ingredients (singular_name, plural_name)
    VALUES ('oat milk', 'oat milk') RETURNING id INTO v_oat_milk;
  INSERT INTO public.ingredients (singular_name, plural_name)
    VALUES ('chickpea', 'chickpeas') RETURNING id INTO v_chickpea;

  -- Link-shared recipe (share URL: /shared/seedsharetoken000001/red-lentil-dal)
  INSERT INTO public.recipes (title, user_id, servings, instructions, notes,
                              visibility, share_token)
  VALUES ('Red Lentil Dal', v_olive, '4',
          ARRAY['Fry the onion until soft', 'Add lentils, spices and water',
                'Simmer for 20 minutes', 'Stir in the coconut milk'],
          'Serve with rice or flatbread', 'link', 'seedsharetoken000001')
  RETURNING id INTO v_dal;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, order_index, is_plural)
  VALUES (v_dal, v_lentil, '1', 'cup/s', 0, true),
         (v_dal, v_coconut, '1', 'can/s', 1, false),
         (v_dal, v_onion, '1', '', 2, false);

  INSERT INTO public.recipes (title, user_id, servings, instructions, visibility)
  VALUES ('Fluffy Vegan Pancakes', v_olive, '2',
          ARRAY['Whisk flour, baking powder and oat milk', 'Rest for 5 minutes',
                'Fry in a hot pan'], 'friends')
  RETURNING id INTO v_pancakes;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, order_index, is_plural)
  VALUES (v_pancakes, v_oat_milk, '250', 'ml', 0, false);

  INSERT INTO public.recipes (title, user_id, servings, instructions, visibility)
  VALUES ('Secret Chickpea Stew', v_olive, '6',
          ARRAY['Roast the chickpeas', 'Simmer with tomatoes and spices'],
          'private')
  RETURNING id INTO v_stew;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, order_index, is_plural)
  VALUES (v_stew, v_chickpea, '2', 'can/s', 0, true),
         (v_stew, v_onion, '1', '', 1, false);
END $$;
