ALTER TABLE public.members DISABLE TRIGGER protect_member_self_update;

ALTER TABLE public.members DROP CONSTRAINT members_cargo_check;

UPDATE public.members
SET cargo = 'administrador'
WHERE cargo = 'membro'
  AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

UPDATE public.members
SET cargo = 'trainee'
WHERE cargo = 'membro';

ALTER TABLE public.members ENABLE TRIGGER protect_member_self_update;

ALTER TABLE public.members ALTER COLUMN cargo SET DEFAULT 'trainee';

ALTER TABLE public.members
  ADD CONSTRAINT members_cargo_check
  CHECK (cargo IN ('administrador', 'diretor', 'coordenador', 'assessor', 'trainee'));