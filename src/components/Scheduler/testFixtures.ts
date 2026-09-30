import { Appointments, Procedure, WorkingHours } from "../../types";

// OLC-1364: dados compartilhados pelos testes do `Scheduler`.

// Rodam com TZ=America/Sao_Paulo (script `test`). As datas levam 12:00 porque a tela
// trabalha com a hora corrente em `currentDate`, nunca com meia-noite.
export const at = (y: number, m: number, d: number, h = 12, mi = 0) =>
  new Date(y, m - 1, d, h, mi);

export const hhmm = (dates: Date[]) =>
  dates.map((date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

export const ymd = (dates: Date[]) =>
  dates.map(
    (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`
  );

export const procedure: Procedure = {
  id: "1",
  name: "Consulta",
  time: 30,
  price: 100,
  health_operators: [],
};

// `weekday` segue o `Date.getDay()` (0 = domingo), que e' como o `getSlots` o le.
export const MONDAY = 1;
export const expedient = (weekday: number, start = "08:00:00", end = "10:00:00"): WorkingHours => ({
  weekday,
  start,
  end,
});

export const busyDay = (date: string): Appointments => ({
  start: `${date}T00:00:00`,
  end: `${date}T23:59:59`,
});

// Sexta, 25/09/2026, 10:00 -- dia em que o problema foi observado.
export const NOW = at(2026, 9, 25, 10);

// Semanalmente, de `first` a `last` (inclusive), o dia inteiro ocupado.
export const busyWeekly = (first: Date, last: Date): Appointments[] => {
  const result: Appointments[] = [];
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 7))
    result.push(busyDay(ymd([d])[0]));
  return result;
};

