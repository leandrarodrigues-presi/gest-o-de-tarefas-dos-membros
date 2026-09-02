export const CARGOS = [
  { value: "administrador", label: "Administrador" },
  { value: "diretor", label: "Diretor" },
  { value: "assessor", label: "Assessor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "membro", label: "Membro" },
] as const;

export type Cargo = (typeof CARGOS)[number]["value"];

export function isCargo(value: string): value is Cargo {
  return CARGOS.some((item) => item.value === value);
}

export function cargoLabel(value: string | null | undefined) {
  return CARGOS.find((item) => item.value === value)?.label ?? "Membro";
}
