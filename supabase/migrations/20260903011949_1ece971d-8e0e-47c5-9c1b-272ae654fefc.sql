CREATE OR REPLACE FUNCTION public.can_delegate_task(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  a_cargo text;
  a_dir text;
  t_cargo text;
  t_dir text;
  t_active boolean;
BEGIN
  IF _user_id IS NULL OR _member_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  SELECT m.cargo, NULLIF(BTRIM(COALESCE(m.directorate, '')), '')
    INTO a_cargo, a_dir
  FROM public.members m
  WHERE m.user_id = _user_id AND m.active
  ORDER BY m.created_at
  LIMIT 1;

  SELECT m.cargo, NULLIF(BTRIM(COALESCE(m.directorate, '')), ''), m.active
    INTO t_cargo, t_dir, t_active
  FROM public.members m
  WHERE m.id = _member_id;

  IF a_cargo IS NULL OR t_cargo IS NULL OR t_active IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  IF a_dir IS NULL OR t_dir IS NULL OR a_dir <> t_dir THEN
    RETURN false;
  END IF;

  RETURN CASE a_cargo
    WHEN 'administrador' THEN t_cargo IN ('diretor', 'coordenador', 'assessor', 'trainee')
    WHEN 'diretor' THEN t_cargo IN ('coordenador', 'assessor', 'trainee')
    WHEN 'coordenador' THEN t_cargo IN ('assessor', 'trainee')
    WHEN 'assessor' THEN t_cargo = 'trainee'
    ELSE false
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_delegate_task(uuid, uuid) TO authenticated;

CREATE POLICY "delegators create delegated tasks"
ON public.delegated_tasks FOR INSERT TO authenticated
WITH CHECK (assigned_by = auth.uid() AND public.can_delegate_task(auth.uid(), member_id));

CREATE POLICY "delegators read own assigned tasks"
ON public.delegated_tasks FOR SELECT TO authenticated
USING (assigned_by = auth.uid());

CREATE POLICY "delegators update own assigned tasks"
ON public.delegated_tasks FOR UPDATE TO authenticated
USING (assigned_by = auth.uid() AND public.can_delegate_task(auth.uid(), member_id))
WITH CHECK (assigned_by = auth.uid() AND public.can_delegate_task(auth.uid(), member_id));

CREATE POLICY "delegators delete own assigned tasks"
ON public.delegated_tasks FOR DELETE TO authenticated
USING (assigned_by = auth.uid() AND public.can_delegate_task(auth.uid(), member_id));

CREATE OR REPLACE FUNCTION public.protect_delegated_task_member_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Quem delegou a tarefa pode editá-la enquanto mantiver autoridade sobre o destinatário
  IF OLD.assigned_by = auth.uid()
     AND public.can_delegate_task(auth.uid(), NEW.member_id)
     AND public.can_delegate_task(auth.uid(), OLD.member_id) THEN
    IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
      RAISE EXCEPTION 'Não é permitido alterar o responsável pela atribuição';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'member') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.complexity IS DISTINCT FROM OLD.complexity
    OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Membros podem alterar apenas a situação da tarefa';
  END IF;

  RETURN NEW;
END;
$$;