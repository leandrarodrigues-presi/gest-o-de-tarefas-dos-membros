ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_unique
  ON public.members(user_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "auth read members" ON public.members;
CREATE POLICY "approved users read allowed members"
ON public.members FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'member') AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "approved users read allowed profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'member') AND id = auth.uid())
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
CREATE POLICY "users see own role and admins see all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read entries" ON public.weekly_entries;
DROP POLICY IF EXISTS "auth insert entries" ON public.weekly_entries;
DROP POLICY IF EXISTS "auth update entries" ON public.weekly_entries;

CREATE POLICY "approved users read allowed entries"
ON public.weekly_entries FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'member')
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = weekly_entries.member_id AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "members insert current week entries"
ON public.weekly_entries FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'member')
    AND created_by = auth.uid()
    AND week_start = (CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) * INTERVAL '1 day'))::date
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = weekly_entries.member_id AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "members update current week entries"
ON public.weekly_entries FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'member')
    AND week_start = (CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) * INTERVAL '1 day'))::date
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = weekly_entries.member_id AND m.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'member')
    AND created_by = auth.uid()
    AND week_start = (CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) * INTERVAL '1 day'))::date
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = weekly_entries.member_id AND m.user_id = auth.uid()
    )
  )
);