import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, AlertTriangle, Mail } from "lucide-react";
import { initialsFromName } from "@/lib/week";
import { MemberFormDialog, type Member } from "@/components/MemberFormDialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { DIRECTORATES, directorateLabel } from "@/lib/directorates";

export const Route = createFileRoute("/_authenticated/equipe")({ component: () => <AdminRouteGuard><Equipe /></AdminRouteGuard> });

type Row = Member & {
  id: string;
  created_at?: string;
  directorate?: string | null;
  user_id?: string | null;
  profiles?: { email: string | null; directorate: string | null } | null;
};

function Equipe() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [directorate, setDirectorate] = useState("all");
  const [roleTitle, setRoleTitle] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"name" | "created">("name");

  async function load() {
    const { data } = await supabase
      .from("members")
      .select("*, profiles:user_id(email,directorate)")
      .order("name");
    setMembers((data as unknown as Row[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const roleTitles = useMemo(
    () => Array.from(new Set(members.map((m) => m.role_title).filter(Boolean))).sort(),
    [members],
  );

  const duplicateNames = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of members) {
      const key = m.name.trim().toLowerCase();
      count.set(key, (count.get(key) ?? 0) + 1);
    }
    return new Set(Array.from(count.entries()).filter(([, c]) => c > 1).map(([k]) => k));
  }, [members]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => {
        const dir = m.directorate ?? m.profiles?.directorate ?? null;
        const email = m.profiles?.email ?? "";
        if (q && ![m.name, email, directorateLabel(dir), m.role_title].join(" ").toLowerCase().includes(q)) return false;
        if (directorate !== "all" && (dir ?? "none") !== directorate) return false;
        if (roleTitle !== "all" && m.role_title !== roleTitle) return false;
        if (status === "active" && !m.active) return false;
        if (status === "inactive" && m.active) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "pt-BR")
          : (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      );
  }, [members, search, directorate, roleTitle, status, sort]);

  async function confirmDelete() {
    if (!deleting?.id) return;
    const { error } = await supabase.from("members").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else { toast.success("Membro removido"); load(); }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground text-sm">Gerencie os membros da equipe ({visible.length} de {members.length})</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Membro
          </Button>
        )}
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Pesquisar por nome, e-mail ou diretoria" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={directorate} onValueChange={setDirectorate}>
          <SelectTrigger><SelectValue placeholder="Diretoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as diretorias</SelectItem>
            {DIRECTORATES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            <SelectItem value="none">Sem diretoria</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleTitle} onValueChange={setRoleTitle}>
          <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {roleTitles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "name" | "created")}>
            <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="created">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((m) => {
          const dir = m.directorate ?? m.profiles?.directorate ?? null;
          const isDuplicate = duplicateNames.has(m.name.trim().toLowerCase());
          return (
            <Card key={m.id} className="p-4 shadow-card hover:shadow-elegant transition group">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-bold">
                  {initialsFromName(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role_title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{m.profiles?.email ?? "Sem e-mail vinculado"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{directorateLabel(dir)}</Badge>
                    {m.area && <Badge variant="outline" className="text-[10px]">{m.area}</Badge>}
                    <Badge className={m.active ? "" : "bg-muted text-muted-foreground"}>
                      {m.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {isDuplicate && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Possível duplicado
                      </Badge>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
                    <button className="p-1 hover:text-primary" onClick={() => { setEditing(m); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:text-destructive" onClick={() => setDeleting(m)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            Nenhum membro encontrado com os filtros atuais.
          </div>
        )}
      </div>

      <MemberFormDialog open={open} onOpenChange={setOpen} member={editing} onSaved={load} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.profiles?.email ? `Cadastro vinculado ao e-mail ${deleting.profiles.email}. ` : ""}
              Todos os registros semanais deste membro também serão apagados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
