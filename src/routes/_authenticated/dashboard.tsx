import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ClipboardList, Calendar, TrendingUp, Clock, CheckCircle2, CircleDashed, Trophy, Building2,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { MONTHS_PT } from "@/lib/week";
import { PeriodFilter } from "@/components/PeriodFilter";
import { defaultPeriod, inPeriod, type PeriodValue } from "@/lib/period";
import { directorateLabel } from "@/lib/directorates";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface Member { id: string; name: string; role_title: string; area: string | null; active: boolean; directorate: string | null; }
interface Entry {
  id: string; member_id: string; week_start: string;
  tasks: string[]; meetings: string[]; prospection: string; observations: string; hours: number | null;
}
interface Task { id: string; member_id: string; status: string; due_date: string; }

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ef4444"];

function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [m, e, t] = await Promise.all([
        supabase.from("members").select("id,name,role_title,area,active,directorate").order("name"),
        supabase.from("weekly_entries").select("*"),
        supabase.from("delegated_tasks").select("id,member_id,status,due_date"),
      ]);
      setMembers((m.data as Member[]) ?? []);
      setAllEntries((e.data as unknown as Entry[]) ?? []);
      setTasks((t.data as Task[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const entries = useMemo(() => allEntries.filter((e) => inPeriod(e.week_start, period)), [allEntries, period]);
  const periodTasks = useMemo(() => tasks.filter((t) => inPeriod(t.due_date, period)), [tasks, period]);

  const totals = useMemo(() => {
    let tarefas = 0, meetings = 0, prosp = 0, hours = 0;
    for (const e of entries) {
      tarefas += (e.tasks ?? []).length;
      meetings += (e.meetings ?? []).length;
      hours += Number(e.hours ?? 0);
      if (e.prospection?.trim()) prosp++;
    }
    return {
      tarefas, meetings, prosp, hours,
      members: members.filter((m) => m.active).length,
      done: periodTasks.filter((t) => t.status === "concluida").length,
      pending: periodTasks.filter((t) => t.status !== "concluida").length,
    };
  }, [entries, members, periodTasks]);

  const perMemberFull = useMemo(() => {
    return members.map((m) => {
      const es = entries.filter((e) => e.member_id === m.id);
      const tarefas = es.reduce((s, e) => s + (e.tasks?.length ?? 0), 0);
      const reunioes = es.reduce((s, e) => s + (e.meetings?.length ?? 0), 0);
      const horas = es.reduce((s, e) => s + Number(e.hours ?? 0), 0);
      const prospeccoes = es.filter((e) => e.prospection?.trim()).length;
      return { member: m, tarefas, reunioes, horas, prospeccoes, score: tarefas + reunioes + prospeccoes + horas / 2 };
    });
  }, [members, entries]);

  const topMember = useMemo(
    () => [...perMemberFull].sort((a, b) => b.score - a.score)[0],
    [perMemberFull],
  );

  const perDirectorate = useMemo(() => {
    const map = new Map<string, { key: string; atividades: number; horas: number; reunioes: number; prospeccoes: number; membros: number }>();
    for (const row of perMemberFull) {
      const key = row.member.directorate ?? "sem_diretoria";
      const cur = map.get(key) ?? { key, atividades: 0, horas: 0, reunioes: 0, prospeccoes: 0, membros: 0 };
      cur.atividades += row.tarefas;
      cur.horas += row.horas;
      cur.reunioes += row.reunioes;
      cur.prospeccoes += row.prospeccoes;
      cur.membros += 1;
      map.set(key, cur);
    }
    const rows = Array.from(map.values()).map((r) => ({ ...r, score: r.atividades + r.reunioes + r.prospeccoes + r.horas / 2 }));
    const total = rows.reduce((s, r) => s + r.score, 0);
    return rows
      .map((r) => ({ ...r, share: total > 0 ? (r.score / total) * 100 : 0 }))
      .sort((a, b) => b.score - a.score);
  }, [perMemberFull]);

  const top4 = perDirectorate.slice(0, 4);

  const perMemberChart = useMemo(
    () => [...perMemberFull]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({ name: r.member.name.split(" ")[0], Tarefas: r.tarefas, Reuniões: r.reunioes, Horas: r.horas })),
    [perMemberFull],
  );

  const perMonth = useMemo(() => {
    const map = new Map<string, { mes: string; Tarefas: number; Reuniões: number; Prospecções: number; Horas: number }>();
    for (const e of entries) {
      const d = new Date(`${e.week_start}T12:00:00`);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = `${MONTHS_PT[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(2)}`;
      const cur = map.get(key) ?? { mes: label, Tarefas: 0, Reuniões: 0, Prospecções: 0, Horas: 0 };
      cur.Tarefas += e.tasks?.length ?? 0;
      cur.Reuniões += e.meetings?.length ?? 0;
      cur.Horas += Number(e.hours ?? 0);
      if (e.prospection?.trim()) cur.Prospecções += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [entries]);

  const pieDirectorate = useMemo(
    () => perDirectorate.filter((d) => d.atividades > 0).map((d) => ({ name: directorateLabel(d.key), value: d.atividades })),
    [perDirectorate],
  );

  if (loading) {
    return <div className="py-16 grid place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Visão gerencial consolidada das atividades da Lignum Ambiental Jr.
        </p>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Clock} label="Horas registradas" value={formatNumber(totals.hours)} color="text-primary" />
        <Stat icon={ClipboardList} label="Atividades registradas" value={totals.tarefas} color="text-emerald-600" />
        <Stat icon={CheckCircle2} label="Atividades concluídas" value={totals.done} color="text-emerald-600" />
        <Stat icon={CircleDashed} label="Atividades pendentes" value={totals.pending} color="text-amber-600" />
        <Stat icon={Calendar} label="Reuniões" value={totals.meetings} color="text-amber-600" />
        <Stat icon={TrendingUp} label="Semanas c/ prospecção" value={totals.prosp} color="text-sky-600" />
        <Stat icon={Users} label="Membros ativos" value={totals.members} color="text-primary" />
        <Stat
          icon={Trophy}
          label="Colaborador mais produtivo"
          value={topMember && topMember.score > 0 ? topMember.member.name.split(" ").slice(0, 2).join(" ") : "—"}
          color="text-violet-600"
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Top 4 Diretorias Mais Produtivas</h2>
          {perDirectorate[0] && perDirectorate[0].score > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Líder: {directorateLabel(perDirectorate[0].key)}
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="p-2">#</th>
                <th className="p-2">Diretoria</th>
                <th className="p-2 text-right">Atividades</th>
                <th className="p-2 text-right">Horas</th>
                <th className="p-2 text-right">Reuniões</th>
                <th className="p-2 text-right">Prospecções</th>
                <th className="p-2 text-right">Participação</th>
              </tr>
            </thead>
            <tbody>
              {top4.map((d, i) => (
                <tr key={d.key} className="border-t">
                  <td className="p-2 font-bold text-muted-foreground">{i + 1}º</td>
                  <td className="p-2 font-medium">{directorateLabel(d.key)}</td>
                  <td className="p-2 text-right">{d.atividades}</td>
                  <td className="p-2 text-right">{formatNumber(d.horas)}</td>
                  <td className="p-2 text-right">{d.reunioes}</td>
                  <td className="p-2 text-right">{d.prospeccoes}</td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, d.share)}%` }} />
                      </div>
                      <span className="font-medium">{d.share.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {top4.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sem dados no período selecionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Atividades por membro (top 10)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perMemberChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Tarefas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reuniões" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Horas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Evolução no período</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perMonth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Tarefas" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="Reuniões" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Horas" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">Atividades por diretoria</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieDirectorate} dataKey="value" nameKey="name" outerRadius={100} label>
                  {pieDirectorate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function Stat({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number | string; color: string }) {
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-lg bg-muted grid place-items-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl sm:text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </Card>
  );
}
