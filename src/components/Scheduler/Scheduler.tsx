import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Appointments, Procedure, WorkingHours } from "../../types";
import {
  buildWorkingDaysMap,
  findNextAvailableDate,
  findPreviousAvailableDate,
  generateDays,
  getSlots,
  SlotRules,
} from "./schedule";

type SchedulerProps = {
  onSelect: (date: Date) => void;
  workingHours: WorkingHours[];
  appointments: Appointments[];
  procedure: Procedure | undefined;
  selectedSlot?: Date | null;
  // OLC-1070: quantos horarios oferecer por dia. `undefined`/`null`/<=0 = sem limite, que
  // e' o caso de toda clinica que nao configurou o recurso.
  maxSlotsPerDay?: number | null;
};

const Scheduler: React.FC<SchedulerProps> = ({
  onSelect,
  workingHours,
  appointments,
  procedure,
  selectedSlot,
  maxSlotsPerDay,
}) => {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const workingDaysMap = useMemo(
    () => buildWorkingDaysMap(workingHours),
    [workingHours]
  );
  const rules: SlotRules = useMemo(
    () => ({ workingDaysMap, appointments, procedure, maxSlotsPerDay }),
    [workingDaysMap, appointments, procedure, maxSlotsPerDay]
  );

  // OLC-1364: a grade abre na PRIMEIRA data com horario livre, com a mesma busca (e o
  // mesmo alcance) da seta ">". Antes ela abria em hoje e o `generateDays` so' olhava 50
  // dias: medico com a 1a data livre mais longe abria com a agenda vazia.
  //
  // Reposiciona quando o procedimento muda (a duracao muda os horarios) ou quando a
  // posicao atual ficou sem horario. A grade e' recarregada apos cada tentativa de
  // agendar (`App.loadOneTimeToken`) -- ai a posicao do paciente e' mantida, se ainda
  // tiver horario. O procedimento e' comparado por id e duracao porque a recarga troca os
  // objetos da lista.
  //
  // `useLayoutEffect` para reposicionar antes da pintura: com `useEffect` a tela piscaria
  // "Nenhum horario disponivel" (grade de hoje, vazia) antes de pular para a data livre.
  const procedureKey = procedure ? `${procedure.id}:${procedure.time}` : null;
  const positionedFor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!procedureKey) return;
    const procedureChanged = positionedFor.current !== procedureKey;
    positionedFor.current = procedureKey;
    setCurrentDate((current) => {
      if (!procedureChanged && generateDays(current, rules).length > 0)
        return current;
      return findNextAvailableDate(new Date(), rules) ?? current;
    });
  }, [procedureKey, rules]);

  if (!procedure) return null;

  const subtractDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  const days = generateDays(currentDate, rules);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "row",
        }}
      >
        <Box>
          <Button
            onClick={() => {
              const newDate = subtractDays(currentDate, 1);
              const found = findPreviousAvailableDate(newDate, rules);
              if (found) setCurrentDate(found);
            }}
          >
            <KeyboardArrowLeft />
          </Button>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          {/* OLC-1364: sem horario no alcance, avisa em vez de deixar a area vazia e muda. */}
          {days.length === 0 && (
            <Typography sx={{ p: 2, alignSelf: "center" }}>
              Nenhum horário disponível
            </Typography>
          )}
          {days.map((day, index) => (
            <Box
              key={index}
              sx={{
                width: "100%",
                textAlign: "center",
                padding: 1,
                border: "1px solid #ccc",
                minWidth: "100px",
              }}
            >
              <Box>
                {
                  day
                    .toLocaleDateString("pt-BR", {
                      weekday: "long",
                      month: "short",
                      day: "2-digit",
                    })
                    .split(",")[0]
                }
                <br />
                {
                  day
                    .toLocaleDateString("pt-BR", {
                      weekday: "long",
                      month: "short",
                      day: "2-digit",
                    })
                    .split(",")[1]
                }
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {getSlots(day, rules).map((slot, slotIndex) => (
                  <Button
                    key={slotIndex}
                    sx={{
                      padding: 0.5,
                      my: 1,
                      background:
                        selectedSlot?.getTime() === slot.getTime()
                          ? "#00327f"
                          : "#fff",
                    }}
                    variant="outlined"
                    onClick={() => {
                      const date = new Date(slot);
                      onSelect(date);
                    }}
                  >
                    {slot.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Box>
          <Button
            onClick={() => {
              const newDate = subtractDays(currentDate, -1);
              const found = findNextAvailableDate(newDate, rules);
              if (found) setCurrentDate(found);
            }}
          >
            <KeyboardArrowRight />
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Scheduler;
