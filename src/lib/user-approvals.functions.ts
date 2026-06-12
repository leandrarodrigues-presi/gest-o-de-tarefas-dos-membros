import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const approvalSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
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

    const { data: updatedRole, error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: data.role })
      .eq("user_id", data.userId)
      .eq("role", "pending")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedRole) throw new Error("Este cadastro já foi processado");

    if (data.role === "member") {
      const { error: memberError } = await supabaseAdmin.from("members").upsert(
        {
          user_id: data.userId,
          name: profile.full_name || profile.email || "Novo membro",
          role_title: "Membro",
          active: true,
        },
        { onConflict: "user_id" },
      );
      if (memberError) throw memberError;
    }

    return { ok: true };
  });