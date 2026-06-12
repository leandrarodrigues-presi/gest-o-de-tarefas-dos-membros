import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const { session, loading, role, roleLoading } = useAuth();
  useEffect(() => {
    if (loading || roleLoading) return;
    if (!session || role === "pending" || role === null) navigate({ to: "/auth", replace: true });
    else navigate({ to: role === "admin" ? "/dashboard" : "/painel", replace: true });
  }, [session, loading, navigate, role, roleLoading]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
