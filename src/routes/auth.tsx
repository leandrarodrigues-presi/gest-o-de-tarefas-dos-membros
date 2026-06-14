import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import lignumLogo from "@/assets/lignum.png.asset.json";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, roleLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    if (!session || roleLoading || role === "pending" || role === null) return;
    navigate({ to: role === "admin" ? "/dashboard" : "/painel", replace: true });
  }, [session, navigate, role, roleLoading]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { data: access } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (access?.role === "pending" || !access) {
      await supabase.auth.signOut();
      toast.info("Seu cadastro está aguardando aprovação de um administrador.");
      return;
    }
    navigate({ to: access.role === "admin" ? "/dashboard" : "/painel", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada! Após confirmar o e-mail, aguarde a aprovação de um administrador.");
  }

  async function requestPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setRecoveryLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecoveryLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail de recuperação.");
      return;
    }
    toast.success("Se o e-mail estiver cadastrado, você receberá o link de recuperação.");
    setForgotOpen(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <img src={lignumLogo.url} alt="Lignum" className="h-8 w-8 object-contain invert" />
          </div>
          <div>
            <div className="text-lg font-bold">Lignum Ambiental Jr.</div>
            <div className="text-xs opacity-80">TaskTracker · Gestão de Atividades</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Acompanhe a semana da sua equipe em um só lugar.
          </h1>
          <p className="opacity-90">
            Tarefas, reuniões e prospecção dos consultores — com relatório semanal pronto para impressão.
          </p>
        </div>
        <div className="text-xs opacity-75">© Lignum Consultoria Ambiental Jr.</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img src={lignumLogo.url} alt="Lignum" className="h-10 w-10" />
            <span className="font-bold text-lg">Lignum TaskTracker</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Bem-vindo</h2>
          <p className="text-sm text-muted-foreground mb-6">Acesse o sistema de gestão da EJ.</p>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="e1">E-mail</Label>
                  <Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label htmlFor="p1">Senha</Label><Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => { setRecoveryEmail(email); setForgotOpen(true); }}>Esqueci minha senha</Button></div>
                  <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="n2">Nome completo</Label>
                  <Input id="n2" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e2">E-mail</Label>
                  <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p2">Senha</Label>
                  <Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Novos cadastros precisam ser aprovados por um administrador.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Recuperar senha</DialogTitle><DialogDescription>Informe seu e-mail para receber um link seguro de redefinição.</DialogDescription></DialogHeader>
          <form onSubmit={requestPasswordReset} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="recovery-email">E-mail</Label><Input id="recovery-email" type="email" required value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancelar</Button><Button type="submit" disabled={recoveryLoading}>{recoveryLoading ? "Enviando..." : "Enviar link"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
