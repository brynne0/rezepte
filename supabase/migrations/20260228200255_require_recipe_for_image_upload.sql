-- Require images to be linked to an existing recipe on upload.

drop policy if exists "Users can upload their own recipe images" on "storage"."objects";

create policy "Users can upload their own recipe images"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.recipes
    WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
  )
);
