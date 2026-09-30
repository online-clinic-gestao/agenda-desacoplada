import { Appointments, Procedure, WorkingHours } from "../../types";

// OLC-1364: as contas da grade saem do `Scheduler` para funcoes PURAS -- sem `setState` e
// sem mutar a data recebida --, para que a abertura da tela e as setas usem exatamente a
// mesma busca, e para que possam ser testadas sem renderizar o componente.

export type WorkingDaysMap = { [weekday: number]: WorkingHours };

export type SlotRules = {
  workingDaysMap: WorkingDaysMap;
  appointments: Appointments[];
  procedure: Procedure | undefined;
  // OLC-1070: quantos horarios oferecer por dia. `undefined`/`null`/<=0 = sem limite.
  maxSlotsPerDay?: number | null;
  // "Agora". So' os testes informam; na tela e' sempre o relogio.
  now?: Date;
};

// Limite de dias que o `generateDays` percorre procurando 5 dias com horario.
const GENERATE_DAYS_MAX_LOOPS = 50;

export const buildWorkingDaysMap = (workingHours: WorkingHours[]): WorkingDaysMap =>
  workingHours.reduce((acc: WorkingDaysMap, curr) => {
    acc[curr.weekday] = curr;
    return acc;
  }, {});

export const getSlots = (day: Date, rules: SlotRules): Date[] => {
  const { workingDaysMap, appointments, procedure, maxSlotsPerDay } = rules;
  const now = rules.now ?? new Date();
  const offset = now.getTimezoneOffset();
  // Create a copy to avoid mutating the original date
  const dayForCalculation = new Date(day);
  dayForCalculation.setMinutes(dayForCalculation.getMinutes() - offset);
  const timeInterval = workingDaysMap[dayForCalculation.getDay()];
  if (!timeInterval || !procedure) {
    return [];
  }
  // get day in format YYYY-MM-DD
  const date = dayForCalculation.toISOString().split("T")[0];
  const start = new Date(`${date}T${timeInterval.start}`);
  const end = new Date(`${date}T${timeInterval.end}`);
  const slots: Date[] = [];
  // OLC-1070: o horario tem de CABER inteiro no expediente, e nao so' comecar antes do
  // fim. E' a mesma conta do backend (`slots_livres`, `slot_inicio + passo <= fim`),
  // que confere a gravacao: com `moving < end` a tela oferecia, p.ex., 11:45 num
  // expediente ate 12:00 com procedimento de 45min, e a rota recusava.
  for (
    let moving = new Date(start);
    moving.getTime() + procedure.time * 60000 <= end.getTime();
    moving.setMinutes(moving.getMinutes() + procedure.time)
  ) {
    if (moving < now) continue;
    if (
      !appointments.some((appointment) => {
        const appointmentStart = new Date(appointment.start);
        const appointmentEnd = new Date(appointment.end);
        return (
          (moving >= appointmentStart && moving < appointmentEnd) ||
          (moving < appointmentStart &&
            new Date(moving.getTime() + procedure.time * 60000) >
              appointmentStart)
        );
      })
    )
      slots.push(new Date(moving));
  }

  // OLC-1070: a clinica pode limitar quantos horarios o paciente ve por dia, para os
  // agendamentos ficarem colados e o medico nao ficar ocioso entre um e outro.
  //
  // O corte e' o ULTIMO passo, sobre a lista ja filtrada: sao os N primeiros horarios
  // LIVRES do dia. Cortar antes de remover os ocupados ofereceria horario indisponivel.
  //
  // Aqui, e nao no backend, porque a contagem depende da duracao do procedimento que o
  // paciente escolheu (`procedure.time`) -- o `one-time-token` responde antes dessa
  // escolha e so consegue delimitar uma JANELA de tempo. Com o corte aqui sao sempre N,
  // qualquer que seja a duracao.
  //
  // Sem o parametro (`undefined`/`null`/<=0) nada e' cortado: a clinica que nao pediu o
  // recurso continua vendo a grade inteira, byte a byte como antes.
  if (maxSlotsPerDay != null && maxSlotsPerDay > 0)
    return slots.slice(0, maxSlotsPerDay);

  return slots;
};

// Primeira data com horario a partir de `from` (inclusive), ate o ultimo dia do mes de
// `from` + 2. `null` se nao houver.
export const findNextAvailableDate = (from: Date, rules: SlotRules): Date | null => {
  const date = new Date(from);
  const maxDate = new Date(date.getFullYear(), date.getMonth() + 3, 0);
  while (date <= maxDate) {
    if (getSlots(date, rules).length > 0) return date;
    date.setDate(date.getDate() + 1);
  }
  return null;
};

// Ultima data com horario ate `from` (inclusive), voltando ate o dia 1 do mes de `from` - 3.
// `null` se nao houver.
export const findPreviousAvailableDate = (from: Date, rules: SlotRules): Date | null => {
  const date = new Date(from);
  const minDate = new Date(date.getFullYear(), date.getMonth() - 3, 1);
  while (date >= minDate) {
    if (getSlots(date, rules).length > 0) return date;
    date.setDate(date.getDate() - 1);
  }
  return null;
};

// Ate 5 dias com horario a partir de `start` (inclusive), percorrendo no maximo
// `GENERATE_DAYS_MAX_LOOPS` dias. Bater o limite nao e' erro (OLC-1364): a grade parte de
// uma data com horario e so' mostra menos colunas quando a agenda do medico e' rala.
export const generateDays = (start: Date, rules: SlotRules): Date[] => {
  const days: Date[] = [];
  const startOfWeek = start.getDate();
  let daysAdd = 0;
  let loopCount = 0;

  for (
    let i = 0;
    i < 5 && loopCount < GENERATE_DAYS_MAX_LOOPS;
    daysAdd++, loopCount++
  ) {
    const day = new Date(start);
    day.setDate(startOfWeek + daysAdd);

    if (getSlots(day, rules).length === 0) {
      continue; // Skip days with no slots
    }

    days.push(day);
    i++;
  }

  return days;
};
