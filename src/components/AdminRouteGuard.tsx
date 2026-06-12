import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { isAdmin, roleLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/painel", replace: true });
  }, [isAdmin, navigate, roleLoading]);

  if (roleLoading || !isAdmin) return null;
  return children;
}