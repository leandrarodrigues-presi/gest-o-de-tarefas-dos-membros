import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDM, addDays, toISODate } from "@/lib/week";
import { useAuth } from "@/hooks/use-auth";

export interface WeekEntry {
  id?: string;
  member_id: string;
  week_start: string;
  tasks: string[];
  meetings: string[];
  prospection: string;
  observations: string;
  hours?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberName: string;
  weekStart: Date;
  entry: WeekEntry;
  onSaved: () => void;
  readOnly?: boolean;
  canDelete?: boolean;
}

export function WeekEntryDialog({ open, onOpenChange, memberName, weekStart, entry, onSaved, readOnly = false, canDelete = false }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<string[]>(entry.tasks.length ? entry.tasks : [""]);
  const [meetings, setMeetings] = useState<string[]>(entry.meetings.length ? entry.meetings : [""]);
  const [prospection, setProspection] = useState(entry.prospection || "");
  const [observations, setObservations] = useState(entry.observations || "");
  const [hours, setHours] = useState(String(entry.hours ?? 0));
  const [saving, setSaving] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    const payload = {
      member_id: entry.member_id,
      week_start: toISODate(weekStart),
      tasks: tasks.map((t) => t.trim()).filter(Boolean),
      meetings: meetings.map((m) => m.trim()).filter(Boolean),
      prospection: prospection.trim(),
      observations: observations.trim(),
      hours: Number(hours.replace(",", ".")) || 0,
      created_by: user?.id,
    };
    const { error } = await supabase
      .from("weekly_entries")
      .upsert(payload, { onConflict: "member_id,week_start" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Registro salvo");
    onSaved();
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!entry.id) return;
    setSaving(true);
    const { error } = await supabase.from("weekly_entries").delete().eq("id", entry.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Registro excluído");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {memberName} — {formatDM(weekStart)} a {formatDM(weekEnd)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5">
          {readOnly && <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Registro disponível apenas para consulta.</div>}
          <ListField label="Tarefas" items={tasks} setItems={setTasks} placeholder="Descreva a tarefa realizada..." readOnly={readOnly} />
          <ListField label="Reuniões" items={meetings} setItems={setMeetings} placeholder="Descreva a reunião..." readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="hours">Horas registradas na semana</Label>
            <Input
              id="hours"
              type="number"
              min="0"
              step="0.5"
              value={hours}
              readOnly={readOnly}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Ex: 8"
            />
          </div>
          <div className="space-y-2">
            <Label>Prospecção</Label>
            <Textarea
              value={prospection}
              readOnly={readOnly}
              onChange={(e) => setProspection(e.target.value)}
              placeholder="Ex: 5 leads contactados, 2 propostas enviadas..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observations}
              readOnly={readOnly}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {canDelete && entry.id && !readOnly ? (
              <Button type="button" variant="outline" onClick={handleDelete} disabled={saving} className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? "Fechar" : "Cancelar"}</Button>
              {!readOnly && <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ListField({
  label, items, setItems, placeholder, readOnly,
}: { label: string; items: string[]; setItems: (s: string[]) => void; placeholder: string; readOnly: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {!readOnly && <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, ""])} className="h-7 px-2 text-xs text-primary"><Plus className="h-3.5 w-3.5" /> Adicionar</Button>}
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={it}
              readOnly={readOnly}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                setItems(next);
              }}
            />
            {!readOnly && items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
