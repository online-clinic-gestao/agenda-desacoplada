import { describe, expect, it } from "vitest";
import { WorkingHours } from "../../types";
import {
  buildWorkingDaysMap,
  findNextAvailableDate,
  findPreviousAvailableDate,
  generateDays,
  getSlots,
  SlotRules,
} from "./schedule";
import {
  at,
  busyWeekly,
  expedient,
  hhmm,
  MONDAY,
  NOW,
  procedure,
  ymd,
} from "./testFixtures";

const rulesFor = (
  workingHours: WorkingHours[],
  overrides: Partial<SlotRules> = {}
): SlotRules => ({
  workingDaysMap: buildWorkingDaysMap(workingHours),
  appointments: [],
  procedure,
  maxSlotsPerDay: null,
  now: NOW,
  ...overrides,
});

const MONDAY_2026_09_28 = at(2026, 9, 28);

describe("getSlots", () => {
  it("oferece os horarios do expediente no passo do procedimento", () => {
    const rules = rulesFor([expedient(MONDAY)]);

    expect(hhmm(getSlots(MONDAY_2026_09_28, rules))).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
    ]);
  });

  it("nao oferece horario que conflita com um ocupado", () => {
    const rules = rulesFor([expedient(MONDAY)], {
      appointments: [
        { start: "2026-09-28T08:30:00", end: "2026-09-28T09:00:00" },
        // Comeca no meio do horario das 09:00.
        { start: "2026-09-28T09:15:00", end: "2026-09-28T09:20:00" },
      ],
    });

    expect(hhmm(getSlots(MONDAY_2026_09_28, rules))).toEqual(["08:00", "09:30"]);
  });

  it("nao oferece horario que nao cabe inteiro no expediente", () => {
    const rules = rulesFor([expedient(MONDAY, "08:00:00", "09:45:00")]);

    expect(hhmm(getSlots(MONDAY_2026_09_28, rules))).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("nao oferece horario que ja passou", () => {
    const rules = rulesFor([expedient(MONDAY)], { now: at(2026, 9, 28, 8, 40) });

    expect(hhmm(getSlots(MONDAY_2026_09_28, rules))).toEqual(["09:00", "09:30"]);
  });

  it("com limite por dia, oferece so' os N primeiros horarios LIVRES", () => {
    const rules = rulesFor([expedient(MONDAY)], {
      maxSlotsPerDay: 2,
      appointments: [{ start: "2026-09-28T08:00:00", end: "2026-09-28T08:30:00" }],
    });

    expect(hhmm(getSlots(MONDAY_2026_09_28, rules))).toEqual(["08:30", "09:00"]);
  });

  it.each([null, undefined, 0])("sem limite (%s) oferece a lista inteira", (max) => {
    const rules = rulesFor([expedient(MONDAY)], { maxSlotsPerDay: max });

    expect(getSlots(MONDAY_2026_09_28, rules)).toHaveLength(4);
  });

  it("sem procedimento ou sem expediente no dia, nao oferece nada", () => {
    expect(getSlots(MONDAY_2026_09_28, rulesFor([expedient(MONDAY)], { procedure: undefined })))
      .toEqual([]);
    expect(getSlots(at(2026, 9, 29), rulesFor([expedient(MONDAY)]))).toEqual([]);
  });

  it("oferece ate hoje + 60 dias, e nada depois (janela de ocupados do backend)", () => {
    // De NOW (25/09), hoje + 60 = terca 24/11; quarta 25/11 ja fica fora.
    const TUESDAY = 2;
    const WEDNESDAY = 3;
    const rules = rulesFor([expedient(TUESDAY), expedient(WEDNESDAY)]);

    expect(getSlots(at(2026, 11, 24), rules)).toHaveLength(4);
    // Mesmo com a data carregando uma hora mais tarde que a de NOW.
    expect(getSlots(at(2026, 11, 24, 23, 30), rules)).toHaveLength(4);
    expect(getSlots(at(2026, 11, 25), rules)).toEqual([]);
    expect(getSlots(at(2026, 11, 25, 0, 0), rules)).toEqual([]);
  });
});

describe("generateDays", () => {
  it("medico com horario nos proximos dias: os 5 primeiros dias com horario", () => {
    const rules = rulesFor([1, 2, 3, 4, 5].map((weekday) => expedient(weekday)));

    // Sexta 25/09 as 10:00 ja passou; sabado e domingo sem expediente.
    expect(ymd(generateDays(NOW, rules))).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("aplica o limite por dia em cada dia exibido", () => {
    const rules = rulesFor([expedient(MONDAY)], { maxSlotsPerDay: 1 });

    for (const day of generateDays(NOW, rules))
      expect(hhmm(getSlots(day, rules))).toEqual(["08:00"]);
  });

  it("nao passa de 50 dias procurando: 1a data livre distante fica fora (o bug do OLC-1364)", () => {
    // Medico so' de segunda, com as segundas cheias ate 09/11 -- o caso da Concon.
    const rules = rulesFor([expedient(MONDAY)], {
      appointments: busyWeekly(MONDAY_2026_09_28, at(2026, 11, 9)),
    });

    expect(generateDays(NOW, rules)).toEqual([]);
    // Partindo da 1a data livre, a grade sai -- ate hoje + 60 dias (24/11).
    expect(ymd(generateDays(at(2026, 11, 16), rules))).toEqual([
      "2026-11-16",
      "2026-11-23",
    ]);
  });

  it("nao mostra coluna alem de hoje + 60 dias", () => {
    const rules = rulesFor([1, 2, 3, 4, 5].map((weekday) => expedient(weekday)));

    // De sexta 20/11 caberiam 5 dias uteis; a janela acaba na terca 24/11.
    expect(ymd(generateDays(at(2026, 11, 20), rules))).toEqual([
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
    ]);
  });
});

describe("findNextAvailableDate (seta >)", () => {
  const mondays = () => rulesFor([expedient(MONDAY)]);

  it("acha a proxima data com horario, contando a propria data", () => {
    expect(ymd([findNextAvailableDate(NOW, mondays())!])).toEqual(["2026-09-28"]);
    expect(ymd([findNextAvailableDate(MONDAY_2026_09_28, mondays())!])).toEqual([
      "2026-09-28",
    ]);
  });

  it("alcanca a 1a data livre distante (alem de 50 dias)", () => {
    const rules = rulesFor([expedient(MONDAY)], {
      appointments: busyWeekly(MONDAY_2026_09_28, at(2026, 11, 9)),
    });

    expect(ymd([findNextAvailableDate(NOW, rules)!])).toEqual(["2026-11-16"]);
  });

  it("nao acha data alem de hoje + 60 dias", () => {
    // De NOW (25/09), hoje + 60 = terca 24/11. O teto do mes + 2 (29/11) iria mais longe.
    const TUESDAY = 2;
    const WEDNESDAY = 3;
    const tuesdays = rulesFor([expedient(TUESDAY)], {
      appointments: busyWeekly(at(2026, 9, 29), at(2026, 11, 17)),
    });
    const wednesdays = rulesFor([expedient(WEDNESDAY)], {
      appointments: busyWeekly(at(2026, 9, 30), at(2026, 11, 18)),
    });

    expect(ymd([findNextAvailableDate(NOW, tuesdays)!])).toEqual(["2026-11-24"]);
    // A 1a quarta livre seria 25/11, a 61 dias.
    expect(findNextAvailableDate(NOW, wednesdays)).toBeNull();
  });

  it("vai ate o ultimo dia do mes + 2, exclusive quando a data tem hora: de 31/12 10:00, ate 27/02", () => {
    // O teto e' 28/02 00:00 e a busca carrega a hora de `from`, entao 28/02 10:00 ja passa
    // dele. Comportamento de antes do OLC-1364, mantido. De 31/12 o teto do mes (27/02, a
    // 58 dias) fica aquem dos 60 dias (01/03), entao e' ele que manda.
    const now = at(2026, 12, 31, 10);
    const SUNDAY = 0;
    const SATURDAY = 6;
    // 27/02/2027 e' sabado; 28/02/2027, domingo.
    const saturdays = rulesFor([expedient(SATURDAY)], {
      now,
      appointments: busyWeekly(at(2027, 1, 2), at(2027, 2, 20)),
    });
    const sundays = rulesFor([expedient(SUNDAY)], {
      now,
      appointments: busyWeekly(at(2027, 1, 3), at(2027, 2, 21)),
    });

    expect(ymd([findNextAvailableDate(now, saturdays)!])).toEqual(["2027-02-27"]);
    expect(findNextAvailableDate(now, sundays)).toBeNull();
  });

  it("nao altera a data recebida", () => {
    const from = new Date(NOW);
    findNextAvailableDate(from, mondays());

    expect(from).toEqual(NOW);
  });
});

describe("findPreviousAvailableDate (seta <)", () => {
  const rules = () => rulesFor([expedient(MONDAY)]);

  it("acha a data anterior com horario, contando a propria data", () => {
    expect(ymd([findPreviousAvailableDate(at(2026, 10, 7), rules())!])).toEqual([
      "2026-10-05",
    ]);
    expect(ymd([findPreviousAvailableDate(at(2026, 10, 5), rules())!])).toEqual([
      "2026-10-05",
    ]);
  });

  it("antes da 1a data com horario, nao acha nada", () => {
    // Segunda 21/09 ja passou em relacao a NOW.
    expect(findPreviousAvailableDate(at(2026, 9, 27), rules())).toBeNull();
  });

  it("nao altera a data recebida", () => {
    const from = at(2026, 10, 7);
    findPreviousAvailableDate(from, rules());

    expect(from).toEqual(at(2026, 10, 7));
  });
});
