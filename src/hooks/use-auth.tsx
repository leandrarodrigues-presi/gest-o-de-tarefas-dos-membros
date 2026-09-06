import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthMember {
  id: string;
  name: string;
  cargo: string | null;
  directorate: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: "admin" | "member" | "pending" | null;
  isAdmin: boolean;
  /** Registro do membro vinculado ao usuário logado (cargo/diretoria). */
  member: AuthMember | null;
  roleLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  isAdmin: false,
  member: null,
  roleLoading: true,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "member" | "pending" | null>(null);
  const [member, setMember] = useState<AuthMember | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccess(userId: string) {
      const [{ data: roleRow }, { data: memberRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("members").select("id,name,cargo,directorate").eq("user_id", userId).maybeSingle(),
      ]);
      setRole(roleRow?.role ?? null);
      setMember((memberRow as AuthMember | null) ?? null);
      setRoleLoading(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setRoleLoading(true);
        setTimeout(() => void loadAccess(s.user.id), 0);
      } else {
        setRole(null);
        setMember(null);
        setRoleLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) {
        setRoleLoading(true);
        void loadAccess(data.session.user.id);
      } else {
        setRoleLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        isAdmin: role === "admin",
        member,
        roleLoading,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
