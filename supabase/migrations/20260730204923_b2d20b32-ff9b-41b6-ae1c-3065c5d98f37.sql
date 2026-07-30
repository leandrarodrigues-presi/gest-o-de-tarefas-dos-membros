REVOKE ALL ON FUNCTION public.protect_member_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_delegated_task_member_updates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;