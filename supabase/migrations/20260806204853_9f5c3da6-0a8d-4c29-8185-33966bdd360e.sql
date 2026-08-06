ALTER TABLE public.weekly_entries ADD COLUMN IF NOT EXISTS hours numeric NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "members delete own current week entries" ON public.weekly_entries;
CREATE POLICY "members delete own current week entries"
ON public.weekly_entries FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'member'::app_role)
  AND week_start = (CURRENT_DATE - (((EXTRACT(isodow FROM CURRENT_DATE))::integer - 1) * INTERVAL '1 day'))::date
  AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = weekly_entries.member_id AND m.user_id = auth.uid())
);