import { describe, expect, it } from "vitest";
import {
  ageOn,
  ageRangeMessage,
  isOutOfRangeForWholeWindow,
  isPersonalDataRejection,
  isWithinAgeRange,
  parseBirthDate,
} from "./age";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("faixa etaria (OLC-1028)", () => {
  it("le a data do input e recusa datas inexistentes", () => {
    expect(parseBirthDate("2014-10-20")).toEqual(d(2014, 10, 20));
    expect(parseBirthDate("2014-02-31")).toBeNull();
    expect(parseBirthDate("20/10/2014")).toBeNull();
    expect(parseBirthDate("")).toBeNull();
  });

  it("idade em anos completos na data (vespera e dia do aniversario)", () => {
    const birth = d(2014, 10, 20);
    expect(ageOn(birth, d(2026, 10, 19))).toBe(11);
    expect(ageOn(birth, d(2026, 10, 20))).toBe(12);
  });

  it("29/02 completa ano em 28/02, como o backend", () => {
    const birth = d(2008, 2, 29);
    expect(ageOn(birth, d(2026, 2, 27))).toBe(17);
    expect(ageOn(birth, d(2026, 2, 28))).toBe(18);
  });

  it("limites inclusivos e lado nulo sem limite", () => {
    expect(isWithinAgeRange(12, { min: 12, max: 60 })).toBe(true);
    expect(isWithinAgeRange(60, { min: 12, max: 60 })).toBe(true);
    expect(isWithinAgeRange(11, { min: 12, max: 60 })).toBe(false);
    expect(isWithinAgeRange(61, { min: 12, max: 60 })).toBe(false);
    expect(isWithinAgeRange(99, { min: 12, max: null })).toBe(true);
    expect(isWithinAgeRange(13, { min: null, max: 12 })).toBe(false);
  });

  it("mensagem igual a do backend", () => {
    const suffix = " Para este caso, entre em contato com a clínica.";
    expect(ageRangeMessage({ min: 12, max: 60 })).toBe(
      "Este profissional atende pacientes de 12 a 60 anos." + suffix
    );
    expect(ageRangeMessage({ min: 18, max: null })).toBe(
      "Este profissional atende pacientes a partir de 18 anos." + suffix
    );
    expect(ageRangeMessage({ min: null, max: 12 })).toBe(
      "Este profissional atende pacientes até 12 anos." + suffix
    );
    expect(ageRangeMessage({ min: 5, max: 5 })).toBe(
      "Este profissional atende pacientes com 5 anos." + suffix
    );
  });

  it("na etapa de dados pessoais so' recusa quem nao cabe em nenhum dia da agenda", () => {
    const today = d(2026, 10, 8);
    // Ja passou da maxima hoje: recusa.
    expect(isOutOfRangeForWholeWindow(d(2010, 1, 1), { min: null, max: 12 }, today)).toBe(true);
    // Faz 12 daqui a 30 dias: pode agendar para depois do aniversario.
    expect(isOutOfRangeForWholeWindow(d(2014, 11, 7), { min: 12, max: null }, today)).toBe(false);
    // Faz 12 so' daqui a 90 dias: nenhum dia da agenda serve.
    expect(isOutOfRangeForWholeWindow(d(2015, 1, 6), { min: 12, max: null }, today)).toBe(true);
    expect(isOutOfRangeForWholeWindow(d(1990, 1, 1), { min: null, max: null }, today)).toBe(false);
  });

  it("reconhece as recusas do backend ligadas aos dados pessoais", () => {
    expect(isPersonalDataRejection({ message: "Data de nascimento inválida.", field: "birth_date" })).toBe(true);
    expect(isPersonalDataRejection({ message: ageRangeMessage({ min: 12, max: null }) })).toBe(true);
    expect(isPersonalDataRejection({ message: "Este horário não está mais disponível" })).toBe(false);
    expect(isPersonalDataRejection(undefined)).toBe(false);
  });
});
