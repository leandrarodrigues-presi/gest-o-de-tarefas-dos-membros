import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import lignumLogo from "@/assets/lignum.png.asset.json";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const recoveryHash = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    supabase.auth.getSession().then(({ data }) => setReady(recoveryHash || Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha.");
      return;
    }
    await supabase.auth.signOut();
    toast.success("Senha redefinida. Entre novamente.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <Card className="w-full max-w-md p-6 shadow-elegant">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary"><img src={lignumLogo.url} alt="Lignum" className="h-7 w-7 object-contain invert" /></div>
          <div><h1 className="text-xl font-bold">Redefinir senha</h1><p className="text-sm text-muted-foreground">Crie uma nova senha de acesso.</p></div>
        </div>
        {!ready ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar nova senha</Label><Input id="confirm-password" type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Atualizando..." : "Salvar nova senha"}</Button>
          </form>
        )}
        <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => navigate({ to: "/auth" })}>Voltar ao login</Button>
      </Card>
    </main>
  );
}