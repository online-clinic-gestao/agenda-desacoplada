import { act, fireEvent, render, screen } from "@testing-library/react";
import axios from "axios";
import Swal, { SweetAlertResult } from "sweetalert2";
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

describe("App: faixa etaria (OLC-1028)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const startWith = async (token: OneTimeTokenResponse, birthDate: string) => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: token });
    render(<App />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("Data de nascimento"), {
      target: { value: birthDate },
    });
    fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
  };

  it("pede a data de nascimento em toda clinica", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: TOKEN });
    render(<App />);
    await act(async () => {});

    expect(screen.getByLabelText("Data de nascimento")).toHaveAttribute("type", "date");
  });

  it("quem nao cabe na faixa em nenhum dia da agenda para nos dados pessoais", async () => {
    // O SweetAlert2 precisa de `matchMedia`, que o jsdom nao tem: confere a chamada.
    const fire = vi
      .spyOn(Swal, "fire")
      .mockResolvedValue({ isConfirmed: true } as SweetAlertResult);

    await startWith({ ...TOKEN, min_age: null, max_age: 12 }, "2000-01-01");

    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Este profissional atende pacientes até 12 anos. Para este caso, entre em contato com a clínica.",
      })
    );
    expect(screen.getByLabelText("Data de nascimento")).toBeInTheDocument();
  });

  it("sem faixa configurada qualquer idade segue para o agendamento", async () => {
    const fire = vi.spyOn(Swal, "fire");

    await startWith(TOKEN, "1940-01-01");

    expect(fire).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Data de nascimento")).not.toBeInTheDocument();
  });
});
