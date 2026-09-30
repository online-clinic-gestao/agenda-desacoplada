import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointments, Procedure, WorkingHours } from "../../types";
import Scheduler from "./Scheduler";
import { generateDays, buildWorkingDaysMap } from "./schedule";
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

const WEEKDAYS = [1, 2, 3, 4, 5].map((weekday) => expedient(weekday));
// Medico so' de segunda, com as segundas cheias ate 09/11: a 1a data livre (16/11) fica a
// 52 dias de NOW -- o caso observado na Concon.
const CONCON_APPOINTMENTS = busyWeekly(at(2026, 9, 28), at(2026, 11, 9));

type Props = {
  workingHours: WorkingHours[];
  appointments?: Appointments[];
  procedure?: Procedure;
  maxSlotsPerDay?: number | null;
};

const renderScheduler = (props: Props) => {
  const onSelect = vi.fn();
  const element = (p: Props) => (
    <Scheduler
      onSelect={onSelect}
      workingHours={p.workingHours}
      appointments={p.appointments ?? []}
      procedure={"procedure" in p ? p.procedure : procedure}
      maxSlotsPerDay={p.maxSlotsPerDay}
    />
  );
  const result = render(element(props));

  // Os horarios oferecidos, na ordem da tela (coluna a coluna). Clica em cada um e le a
  // data que chega no `onSelect` -- e' o que o paciente de fato escolhe.
  const offeredSlots = (): Date[] => {
    onSelect.mockClear();
    screen
      .queryAllByRole("button", { name: /^\d{2}:\d{2}$/ })
      .forEach((button) => fireEvent.click(button));
    return onSelect.mock.calls.map(([date]) => date as Date);
  };
  const offeredDays = () => [...new Set(ymd(offeredSlots()))];

  return {
    ...result,
    rerender: (next: Props) => result.rerender(element(next)),
    offeredSlots,
    offeredDays,
  };
};

const clickArrow = (direction: "Left" | "Right") =>
  fireEvent.click(
    screen.getByTestId(`KeyboardArrow${direction}Icon`).closest("button")!
  );

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nao renderiza nada enquanto o procedimento nao foi escolhido", () => {
    const { container } = renderScheduler({
      workingHours: WEEKDAYS,
      procedure: undefined,
    });

    expect(container).toBeEmptyDOMElement();
  });

  describe("abertura (OLC-1364)", () => {
    it("CA1: 1a data livre a mais de 50 dias -> ja abre nela, sem clicar na seta", () => {
      const { offeredDays } = renderScheduler({
        workingHours: [expedient(MONDAY)],
        appointments: CONCON_APPOINTMENTS,
      });

      // So' as segundas ate hoje + 60 dias (24/11): dali em diante a tela nao sabe o que
      // esta ocupado.
      expect(offeredDays()).toEqual(["2026-11-16", "2026-11-23"]);
    });

    it("CA3: medico com horario nos proximos dias -> mesma grade de antes", () => {
      const { offeredSlots } = renderScheduler({ workingHours: WEEKDAYS });

      // "Antes" = a grade montada a partir de hoje, como a tela fazia.
      const before = generateDays(NOW, {
        workingDaysMap: buildWorkingDaysMap(WEEKDAYS),
        appointments: [],
        procedure,
      });
      expect(ymd(before)).toEqual([
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
      ]);

      const slots = offeredSlots();
      expect([...new Set(ymd(slots))]).toEqual(ymd(before));
      expect(slots).toHaveLength(5 * 4);
      expect(hhmm(slots.slice(0, 4))).toEqual(["08:00", "08:30", "09:00", "09:30"]);
    });

    it("CA4: com limite por dia, a abertura distante mostra so' os N primeiros livres", () => {
      const { offeredSlots } = renderScheduler({
        workingHours: [expedient(MONDAY)],
        appointments: [
          ...CONCON_APPOINTMENTS,
          // Na 1a data livre, o 1o horario esta ocupado: o corte vem depois dele.
          { start: "2026-11-16T08:00:00", end: "2026-11-16T08:30:00" },
        ],
        maxSlotsPerDay: 2,
      });

      const slots = offeredSlots();
      expect(ymd(slots)[0]).toEqual("2026-11-16");
      expect(hhmm(slots.slice(0, 2))).toEqual(["08:30", "09:00"]);
      // 16/11 e 23/11 (a janela de 60 dias acaba em 24/11), 2 horarios em cada.
      expect(slots).toHaveLength(2 * 2);
      for (let i = 2; i < slots.length; i += 2)
        expect(hhmm(slots.slice(i, i + 2))).toEqual(["08:00", "08:30"]);
    });
  });

  describe("sem horario (CA2)", () => {
    const NO_SLOTS = "Nenhum horário disponível";

    it("medico sem expediente -> mensagem, e nao uma grade vazia", () => {
      const { offeredSlots } = renderScheduler({ workingHours: [] });

      expect(screen.getByText(NO_SLOTS)).toBeInTheDocument();
      expect(offeredSlots()).toEqual([]);
      // As setas continuam na tela.
      expect(screen.getByTestId("KeyboardArrowLeftIcon")).toBeInTheDocument();
      expect(screen.getByTestId("KeyboardArrowRightIcon")).toBeInTheDocument();
    });

    it("tudo ocupado no periodo que a tela alcanca -> mensagem", () => {
      // Segundas cheias ate 30/11; de 25/09 a tela vai ate 24/11 (hoje + 60 dias).
      renderScheduler({
        workingHours: [expedient(MONDAY)],
        appointments: busyWeekly(at(2026, 9, 28), at(2026, 11, 30)),
      });

      expect(screen.getByText(NO_SLOTS)).toBeInTheDocument();
    });

    it("1a data livre alem de hoje + 60 dias -> mensagem, e a seta nao chega nela", () => {
      // Medico so' de quarta, com as quartas cheias ate 18/11: a 1a livre (25/11) fica a 61
      // dias, fora da janela de ocupados do backend. Nada e' ocupado dali em diante, mas a
      // tela nao tem como saber.
      const WEDNESDAY = 3;
      const { offeredSlots } = renderScheduler({
        workingHours: [expedient(WEDNESDAY)],
        appointments: busyWeekly(at(2026, 9, 30), at(2026, 11, 18)),
      });

      expect(screen.getByText(NO_SLOTS)).toBeInTheDocument();

      clickArrow("Right");
      clickArrow("Right");

      expect(screen.getByText(NO_SLOTS)).toBeInTheDocument();
      expect(offeredSlots()).toEqual([]);
    });

    it("1a data livre exatamente em hoje + 60 dias -> abre nela", () => {
      const TUESDAY = 2;
      const { offeredDays } = renderScheduler({
        workingHours: [expedient(TUESDAY)],
        appointments: busyWeekly(at(2026, 9, 29), at(2026, 11, 17)),
      });

      expect(offeredDays()).toEqual(["2026-11-24"]);
    });

    it("clicar nas setas sem horario nao quebra e mantem a mensagem", () => {
      renderScheduler({ workingHours: [] });

      clickArrow("Right");
      clickArrow("Left");

      expect(screen.getByText(NO_SLOTS)).toBeInTheDocument();
    });

    it("com horario, a mensagem nao aparece", () => {
      renderScheduler({
        workingHours: [expedient(MONDAY)],
        appointments: CONCON_APPOINTMENTS,
      });

      expect(screen.queryByText(NO_SLOTS)).not.toBeInTheDocument();
    });
  });

  describe("setas (CA5)", () => {
    it("avancam e voltam a partir da posicao de abertura", () => {
      const { offeredDays } = renderScheduler({ workingHours: WEEKDAYS });

      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-09-29");

      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-09-30");

      clickArrow("Left");
      clickArrow("Left");
      expect(offeredDays()[0]).toEqual("2026-09-28");

      // Nao ha nada antes da 1a data livre: a seta nao sai do lugar.
      clickArrow("Left");
      expect(offeredDays()[0]).toEqual("2026-09-28");
    });

    it("funcionam a partir da abertura distante", () => {
      const { offeredDays } = renderScheduler({
        workingHours: [expedient(MONDAY)],
        appointments: CONCON_APPOINTMENTS,
      });

      clickArrow("Left");
      expect(offeredDays()[0]).toEqual("2026-11-16");

      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-11-23");

      // 30/11 ja passa de hoje + 60 dias: a seta nao sai do lugar.
      clickArrow("Right");
      expect(offeredDays()).toEqual(["2026-11-23"]);
    });
  });

  describe("reposicionamento", () => {
    it("trocar o procedimento volta para a 1a data livre", () => {
      const { offeredDays, rerender } = renderScheduler({ workingHours: WEEKDAYS });
      clickArrow("Right");
      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-09-30");

      rerender({
        workingHours: WEEKDAYS,
        procedure: { ...procedure, id: "2", time: 60 },
      });

      expect(offeredDays()[0]).toEqual("2026-09-28");
    });

    it("mudar so' a duracao do procedimento (mesmo id) tambem volta para a 1a data livre", () => {
      const { offeredDays, rerender } = renderScheduler({ workingHours: WEEKDAYS });
      clickArrow("Right");
      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-09-30");

      rerender({ workingHours: WEEKDAYS, procedure: { ...procedure, time: 60 } });

      expect(offeredDays()[0]).toEqual("2026-09-28");
    });

    it("recarregar a grade (apos tentativa de agendar) mantem a posicao do paciente", () => {
      const { offeredDays, rerender } = renderScheduler({ workingHours: WEEKDAYS });
      clickArrow("Right");
      clickArrow("Right");

      // A recarga traz objetos novos, com o mesmo procedimento e um horario a mais ocupado.
      rerender({
        workingHours: WEEKDAYS.map((w) => ({ ...w })),
        procedure: { ...procedure },
        appointments: [{ start: "2026-09-30T08:00:00", end: "2026-09-30T08:30:00" }],
      });

      expect(offeredDays()[0]).toEqual("2026-09-30");
    });

    it("recarregar a grade e a posicao ficar sem horario -> volta para a 1a data livre", () => {
      const { offeredDays, rerender } = renderScheduler({ workingHours: WEEKDAYS });
      clickArrow("Right");
      expect(offeredDays()[0]).toEqual("2026-09-29");

      // O medico passou a atender so' as segundas, e as segundas ate 16/11 estao cheias:
      // de 29/09, os 50 dias do `generateDays` (ate 17/11) ficam sem nada.
      rerender({
        workingHours: [expedient(MONDAY)],
        appointments: busyWeekly(at(2026, 9, 28), at(2026, 11, 16)),
      });

      expect(offeredDays()[0]).toEqual("2026-11-23");
    });
  });
});
