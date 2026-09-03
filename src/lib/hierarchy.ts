import type { Cargo } from "@/lib/cargos";

/** Quem cada cargo pode receber como destinatário de uma delegação (mesma diretoria). */
export const DELEGATION_TARGETS: Record<Cargo, Cargo[]> = {
  administrador: ["diretor", "coordenador", "assessor", "trainee"],
  diretor: ["coordenador", "assessor", "trainee"],
  coordenador: ["assessor", "trainee"],
  assessor: ["trainee"],
  trainee: [],
};

/** Cargos com visão ampliada do sistema (todas as abas e todas as diretorias). */
export function hasFullVisibility(cargo?: string | null) {
  return cargo === "administrador" || cargo === "diretor";
}

export function canDelegateTasks(cargo?: string | null) {
  if (!cargo) return false;
  return (DELEGATION_TARGETS[cargo as Cargo] ?? []).length > 0;
}

interface Party {
  cargo?: string | null;
  directorate?: string | null;
  active?: boolean;
}

function normalizeDirectorate(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Espelha exatamente a função `public.can_delegate_task` do banco.
 * O frontend usa apenas para filtrar a interface — a autorização real é do banco.
 */
export function canDelegateTo(assigner: Party | null | undefined, target: Party | null | undefined, isSystemAdmin = false) {
  if (isSystemAdmin) return Boolean(target?.active ?? true);
  if (!assigner?.cargo || !target?.cargo) return false;
  if (target.active === false) return false;

  const assignerDir = normalizeDirectorate(assigner.directorate);
  const targetDir = normalizeDirectorate(target.directorate);
  if (!assignerDir || !targetDir || assignerDir !== targetDir) return false;

  return (DELEGATION_TARGETS[assigner.cargo as Cargo] ?? []).includes(target.cargo as Cargo);
}
