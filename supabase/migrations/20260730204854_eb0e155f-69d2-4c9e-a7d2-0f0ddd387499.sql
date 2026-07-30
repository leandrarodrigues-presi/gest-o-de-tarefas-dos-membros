CREATE OR REPLACE FUNCTION public.protect_member_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.role_title IS DISTINCT FROM OLD.role_title
    OR NEW.area IS DISTINCT FROM OLD.area
    OR NEW.active IS DISTINCT FROM OLD.active
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Membros podem alterar apenas o próprio nome';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_member_self_update ON public.members;
CREATE TRIGGER protect_member_self_update
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.protect_member_self_update();

DROP POLICY IF EXISTS "members update own name" ON public.members;
CREATE POLICY "members update own name" ON public.members
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'member') AND user_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'member') AND user_id = auth.uid());