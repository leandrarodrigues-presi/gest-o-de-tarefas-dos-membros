import { useEffect, useState, type FormEvent } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; name: string; cargo?: string | null; directorate?: string | null; active?: boolean } | null;
  task?: { id: string; title: string; description: string; due_date: string; complexity: "baixo" | "medio" | "alto" } | null;
  onSaved: () => void;
}

export function TaskAssignmentDialog({ open, onOpenChange, member, task, onSaved }: Props) {
  const { user, isAdmin, member: authMember } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [complexity, setComplexity] = useState<"baixo" | "medio" | "alto">("medio");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.due_date ? new Date(`${task.due_date}T12:00:00`) : undefined);
    setComplexity(task?.complexity ?? "medio");
  }, [open, member?.id, task?.id, task?.title, task?.description, task?.due_date, task?.complexity]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!member || !user || !dueDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    // Validação de interface: a autorização definitiva é aplicada pelo banco (RLS).
    if (!task && !canDelegateTo(authMember, member, isAdmin)) {
      toast.error("Você não tem autoridade para atribuir tarefas a este membro.");
      return;
    }
    setSaving(true);
    const payload = { member_id: member.id, title: title.trim(), description: description.trim(), due_date: format(dueDate, "yyyy-MM-dd"), complexity, assigned_by: user.id };
    const { error } = task
      ? await supabase.from("delegated_tasks").update(payload).eq("id", task.id)
      : await supabase.from("delegated_tasks").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível atribuir a tarefa.");
      return;
    }
    toast.success(task ? "Tarefa atualizada com sucesso." : "Tarefa atribuída com sucesso.");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{task ? "Editar tarefa" : `Atribuir tarefa a ${member?.name ?? "membro"}`}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea id="task-description" required maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} className="pointer-events-auto p-3" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Complexidade</Label>
              <Select value={complexity} onValueChange={(value: "baixo" | "medio" | "alto") => setComplexity(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : task ? "Salvar alterações" : "Atribuir tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}