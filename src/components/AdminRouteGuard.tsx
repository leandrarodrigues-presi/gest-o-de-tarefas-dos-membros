import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { canDelegateTasks } from "@/lib/hierarchy";

interface Props {
  children: ReactNode;
  /** Permite acesso também a cargos com autoridade de delegação (diretor, coordenador, assessor). */
  allowDelegators?: boolean;
}

export function AdminRouteGuard({ children, allowDelegators = false }: Props) {
  const { isAdmin, member, roleLoading } = useAuth();
  const navigate = useNavigate();

  const allowed = isAdmin || (allowDelegators && canDelegateTasks(member?.cargo));

  useEffect(() => {
    if (!roleLoading && !allowed) navigate({ to: "/painel", replace: true });
  }, [allowed, navigate, roleLoading]);

  if (roleLoading || !allowed) return null;
  return children;
}
