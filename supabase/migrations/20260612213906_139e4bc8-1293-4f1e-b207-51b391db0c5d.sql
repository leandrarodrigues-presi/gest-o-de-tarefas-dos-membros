DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

DROP INDEX IF EXISTS public.members_user_id_unique;
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_user_id_key;
ALTER TABLE public.members
  ADD CONSTRAINT members_user_id_key UNIQUE (user_id);