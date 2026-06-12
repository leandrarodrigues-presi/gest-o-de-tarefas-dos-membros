import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { approveUser } from "@/lib/user-approvals.functions";

export const Route = createFileRoute("/_authenticated/aprovacoes")({ component: Approvals });

interface PendingUser { user_id: string; profiles: { email: string | null; full_name: string | null } | null; }

function Approvals() {
  const { isAdmin, roleLoading } = useAuth();
  const navigate = useNavigate();
  const approve = useServerFn(approveUser);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [roles, setRoles] = useState<Record<string, "admin" | "member">>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const { data: pending, error } = await supabase.from("user_roles").select("user_id").eq("role", "pending").order("created_at");
    if (error) {
      toast.error("Não foi possível carregar os cadastros pendentes.");
      return;
    }
    const ids = pending?.map((item) => item.user_id) ?? [];
    if (ids.length === 0) {
      setUsers([]);
      return;
    }
    const { data: profiles } = await supabase.from("profiles").select("id,email,full_name").in("id", ids);
    setUsers(ids.map((userId) => ({ user_id: userId, profiles: profiles?.find((profile) => profile.id === userId) ?? null })));
  }

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/painel", replace: true });
  }, [isAdmin, roleLoading, navigate]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  async function handleApprove(userId: string) {
    setSaving(userId);
    try {
      await approve({ data: { userId, role: roles[userId] ?? "member" } });
      toast.success("Cadastro aprovado com sucesso.");
      await load();
    } catch {
      toast.error("Não foi possível aprovar este cadastro.");
    } finally {
      setSaving(null);
    }
  }

  if (roleLoading || !isAdmin) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Aprovação de cadastros</h1>
        <p className="text-sm text-muted-foreground">Defina o nível de acesso antes de liberar cada usuário.</p>
      </div>
      <div className="grid gap-4">
        {users.map((item) => (
          <Card key={item.user_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><UserCheck className="h-5 w-5" /></div>
              <div><p className="font-semibold">{item.profiles?.full_name || "Usuário sem nome"}</p><p className="text-sm text-muted-foreground">{item.profiles?.email}</p></div>
            </div>
            <div className="w-full space-y-1.5 sm:w-44">
              <Label>Nível de acesso</Label>
              <Select value={roles[item.user_id] ?? "member"} onValueChange={(value: "admin" | "member") => setRoles((current) => ({ ...current, [item.user_id]: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="member">Membro</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleApprove(item.user_id)} disabled={saving === item.user_id}>{saving === item.user_id ? "Aprovando..." : "Aprovar"}</Button>
          </Card>
        ))}
        {users.length === 0 && <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">Nenhum cadastro aguardando aprovação.</div>}
      </div>
    </div>
  );
}