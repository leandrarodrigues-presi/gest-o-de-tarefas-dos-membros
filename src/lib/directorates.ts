export const DIRECTORATES = [
  { value: "presidencia", label: "Presidência" },
  { value: "gente_gestao", label: "Gente e Gestão" },
  { value: "projetos", label: "Projetos" },
  { value: "publicidade", label: "Publicidade" },
] as const;

export type Directorate = (typeof DIRECTORATES)[number]["value"];

export function isDirectorate(value: string): value is Directorate {
  return DIRECTORATES.some((item) => item.value === value);
}

export function directorateLabel(value: string | null | undefined) {
  return DIRECTORATES.find((item) => item.value === value)?.label ?? "Sem diretoria";
}