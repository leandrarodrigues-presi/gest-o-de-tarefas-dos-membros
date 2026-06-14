import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { approveUser } from "@/lib/user-approvals.functions";
import { DIRECTORATES, type Directorate, directorateLabel } from "@/lib/directorates";

export const Route = createFileRoute("/_authenticated/aprovacoes")({ component: Approvals });

interface ManagedUser { user_id: string; currentRole: "admin" | "member" | "pending"; profiles: { email: string | null; full_name: string | null; directorate: Directorate | null } | null; }

function Approvals() {
  const { isAdmin, roleLoading } = useAuth();
  const navigate = useNavigate();
  const approve = useServerFn(approveUser);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Record<string, "admin" | "member">>({});
  const [directorates, setDirectorates] = useState<Record<string, Directorate | "none">>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const { data: registered, error } = await supabase.from("user_roles").select("user_id,role").order("created_at");
    if (error) {
      toast.error("Não foi possível carregar os cadastros pendentes.");
      return;
    }
    const ids = registered?.map((item) => item.user_id) ?? [];
    if (ids.length === 0) {
      setUsers([]);
      return;
    }
    const { data: profiles } = await supabase.from("profiles").select("id,email,full_name,directorate").in("id", ids);
    const nextUsers = (registered ?? []).map((item) => ({ user_id: item.user_id, currentRole: item.role, profiles: profiles?.find((profile) => profile.id === item.user_id) ?? null })) as ManagedUser[];
    setUsers(nextUsers);
    setRoles(Object.fromEntries(nextUsers.map((item) => [item.user_id, item.currentRole === "admin" ? "admin" : "member"])));
    setDirectorates(Object.fromEntries(nextUsers.map((item) => [item.user_id, item.profiles?.directorate ?? "none"])));
  }

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/painel", replace: true });
  }, [isAdmin, roleLoading, navigate]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  async function handleApprove(userId: string) {
    setSaving(userId);
    try {
      await approve({ data: { userId, role: roles[userId] ?? "member", directorate: directorates[userId] === "none" ? null : directorates[userId] ?? null } });
      toast.success("Acesso atualizado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar este usuário.");
    } finally {
      setSaving(null);
    }
  }

  if (roleLoading || !isAdmin) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Aprovações e Usuários</h1>
        <p className="text-sm text-muted-foreground">Aprove cadastros e altere o nível de acesso ou a diretoria dos usuários.</p>
      </div>
      <div className="grid gap-4">
        {users.map((item) => (
          <Card key={item.user_id} className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_190px_auto] lg:items-end">
            <div className="flex flex-1 items-center gap-3">
               <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">{item.currentRole === "pending" ? <UserCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div>
               <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.profiles?.full_name || "Usuário sem nome"}</p>{item.currentRole === "pending" && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Pendente</span>}</div><p className="text-sm text-muted-foreground">{item.profiles?.email}</p><p className="text-xs text-muted-foreground">{directorateLabel(item.profiles?.directorate)}</p></div>
            </div>
            <div className="w-full space-y-1.5 sm:w-44">
              <Label>Nível de acesso</Label>
              <Select value={roles[item.user_id] ?? "member"} onValueChange={(value: "admin" | "member") => setRoles((current) => ({ ...current, [item.user_id]: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="member">Membro</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Diretoria</Label>
              <Select value={directorates[item.user_id] ?? "none"} onValueChange={(value: Directorate | "none") => setDirectorates((current) => ({ ...current, [item.user_id]: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sem diretoria</SelectItem>{DIRECTORATES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleApprove(item.user_id)} disabled={saving === item.user_id}>{saving === item.user_id ? "Salvando..." : item.currentRole === "pending" ? "Aprovar" : "Salvar"}</Button>
          </Card>
        ))}
        {users.length === 0 && <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">Nenhum usuário cadastrado.</div>}
      </div>
    </div>
  );
}