import { act, fireEvent, render, screen } from "@testing-library/react";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { OneTimeTokenResponse } from "./types";
import { expedient, NOW, procedure } from "./components/Scheduler/testFixtures";

const TOKEN: OneTimeTokenResponse = {
  access_token: "token",
  procedures: [{ ...procedure, health_operators: [{ id: "1", name: "Particular" }] }],
  appointments: [],
  working_hours: [1, 2, 3, 4, 5].map((weekday) => expedient(weekday)),
  max_slots_per_day: null,
};

// Cabecalho da coluna do dia, p.ex. "quarta-feira, 30 de set.".
const column = (day: RegExp) => screen.queryByText(day);

const clickArrowRight = () =>
  fireEvent.click(screen.getByTestId("KeyboardArrowRightIcon").closest("button")!);

// Da tela inicial ate a agenda: "Avancar" (a etapa 1 nao valida ao avancar) e escolher o
// procedimento.
const openScheduler = async () => {
  render(<App />);
  // Espera o `one-time-token` (chamado no mount).
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
  fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
  fireEvent.click(await screen.findByRole("option", { name: procedure.name }));
};

describe("App + Scheduler (OLC-1364)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.spyOn(axios, "post").mockResolvedValue({ data: TOKEN });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("escolher um horario mantem a agenda onde o paciente navegou", async () => {
    await openScheduler();
    // Sexta 25/09 10:00: a 1a data livre e' segunda 28/09.
    expect(column(/28 de set/)).toBeInTheDocument();

    clickArrowRight();
    clickArrowRight();
    expect(column(/30 de set/)).toBeInTheDocument();
    expect(column(/28 de set/)).not.toBeInTheDocument();

    // Escolher o horario atualiza o `App` (`selectedSlot`). Antes, isso recriava o
    // `Scheduler` e a agenda voltava para a 1a data livre.
    fireEvent.click(screen.getAllByRole("button", { name: "08:00" })[0]);

    expect(column(/30 de set/)).toBeInTheDocument();
    expect(column(/28 de set/)).not.toBeInTheDocument();
  });
});
