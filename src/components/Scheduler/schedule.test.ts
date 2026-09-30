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
    // Partindo da 1a data livre, a grade sai normalmente.
    expect(ymd(generateDays(at(2026, 11, 16), rules))).toEqual([
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
      "2026-12-07",
      "2026-12-14",
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

  it("vai ate o ultimo dia do mes + 2, exclusive quando a data tem hora: de 25/09 10:00, ate 29/11", () => {
    // O teto e' 30/11 00:00 e a busca carrega a hora de `from`, entao 30/11 10:00 ja passa
    // dele. Comportamento de antes do OLC-1364, mantido.
    const SUNDAY = 0;
    // 29/11/2026 e' domingo; 30/11/2026, segunda.
    const busySundays = busyWeekly(at(2026, 9, 27), at(2026, 11, 22));
    const sundays = rulesFor([expedient(SUNDAY)], { appointments: busySundays });
    const mondays = rulesFor([expedient(MONDAY)], {
      appointments: busyWeekly(MONDAY_2026_09_28, at(2026, 11, 23)),
    });

    expect(ymd([findNextAvailableDate(NOW, sundays)!])).toEqual(["2026-11-29"]);
    expect(findNextAvailableDate(NOW, mondays)).toBeNull();
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
