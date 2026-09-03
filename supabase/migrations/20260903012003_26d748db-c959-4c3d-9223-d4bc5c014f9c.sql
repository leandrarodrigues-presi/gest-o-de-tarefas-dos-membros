REVOKE ALL ON FUNCTION public.can_delegate_task(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delegate_task(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_delegate_task(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delegate_task(uuid, uuid) TO service_role;