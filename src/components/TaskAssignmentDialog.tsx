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
  member: { id: string; name: string } | null;
  onSaved: () => void;
}

export function TaskAssignmentDialog({ open, onOpenChange, member, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [complexity, setComplexity] = useState<"baixo" | "medio" | "alto">("medio");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setDueDate(undefined);
    setComplexity("medio");
  }, [open, member?.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!member || !user || !dueDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("delegated_tasks").insert({
      member_id: member.id,
      title: title.trim(),
      description: description.trim(),
      due_date: format(dueDate, "yyyy-MM-dd"),
      complexity,
      assigned_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível atribuir a tarefa.");
      return;
    }
    toast.success("Tarefa atribuída com sucesso.");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Atribuir tarefa a {member?.name}</DialogTitle></DialogHeader>
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
            <Button type="submit" disabled={saving}>{saving ? "Atribuindo..." : "Atribuir tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}