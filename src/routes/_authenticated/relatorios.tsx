import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Printer, FileDown, FileSpreadsheet, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { addDays, formatDM, MONTHS_PT, startOfWeek, toISODate, weeksOfMonth, initialsFromName } from "@/lib/week";
import { DIRECTORATES, directorateLabel } from "@/lib/directorates";
import lignumLogo from "@/assets/lignum.png.asset.json";
import iffLogo from "@/assets/iff.png.asset.json";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/relatorios")({ component: Relatorios });

interface Member { id: string; name: string; role_title: string; directorate: string | null; }
interface Entry {
  member_id: string; week_start: string;
  tasks: string[]; meetings: string[]; prospection: string; observations: string; hours: number | null;
}

function Relatorios() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const weeks = useMemo(() => weeksOfMonth(year, month), [year, month]);
  const currentISO = toISODate(startOfWeek(today));
  const defaultIdx = Math.max(0, weeks.findIndex((w) => toISODate(w) === currentISO));
  const [weekIdx, setWeekIdx] = useState(defaultIdx);
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [memberFilter, setMemberFilter] = useState("all");
  const [directorateFilter, setDirectorateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => { setWeekIdx(Math.max(0, weeks.findIndex((w) => toISODate(w) === currentISO))); /* eslint-disable-next-line */ }, [year, month]);

  useEffect(() => {
    (async () => {
      const week = weeks[weekIdx] ?? weeks[0];
      const iso = toISODate(week);
      const [m, e] = await Promise.all([
        supabase.from("members").select("id,name,role_title,directorate").eq("active", true).order("name"),
        supabase.from("weekly_entries").select("*").eq("week_start", iso),
      ]);
      setMembers((m.data as Member[]) ?? []);
      setEntries(((e.data as unknown) as Entry[]) ?? []);
    })();
  }, [year, month, weekIdx, weeks]);

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setWeekIdx(0);
  }

  const weekStart = weeks[weekIdx] ?? weeks[0];
  const weekEnd = addDays(weekStart, 6);

  const rows = useMemo(() => {
    const q = projectFilter.trim().toLowerCase();
    return members
      .map((m) => ({ member: m, entry: entries.find((x) => x.member_id === m.id) }))
      .filter(({ member, entry }) => {
        if (memberFilter !== "all" && member.id !== memberFilter) return false;
        if (directorateFilter !== "all" && (member.directorate ?? "none") !== directorateFilter) return false;
        if (statusFilter === "filled" && !entry) return false;
        if (statusFilter === "pending" && entry) return false;
        if (q) {
          const hay = [...(entry?.tasks ?? []), ...(entry?.meetings ?? []), entry?.prospection ?? "", entry?.observations ?? ""]
            .join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [members, entries, memberFilter, directorateFilter, statusFilter, projectFilter]);

  function tableData() {
    return rows.map(({ member, entry }) => ({
      Semana: `${formatDM(weekStart)} a ${formatDM(weekEnd)}`,
      Colaborador: member.name,
      Cargo: member.role_title,
      Diretoria: directorateLabel(member.directorate),
      Status: entry ? "Preenchido" : "Pendente",
      Horas: Number(entry?.hours ?? 0),
      Tarefas: (entry?.tasks ?? []).join(" | "),
      Reuniões: (entry?.meetings ?? []).join(" | "),
      Prospecção: entry?.prospection ?? "",
      Observações: entry?.observations ?? "",
    }));
  }

  function baseName() {
    return `relatorio-${toISODate(weekStart)}`;
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(tableData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${baseName()}.xlsx`);
  }

  function exportCSV() {
    const data = tableData();
    const headers = Object.keys(data[0] ?? { Colaborador: "" });
    const csv = [
      headers.join(";"),
      ...data.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatório Semanal</h1>
          <p className="text-muted-foreground text-sm">Gere, filtre e exporte o relatório central da equipe</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCSV}><FileDown className="mr-2 h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir / PDF</Button>
        </div>
      </div>

      <Card className="p-4 no-print flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-2 rounded-md bg-muted text-sm font-medium min-w-32 text-center">
            {MONTHS_PT[month]} {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {weeks.map((w, i) => (
            <button
              key={toISODate(w)}
              onClick={() => setWeekIdx(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                i === weekIdx ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
              }`}
            >
              {formatDM(w)} – {formatDM(addDays(w, 6))}
            </button>
          ))}
        </div>
      </Card>

      <Card className="no-print grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={directorateFilter} onValueChange={setDirectorateFilter}>
          <SelectTrigger><SelectValue placeholder="Diretoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as diretorias</SelectItem>
            {DIRECTORATES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            <SelectItem value="none">Sem diretoria</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="filled">Preenchidos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Projeto / palavra-chave" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} />
        </div>
      </Card>

      <div className="print-area">
        <div className="report-document mx-auto max-w-[820px] bg-white rounded-xl border-4 border-primary overflow-hidden shadow-card">
          <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between gap-4">
            <div className="h-14 w-14 rounded-full bg-white/15 grid place-items-center">
              <img src={lignumLogo.url} alt="Lignum" className="h-10 w-10 object-contain invert" />
            </div>
            <div className="text-center flex-1">
              <div className="text-xl font-extrabold tracking-wide">LIGNUM AMBIENTAL JR.</div>
              <div className="text-xs opacity-90">Empresa Júnior de Engenharia Ambiental</div>
            </div>
            <div className="h-14 w-14 rounded bg-white grid place-items-center">
              <img src={iffLogo.url} alt="IFF" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <div className="text-center py-3 text-foreground font-semibold border-b-4 border-primary">
            RELATÓRIO SEMANAL: {formatDM(weekStart)} – {formatDM(weekEnd)}
          </div>

          <div className="p-6 space-y-4 bg-white text-black">
            {rows.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado com os filtros atuais.</p>
            )}
            {rows.map(({ member: m, entry: e }) => (
              <div key={m.id} className="border-t-2 border-primary/60 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold">
                    {initialsFromName(m.name)}
                  </div>
                  <div className="font-bold text-sm">
                    {m.name} <span className="font-normal text-muted-foreground">— {m.role_title} · {directorateLabel(m.directorate)}</span>
                  </div>
                  <div className="ml-auto text-[11px] text-muted-foreground">
                    {e ? `${Number(e.hours ?? 0)}h registradas` : "Registro pendente"}
                  </div>
                </div>
                <ReportSection title="Tarefas" items={e?.tasks ?? []} />
                <ReportSection title="Reuniões" items={e?.meetings ?? []} />
                <ReportLine title="Prospecção" text={e?.prospection} />
                {e?.observations && <ReportLine title="Observações" text={e.observations} />}
              </div>
            ))}
          </div>

          <div className="report-footer border-t-4 border-primary px-6 py-4 text-center italic text-sm bg-primary/5">
            "Ninguém constrói uma obra relevante com o tempo que sobra; constrói com o tempo que dedica."
            <div className="not-italic text-xs text-muted-foreground mt-1">— Mário Sérgio Cortella</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="text-sm mt-1">
      <div className="font-semibold">{title}:</div>
      {items.length === 0 ? (
        <div className="text-muted-foreground text-xs pl-4">—</div>
      ) : (
        <ul className="list-disc pl-6 text-xs space-y-0.5">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}

function ReportLine({ title, text }: { title: string; text?: string }) {
  return (
    <div className="text-sm mt-1">
      <span className="font-semibold">{title}: </span>
      <span className="text-xs">{text?.trim() ? text : "—"}</span>
    </div>
  );
}
