import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import React, { useCallback, useMemo } from "react";
import { Appointments, Procedure, WorkingHours } from "../../types";

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
  const offset = new Date().getTimezoneOffset();
  const workingDaysMap = useMemo(
    () =>
      workingHours.reduce((acc: { [key: number]: WorkingHours }, curr) => {
        acc[curr.weekday] = curr;
        return acc;
      }, {}),
    [workingHours]
  );

  const getSlots = useCallback(
    (day: Date) => {
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
        if (moving < new Date()) continue;
        if (
          !appointments.some((appointment) => {
            const appointmentStart = new Date(appointment.start);
            const appointmentEnd = new Date(appointment.end);
            // console.log(
            //   "comparison",
            //   appointmentStart.toISOString(),
            //   " | ",
            //   moving.toISOString(),
            //   " | ",
            //   appointmentEnd.toISOString()
            // );
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
    },
    [appointments, procedure, workingDaysMap, maxSlotsPerDay]
  );

  const findFirstAvailableDate = (date: Date) => {
    const maxDate = new Date(date.getFullYear(), date.getMonth() + 3, 0);
    while (date <= maxDate) {
      const slots = getSlots(date);

      if (slots.length > 0) {
        setCurrentDate(date);
        return date;
      }
      date.setDate(date.getDate() + 1);
    }
    return null;
  };

  const findPreviousAvailableDate = (date: Date) => {
    const minDate = new Date(date.getFullYear(), date.getMonth() - 3, 1);
    while (date >= minDate) {
      const slots = getSlots(date);

      if (slots.length > 0) {
        setCurrentDate(date);
        return date;
      }
      date.setDate(date.getDate() - 1);
    }
    return null;
  };

  const generateDays = (currentDate: Date) => {
    const days: Date[] = [];
    const startOfWeek = currentDate.getDate();
    let daysAdd = 0;
    let loopCount = 0;
    const maxLoops = 50; // Safety limit to prevent infinite loops

    for (let i = 0; i < 5 && loopCount < maxLoops; daysAdd++, loopCount++) {
      const day = new Date(currentDate);
      day.setDate(startOfWeek + daysAdd);

      const daySlots = getSlots(new Date(day)); // Create a copy to avoid mutation

      if (daySlots.length === 0) {
        continue; // Skip days with no slots
      }

      days.push(day);
      i++;
    }

    if (loopCount >= maxLoops) {
      console.warn("🚨 DEBUG: generateDays hit maximum loop limit!");
    }

    return days;
  };

  if (!procedure) return null;

  const subtractDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

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
              findPreviousAvailableDate(newDate);
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
          {generateDays(currentDate).map((day, index) => (
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
                {getSlots(day).map((slot, slotIndex) => (
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

              findFirstAvailableDate(newDate);
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
