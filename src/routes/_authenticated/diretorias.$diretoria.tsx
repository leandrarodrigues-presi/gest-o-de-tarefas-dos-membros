import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { TaskAssignmentDialog } from "@/components/TaskAssignmentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { directorateLabel, isDirectorate } from "@/lib/directorates";
import { initialsFromName } from "@/lib/week";

export const Route = createFileRoute("/_authenticated/diretorias/$diretoria")({
  component: () => <AdminRouteGuard><DirectoratePage /></AdminRouteGuard>,
});

interface DirectorateMember { id: string; name: string; role_title: string; active: boolean; user_id: string | null; }

function DirectoratePage() {
  const { diretoria } = Route.useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState<DirectorateMember[]>([]);
  const [selected, setSelected] = useState<DirectorateMember | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!isDirectorate(diretoria)) return;
    setLoading(true);
    const { data: profiles, error } = await supabase.from("profiles").select("id").eq("directorate", diretoria);
    if (error) {
      toast.error("Não foi possível carregar esta diretoria.");
      setLoading(false);
      return;
    }
    const ids = profiles?.map((profile) => profile.id) ?? [];
    if (ids.length === 0) {
      setMembers([]);
    } else {
      const { data } = await supabase.from("members").select("id,name,role_title,active,user_id").in("user_id", ids).order("name");
      setMembers((data as DirectorateMember[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!isDirectorate(diretoria)) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    void load();
  }, [diretoria]);

  if (!isDirectorate(diretoria)) return null;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Diretoria</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{directorateLabel(diretoria)}</h1>
        <p className="text-sm text-muted-foreground">Visualize a equipe da área e delegue novas atividades.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id} className="p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">{initialsFromName(member.name)}</div>
              <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{member.name}</h2><p className="text-xs text-muted-foreground">{member.role_title}</p><Badge variant={member.active ? "secondary" : "outline"} className="mt-2">{member.active ? "Ativo" : "Inativo"}</Badge></div>
            </div>
            <Button className="mt-4 w-full" disabled={!member.active} onClick={() => setSelected(member)}><ClipboardPlus className="mr-2 h-4 w-4" />Atribuir tarefa</Button>
          </Card>
        ))}
      </div>
      {!loading && members.length === 0 && <div className="grid place-items-center rounded-xl border border-dashed py-14 text-center text-muted-foreground"><Users className="mb-3 h-8 w-8" /><p>Nenhum membro vinculado a esta diretoria.</p><p className="text-xs">A associação pode ser feita em Aprovações e Usuários.</p></div>}
      {loading && <div className="py-14 text-center text-muted-foreground">Carregando equipe...</div>}
      <TaskAssignmentDialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} member={selected} onSaved={load} />
    </div>
  );
}