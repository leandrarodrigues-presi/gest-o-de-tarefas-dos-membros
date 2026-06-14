ALTER TABLE public.profiles
ADD COLUMN directorate text NULL
CHECK (directorate IS NULL OR directorate IN ('presidencia', 'gente_gestao', 'projetos', 'publicidade'));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

CREATE TABLE public.delegated_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 2000),
  due_date date NOT NULL,
  complexity text NOT NULL CHECK (complexity IN ('baixo', 'medio', 'alto')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegated_tasks TO authenticated;
GRANT ALL ON public.delegated_tasks TO service_role;
ALTER TABLE public.delegated_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all delegated tasks"
ON public.delegated_tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members read own delegated tasks"
ON public.delegated_tasks FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'member')
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = delegated_tasks.member_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "admins create delegated tasks"
ON public.delegated_tasks FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND assigned_by = auth.uid());

CREATE POLICY "admins update delegated tasks"
ON public.delegated_tasks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members update own delegated task status"
ON public.delegated_tasks FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'member')
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = delegated_tasks.member_id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'member')
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = delegated_tasks.member_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "admins delete delegated tasks"
ON public.delegated_tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_delegated_tasks_updated_at
BEFORE UPDATE ON public.delegated_tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();