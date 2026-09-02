import { useState, type FormEvent, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIRECTORATES } from "@/lib/directorates";
import { CARGOS, type Cargo } from "@/lib/cargos";

export interface Member {
  id?: string;
  name: string;
  role_title: string;
  area: string | null;
  directorate?: string | null;
  cargo?: Cargo;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member?: Member | null;
  onSaved: () => void;
}

const EMPTY: Member = { name: "", role_title: "", area: "", directorate: null, cargo: "membro", active: true };

export function MemberFormDialog({ open, onOpenChange, member, onSaved }: Props) {
  const [data, setData] = useState<Member>(member ?? EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setData(member ?? EMPTY); }, [member, open]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: data.name,
      role_title: data.role_title,
      area: data.area || null,
      directorate: data.directorate || null,
      cargo: data.cargo ?? "membro",
      active: data.active,
    };
    const { error } = member?.id
      ? await supabase.from("members").update(payload).eq("id", member.id)
      : await supabase.from("members").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(member?.id ? "Membro atualizado" : "Membro adicionado");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member?.id ? "Editar membro" : "Novo membro"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Nome</Label>
            <Input id="m-name" required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-role">Cargo</Label>
            <Input id="m-role" required placeholder="Ex: Assessor de Projetos"
              value={data.role_title} onChange={(e) => setData({ ...data, role_title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-area">Área</Label>
            <Input id="m-area" placeholder="Ex: Projetos, Gestão, Comunicação..."
              value={data.area ?? ""} onChange={(e) => setData({ ...data, area: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={data.cargo ?? "membro"} onValueChange={(v) => setData({ ...data, cargo: v as Cargo })}>
              <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Diretoria</Label>
            <Select value={data.directorate ?? "none"} onValueChange={(v) => setData({ ...data, directorate: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a diretoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem diretoria</SelectItem>
                {DIRECTORATES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Membro ativo</Label>
              <p className="text-xs text-muted-foreground">Inativos não aparecem no painel semanal.</p>
            </div>
            <Switch checked={data.active} onCheckedChange={(v) => setData({ ...data, active: v })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
