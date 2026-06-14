import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const approvalSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
  directorate: z.enum(["presidencia", "gente_gestao", "projetos", "publicidade"]).nullable(),
});

export const approveUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => approvalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,email")
      .eq("id", data.userId)
      .single();
    if (profileError || !profile) throw new Error("Cadastro não encontrado");

    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover o próprio acesso administrativo");
    }

    const { data: updatedRole, error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: data.role })
      .eq("user_id", data.userId)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedRole) throw new Error("Nível de acesso não encontrado");

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ directorate: data.directorate })
      .eq("id", data.userId);
    if (profileUpdateError) throw profileUpdateError;

    const { error: memberError } = await supabaseAdmin.from("members").upsert(
      {
        user_id: data.userId,
        name: profile.full_name || profile.email || "Novo membro",
        role_title: data.role === "admin" ? "Diretor(a)" : "Membro",
        active: true,
      },
      { onConflict: "user_id" },
    );
    if (memberError) throw memberError;

    return { ok: true };
  });