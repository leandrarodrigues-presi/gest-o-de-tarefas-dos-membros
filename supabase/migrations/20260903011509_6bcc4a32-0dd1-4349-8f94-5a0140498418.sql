CREATE OR REPLACE FUNCTION public.protect_member_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.role_title IS DISTINCT FROM OLD.role_title
    OR NEW.area IS DISTINCT FROM OLD.area
    OR NEW.directorate IS DISTINCT FROM OLD.directorate
    OR NEW.cargo IS DISTINCT FROM OLD.cargo
    OR NEW.active IS DISTINCT FROM OLD.active
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Membros podem alterar apenas o próprio nome';
  END IF;

  RETURN NEW;
END;
$function$;