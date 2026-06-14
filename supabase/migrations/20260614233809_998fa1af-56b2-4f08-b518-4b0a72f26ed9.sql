CREATE OR REPLACE FUNCTION public.protect_delegated_task_member_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
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

CREATE TRIGGER protect_delegated_task_member_updates
BEFORE UPDATE ON public.delegated_tasks
FOR EACH ROW EXECUTE FUNCTION public.protect_delegated_task_member_updates();