import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, BarChart3, LogOut, PieChart, UserCheck, Building2, Crown, HeartHandshake, FolderKanban, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import lignumLogo from "@/assets/lignum.png.asset.json";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", Icon: PieChart, adminOnly: false },
  { to: "/painel", label: "Atividades", Icon: LayoutDashboard, adminOnly: false },
  { to: "/equipe", label: "Equipe", Icon: Users, adminOnly: true },
  { to: "/aprovacoes", label: "Aprovações", Icon: UserCheck, adminOnly: true },
  { to: "/relatorios", label: "Relatórios", Icon: BarChart3, adminOnly: false },
] as const;

const DIRECTORATE_NAV = [
  { to: "/diretorias/presidencia", label: "Presidência", Icon: Crown },
  { to: "/diretorias/gente_gestao", label: "Gente e Gestão", Icon: HeartHandshake },
  { to: "/diretorias/projetos", label: "Projetos", Icon: FolderKanban },
  { to: "/diretorias/publicidade", label: "Publicidade", Icon: Megaphone },
] as const;

type SidebarPath = (typeof NAV)[number]["to"] | (typeof DIRECTORATE_NAV)[number]["to"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-background lg:flex">
      {isAdmin && (
        <aside className="no-print hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
          <Link to="/dashboard" className="flex h-16 items-center gap-2.5 border-b px-5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant"><img src={lignumLogo.url} alt="Lignum" className="h-6 w-6 object-contain invert" /></div>
            <div className="leading-tight"><div className="text-sm font-bold">TaskTracker</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Lignum Ambiental Jr.</div></div>
          </Link>
          <div className="flex-1 space-y-6 p-3">
            <nav className="space-y-1">
              {NAV.map(({ to, label, Icon }) => <SidebarLink key={to} to={to} label={label} Icon={Icon} active={loc.pathname === to} />)}
            </nav>
            <div>
              <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Building2 className="h-3.5 w-3.5" />Diretorias</div>
              <nav className="space-y-1">{DIRECTORATE_NAV.map(({ to, label, Icon }) => <SidebarLink key={to} to={to} label={label} Icon={Icon} active={loc.pathname === to} />)}</nav>
            </div>
          </div>
        </aside>
      )}
      <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to={isAdmin ? "/dashboard" : "/painel"} className={`items-center gap-2.5 ${isAdmin ? "flex lg:hidden" : "flex"}`}>
            <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-elegant">
              <img src={lignumLogo.url} alt="" className="h-6 w-6 object-contain invert" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">TaskTracker</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Lignum Ambiental Jr.</div>
            </div>
          </Link>
          <nav className={`items-center gap-1 ${isAdmin ? "flex lg:hidden" : "flex"}`}>
            {NAV.filter((item) => isAdmin || !item.adminOnly).map(({ to, label, Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-elegant"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs font-medium">{user?.email}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {isAdmin ? "Administrador" : "Membro"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, Icon, active }: { to: SidebarPath; label: string; Icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return <Link to={to} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Icon className="h-4 w-4" /><span>{label}</span></Link>;
}
