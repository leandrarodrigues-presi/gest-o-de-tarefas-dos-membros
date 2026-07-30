DROP POLICY IF EXISTS "approved users read allowed members" ON public.members;
CREATE POLICY "approved users read all members"
ON public.members FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member'));

DROP POLICY IF EXISTS "approved users read allowed entries" ON public.weekly_entries;
CREATE POLICY "approved users read all entries"
ON public.weekly_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member'));