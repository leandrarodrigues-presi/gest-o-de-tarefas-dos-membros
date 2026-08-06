import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, ClipboardList, Calendar, TrendingUp, ChevronLeft, ChevronRight, Plus, FileText, Pencil, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays, toISODate, formatDM, weeksOfMonth, MONTHS_PT, initialsFromName } from "@/lib/week";
import { WeekEntryDialog, type WeekEntry } from "@/components/WeekEntryDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TaskAssignmentDialog } from "@/components/TaskAssignmentDialog";
import { SelfNameDialog } from "@/components/SelfNameDialog";

export const Route = createFileRoute("/_authenticated/painel")({ component: Painel });

interface Member { id: string; name: string; role_title: string; area: string | null; active: boolean; user_id: string | null; }
interface Entry {
  id: string; member_id: string; week_start: string;
  tasks: string[]; meetings: string[]; prospection: string; observations: string; hours: number | null;
}
interface DelegatedTask { id: string; member_id: string; title: string; description: string; due_date: string; complexity: "baixo" | "medio" | "alto"; status: "pendente" | "concluida"; }

const COMPLEXITY_LABELS = { baixo: "Baixo", medio: "Médio", alto: "Alto" } as const;

function Painel() {
  const { isAdmin, user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [delegatedTasks, setDelegatedTasks] = useState<DelegatedTask[]>([]);
  const [editingTask, setEditingTask] = useState<DelegatedTask | null>(null);
  const [renaming, setRenaming] = useState<Member | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; member?: Member; weekStart?: Date; entry?: WeekEntry } | null>(null);

  const weeks = useMemo(() => weeksOfMonth(year, month), [year, month]);

  async function load() {
    setLoading(true);
    const startISO = toISODate(weeks[0]);
    const endISO = toISODate(addDays(weeks[weeks.length - 1], 6));
    const [m, e, delegated] = await Promise.all([
      supabase.from("members").select("*").eq("active", true).order("name"),
      supabase.from("weekly_entries").select("*").gte("week_start", startISO).lte("week_start", endISO),
      supabase.from("delegated_tasks").select("id,member_id,title,description,due_date,complexity,status").order("due_date"),
    ]);
    setMembers((m.data as Member[]) ?? []);
    setEntries(((e.data as unknown) as Entry[]) ?? []);
    setDelegatedTasks((delegated.data as DelegatedTask[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month]);

  const totals = useMemo(() => {
    let tasks = 0, meetings = 0, prosp = 0;
    for (const e of entries) {
      tasks += (e.tasks ?? []).length;
      meetings += (e.meetings ?? []).length;
      if (e.prospection?.trim()) prosp++;
    }
    return { tasks, meetings, prosp };
  }, [entries]);

  function entryFor(memberId: string, weekStart: Date): Entry | undefined {
    const iso = toISODate(weekStart);
    return entries.find((x) => x.member_id === memberId && x.week_start === iso);
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }

  const currentWeekISO = toISODate(startOfWeek(today));
  const myMember = useMemo(() => members.find((m) => user?.id && m.user_id === user.id) ?? null, [members, user?.id]);
  const myWeekPending = Boolean(
    myMember && !entries.some((e) => e.member_id === myMember.id && e.week_start === currentWeekISO),
  );

  async function toggleTask(task: DelegatedTask) {
    const status = task.status === "pendente" ? "concluida" : "pendente";
    const { error } = await supabase.from("delegated_tasks").update({ status }).eq("id", task.id);
    if (error) {
      toast.error("Não foi possível atualizar a tarefa.");
      return;
    }
    setDelegatedTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Painel de Atividades</h1>
          <p className="text-muted-foreground text-sm">{isAdmin ? "Acompanhe as atividades semanais de toda a equipe" : "Preencha sua semana vigente e consulte seus registros anteriores"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-4 py-2 rounded-lg border bg-card font-medium text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {MONTHS_PT[month]} {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {myWeekPending && myMember && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <span className="font-medium">Seu Registro Semanal de Atividades desta semana ainda está pendente.</span>
          <span className="text-muted-foreground">O prazo encerra no domingo.</span>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setDialog({
              open: true, member: myMember, weekStart: startOfWeek(today),
              entry: { member_id: myMember.id, week_start: currentWeekISO, tasks: [], meetings: [], prospection: "", observations: "", hours: 0 },
            })}
          >
            Preencher agora
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Users} label="Membros" value={members.length} color="text-primary" />
        <Stat icon={ClipboardList} label="Tarefas Registradas" value={totals.tasks} color="text-emerald-600" />
        <Stat icon={Calendar} label="Reuniões" value={totals.meetings} color="text-amber-600" />
        <Stat icon={TrendingUp} label="Registros c/ Prospecção" value={totals.prosp} color="text-sky-600" />
      </div>

      <section className="space-y-3">
        <div><h2 className="text-xl font-bold">Tarefas delegadas</h2><p className="text-sm text-muted-foreground">Atividades atribuídas pelas diretorias, com prazo e complexidade.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {delegatedTasks.map((task) => {
            const member = members.find((item) => item.id === task.member_id);
            return (
              <Card key={task.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{task.title}</h3>{isAdmin && <p className="text-xs text-muted-foreground">{member?.name ?? "Membro"}</p>}</div><Badge variant={task.complexity === "alto" ? "destructive" : task.complexity === "medio" ? "default" : "secondary"}>{COMPLEXITY_LABELS[task.complexity]}</Badge></div>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{task.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3"><div className="text-xs"><span className="text-muted-foreground">Prazo: </span><span className="font-medium">{new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</span></div><div className="flex gap-2">{isAdmin && <Button size="sm" variant="outline" onClick={() => setEditingTask(task)}>Editar</Button>}<Button size="sm" variant={task.status === "concluida" ? "outline" : "default"} onClick={() => toggleTask(task)}>{task.status === "concluida" ? "Reabrir" : "Concluir"}</Button></div></div>
              </Card>
            );
          })}
          {!loading && delegatedTasks.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Nenhuma tarefa delegada no momento.</div>}
        </div>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold w-64 sticky left-0 bg-muted/50">Membro</th>
                <th colSpan={weeks.length} className="p-2 text-center text-primary font-semibold border-l">
                  {MONTHS_PT[month]} {year}
                </th>
              </tr>
              <tr className="bg-muted/30 text-xs">
                <th className="p-2 sticky left-0 bg-muted/30"></th>
                {weeks.map((w) => {
                  const iso = toISODate(w);
                  const isCurrent = iso === currentWeekISO;
                  return (
                    <th key={iso} className={`p-2 border-l text-center font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      {formatDM(w)}
                      {isCurrent && <div className="text-[10px]">•</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={weeks.length + 1} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && members.length === 0 && (
                <tr><td colSpan={weeks.length + 1} className="p-8 text-center text-muted-foreground">
                  Nenhum membro cadastrado. Vá em <strong>Equipe</strong> para adicionar.
                </td></tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="border-t hover:bg-accent/30">
                  <td className="p-3 sticky left-0 bg-card">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold">
                        {initialsFromName(m.name)}
                      </div>
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{m.name}</span>
                          {user?.id && m.user_id === user.id && (
                            <button type="button" title="Editar meu nome" aria-label="Editar meu nome"
                              className="p-0.5 text-muted-foreground hover:text-primary"
                              onClick={() => setRenaming(m)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{m.role_title}</div>
                      </div>
                    </div>
                  </td>
                  {weeks.map((w) => {
                    const e = entryFor(m.id, w);
                    const iso = toISODate(w);
                    const isCurrent = iso === currentWeekISO;
                    return (
                      <td key={iso} className={`p-2 border-l text-center align-middle ${isCurrent ? "bg-primary/5" : ""}`}>
                        <button
                          onClick={() => setDialog({
                            open: true, member: m, weekStart: w,
                            entry: {
                              id: e?.id, member_id: m.id, week_start: iso,
                              tasks: e?.tasks ?? [], meetings: e?.meetings ?? [],
                              prospection: e?.prospection ?? "", observations: e?.observations ?? "",
                              hours: Number(e?.hours ?? 0),
                            },
                          })}
                          className={`mx-auto inline-flex flex-col items-center justify-center min-w-12 min-h-12 rounded-lg transition ${
                            e ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                              : "border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {e ? (
                            <>
                              <FileText className="h-3.5 w-3.5" />
                              <div className="text-[10px] leading-tight mt-0.5">
                                {e.tasks?.length ? <div>T:{e.tasks.length}</div> : null}
                                {e.meetings?.length ? <div>R:{e.meetings.length}</div> : null}
                                {e.prospection ? <div>P</div> : null}
                                {e.hours ? <div>{Number(e.hours)}h</div> : null}
                              </div>
                            </>
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {dialog?.open && dialog.member && dialog.weekStart && dialog.entry && (
        <WeekEntryDialog
          open={dialog.open}
          onOpenChange={(v) => setDialog(v ? dialog : null)}
          memberName={dialog.member.name}
          weekStart={dialog.weekStart}
          entry={dialog.entry}
          readOnly={
            !isAdmin &&
            (dialog.member.user_id !== user?.id || toISODate(dialog.weekStart) !== currentWeekISO)
          }
          canDelete={isAdmin || (dialog.member.user_id === user?.id && toISODate(dialog.weekStart) === currentWeekISO)}
          onSaved={load}
        />
      )}
      {editingTask && (
        <TaskAssignmentDialog
          open
          onOpenChange={(open) => !open && setEditingTask(null)}
          member={members.find((item) => item.id === editingTask.member_id) ?? null}
          task={editingTask}
          onSaved={() => { setEditingTask(null); void load(); }}
        />
      )}
      <SelfNameDialog
        open={Boolean(renaming)}
        onOpenChange={(open) => !open && setRenaming(null)}
        memberId={renaming?.id ?? null}
        currentName={renaming?.name ?? ""}
        onSaved={load}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-muted grid place-items-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </Card>
  );
}
