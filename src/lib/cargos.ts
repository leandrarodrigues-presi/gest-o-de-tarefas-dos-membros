export const CARGOS = [
  { value: "administrador", label: "Administrador" },
  { value: "diretor", label: "Diretor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "assessor", label: "Assessor" },
  { value: "trainee", label: "Trainee" },
] as const;

export const DEFAULT_CARGO = "trainee" as const;

export type Cargo = (typeof CARGOS)[number]["value"];

export function isCargo(value: string): value is Cargo {
  return CARGOS.some((item) => item.value === value);
}

export function cargoLabel(value: string | null | undefined) {
  return CARGOS.find((item) => item.value === value)?.label ?? "Membro";
}
