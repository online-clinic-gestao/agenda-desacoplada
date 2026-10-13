import { MAX_DAYS_AHEAD } from "./components/Scheduler/schedule";

// OLC-1028: faixa etaria que o medico atende no autoagendamento. Espelha a regra do backend
// (`agenda/util.py` no consultorio): anos completos, limites inclusivos, `null` = sem limite
// daquele lado. Quem DECIDE e' o `appointment/create`, na data da consulta; aqui so'
// antecipamos a recusa para o paciente nao escolher horario a toa.

export type AgeRange = { min: number | null; max: number | null };

// "AAAA-MM-DD" (valor do <input type="date">) -> data local, sem fuso.
export const parseBirthDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null; // 31/02, 2000-13-01...
  }
  return date;
};

// Anos completos em `on`. Nascido em 29/02 completa ano em 28/02 nos anos nao bissextos,
// como o `relativedelta` do backend.
export const ageOn = (birth: Date, on: Date): number => {
  let age = on.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(on.getFullYear(), birth.getMonth(), birth.getDate());
  if (birthdayThisYear.getMonth() !== birth.getMonth()) {
    birthdayThisYear.setDate(0); // 29/02 em ano nao bissexto -> 28/02
  }
  const onDay = new Date(on.getFullYear(), on.getMonth(), on.getDate());
  if (onDay < birthdayThisYear) age -= 1;
  return age;
};

export const isWithinAgeRange = (age: number, range: AgeRange): boolean =>
  (range.min === null || age >= range.min) && (range.max === null || age <= range.max);

export const hasAgeRange = (range: AgeRange): boolean =>
  range.min !== null || range.max !== null;

// O mesmo texto do backend (`mensagem_faixa_etaria`).
export const ageRangeMessage = (range: AgeRange): string => {
  const { min, max } = range;
  let faixa: string;
  if (min !== null && max !== null) {
    faixa = min === max ? `com ${min} anos` : `de ${min} a ${max} anos`;
  } else if (min !== null) {
    faixa = `a partir de ${min} anos`;
  } else {
    faixa = `até ${max} anos`;
  }
  return `Este profissional atende pacientes ${faixa}. Para este caso, entre em contato com a clínica.`;
};

// Ja na etapa "Dados Pessoais", antes de o paciente escolher o horario: so' recusa quando
// NENHUM dia que a agenda oferece (hoje ate hoje + MAX_DAYS_AHEAD) cabe na faixa. Quem faz
// aniversario no meio da janela segue, e a conferencia exata fica para a data escolhida.
export const isOutOfRangeForWholeWindow = (
  birth: Date,
  range: AgeRange,
  today: Date
): boolean => {
  const lastDay = new Date(today);
  lastDay.setDate(lastDay.getDate() + MAX_DAYS_AHEAD);
  const youngest = ageOn(birth, today);
  const oldest = ageOn(birth, lastDay);
  if (range.max !== null && youngest > range.max) return true;
  if (range.min !== null && oldest < range.min) return true;
  return false;
};

// Recusa do backend ligada aos dados pessoais (nascimento/faixa etaria): o paciente volta
// para a etapa "Dados Pessoais", e nao para a do horario. O backend marca com
// `field: "birth_date"`; o texto fica como reserva.
export const isPersonalDataRejection = (
  data: { message?: unknown; field?: unknown } | undefined
): boolean => {
  if (!data) return false;
  if (data.field === "birth_date") return true;
  const message = typeof data.message === "string" ? data.message : "";
  return message.startsWith("Este profissional atende pacientes");
};
