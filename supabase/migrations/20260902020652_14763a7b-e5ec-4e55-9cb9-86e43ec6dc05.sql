ALTER TABLE public.members ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT 'membro' CHECK (cargo IN ('administrador','diretor','assessor','coordenador','membro'));

-- Membros com papel de admin no sistema passam a ter cargo 'administrador'
UPDATE public.members m
SET cargo = 'administrador'
WHERE m.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');